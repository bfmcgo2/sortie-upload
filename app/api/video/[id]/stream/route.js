import { NextResponse } from 'next/server';
import { getR2SignedUrl } from '../../../../../lib/cloudflare-r2';
import { verifyVideoOwnership } from '../../../../../lib/auth-helpers';
import { supabaseAdmin } from '../../../../../lib/supabase';

/**
 * GET /api/video/[id]/stream - Get a signed URL for video streaming
 * Requires: user authentication and ownership verification (or public video)
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    
    // Get user from query params (optional for public videos)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    // Fetch the video
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check ownership if user is provided, or allow if video is public
    if (userId && userEmail) {
      const ownershipCheck = await verifyVideoOwnership(id, userId, userEmail);
      if (!ownershipCheck.authorized && !video.is_public) {
        return NextResponse.json(
          { error: 'Unauthorized: You do not own this video' },
          { status: 403 }
        );
      }
    } else if (!video.is_public) {
      return NextResponse.json(
        { error: 'Authentication required for private videos' },
        { status: 401 }
      );
    }

    // Extract the file key from the stored URL
    // URL format: https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/sortie-videos/userId/timestamp.ext
    // Or: https://pub-XXXXX.r2.dev/BUCKET_NAME/userId/timestamp.ext
    let fileName;
    try {
      const urlObj = new URL(video.video_url);
      const pathParts = urlObj.pathname.split('/').filter(p => p); // Remove empty strings
      // Path is like: ['sortie-videos', 'userId', 'timestamp.ext']
      // We want: 'userId/timestamp.ext' (skip bucket name)
      if (pathParts.length >= 2) {
        fileName = pathParts.slice(1).join('/'); // Skip bucket name, get rest
      } else {
        // Fallback: try to extract from original format
        const urlParts = video.video_url.split('/');
        fileName = urlParts.slice(-2).join('/');
      }
    } catch (error) {
      // Fallback parsing
      const urlParts = video.video_url.split('/');
      fileName = urlParts.slice(-2).join('/');
    }
    
    console.log('Extracted fileName from URL:', fileName, 'from:', video.video_url);
    
    // Generate a signed URL that will work with CORS
    const signedUrl = await getR2SignedUrl(fileName, 3600); // 1 hour expiration

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


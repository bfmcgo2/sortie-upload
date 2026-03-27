import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { verifyVideoOwnership } from '../../../../../lib/auth-helpers';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { BUCKET_NAME } from '../../../../../lib/cloudflare-r2';

// Cloudflare R2 configuration
const R2_CONFIG = {
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
};

const r2Client = new S3Client(R2_CONFIG);

/**
 * GET /api/video/[id]/proxy - Proxy video stream with CORS headers
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
    let fileName;
    try {
      const urlObj = new URL(video.video_url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
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

    // Handle Range requests for video seeking
    const rangeHeader = req.headers.get('range');
    
    // Get the video file from R2
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ...(rangeHeader && {
        Range: rangeHeader, // Pass Range header to R2
      }),
    });

    const response = await r2Client.send(command);
    
    // Get the video stream
    const videoStream = response.Body;
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of videoStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Get content length (from response or buffer)
    const contentLength = response.ContentLength || buffer.length;
    const contentRange = response.ContentRange;

    // Build response headers
    const headers = {
      'Content-Type': video.video_file_type || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*', // Allow CORS
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Cache-Control': 'public, max-age=3600',
    };

    // Handle Range request
    if (rangeHeader && contentRange) {
      headers['Content-Range'] = contentRange;
      headers['Content-Length'] = buffer.length.toString();
      return new NextResponse(buffer, {
        status: 206, // Partial Content
        headers,
      });
    }

    // Full content response
    headers['Content-Length'] = contentLength.toString();
    return new NextResponse(buffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


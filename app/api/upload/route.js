import { NextResponse } from 'next/server';
import { dbHelpers, supabaseAdmin } from '../../../lib/supabase';
import { uploadToR2, isR2Configured, getR2SignedUrl } from '../../../lib/cloudflare-r2';

// Ensure this route runs on Node.js (not Edge) to allow large multipart uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const user = JSON.parse(formData.get('user'));
    const videoData = JSON.parse(formData.get('videoData'));
    const locations = JSON.parse(formData.get('locations'));
    const videoFile = formData.get('videoFile');
    const isPublic = formData.get('isPublic') === 'true';

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (!videoData || !locations || !videoFile) {
      return NextResponse.json({ error: 'Video file, data and locations required' }, { status: 400 });
    }

    // Check if Cloudflare R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 not configured. Please add environment variables.' 
      }, { status: 500 });
    }

    // Convert file to buffer for R2 upload
    const fileBuffer = Buffer.from(await videoFile.arrayBuffer());
    const fileExt = videoFile.name.split('.').pop().toLowerCase();
    // Convert .mov to .mp4 for better browser compatibility
    const normalizedExt = fileExt === 'mov' ? 'mp4' : fileExt;
    const fileName = `${user.id}/${Date.now()}.${normalizedExt}`;
    
    console.log('=== CLOUDFLARE R2 UPLOAD DEBUG ===');
    console.log('Original file size:', videoFile.size, 'bytes');
    console.log('File name:', fileName);
    console.log('File type:', videoFile.type);
    
    // Upload to Cloudflare R2 (no file size limits!)
    const uploadResult = await uploadToR2(fileBuffer, fileName, videoFile.type);
    
    if (!uploadResult.success) {
      return NextResponse.json({ error: 'Failed to upload video file to Cloudflare R2' }, { status: 500 });
    }

    // Generate a signed URL for accessing the video (valid for 7 days)
    const signedUrl = await getR2SignedUrl(fileName, 7 * 24 * 3600); // 7 days
    const videoUrl = signedUrl;

    // Prepare video record for database
    const videoRecord = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      title: videoData.title || `${user.name}'s Video`,
      description: videoData.description || null,
      video_filename: videoFile.name,
      video_file_type: videoFile.type,
      video_file_size: videoFile.size,
      video_url: videoUrl,
      general_locations: videoData.generalLocations || [],
      transcript: videoData.transcript || null,
      processing_status: 'completed',
      is_public: isPublic
    };

    // Upload video record to database
    const uploadedVideo = await dbHelpers.uploadVideoData(videoRecord);

    // Upload locations for this video
    const uploadedLocations = await dbHelpers.uploadLocations(uploadedVideo.id, locations);

    return NextResponse.json({
      success: true,
      video: uploadedVideo,
      locations: uploadedLocations,
      message: 'Video data uploaded successfully',
      videoUrl: `/video/${uploadedVideo.id}` // Link to video player page
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video data', details: error.message },
      { status: 500 }
    );
  }
}

// Get user's videos
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    if (isPublic) {
      // Get public videos for mobile app
      const videos = await dbHelpers.getPublicVideos();
      return NextResponse.json({ videos });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user's videos
    const videos = await dbHelpers.getUserVideos(userId);
    return NextResponse.json({ videos });

  } catch (error) {
    console.error('Get videos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: error.message },
      { status: 500 }
    );
  }
}

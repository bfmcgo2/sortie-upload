import { NextResponse } from 'next/server';
import { dbHelpers, supabaseAdmin } from '../../../lib/supabase';

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

    // Check file size and compress if needed
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for Supabase free tier
    let fileToUpload = videoFile;
    let fileName = `${user.id}/${Date.now()}.${videoFile.name.split('.').pop()}`;
    
    console.log('=== VIDEO UPLOAD DEBUG ===');
    console.log('Original file size:', videoFile.size, 'bytes');
    console.log('File size limit:', MAX_FILE_SIZE, 'bytes');
    
    if (videoFile.size > MAX_FILE_SIZE) {
      console.log('File too large, compressing...');
      
      // For now, we'll skip upload and just store metadata
      // In production, you'd want to compress the video
      return NextResponse.json({ 
        error: `Video file too large (${Math.round(videoFile.size/1024/1024)}MB). Please compress to under 50MB or upgrade to Supabase Pro.` 
      }, { status: 413 });
    }
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video file' }, { status: 500 });
    }

    // Get public URL for the uploaded video
    const { data: urlData } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(fileName);

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
      video_url: urlData.publicUrl,
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
      message: 'Video data uploaded successfully'
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

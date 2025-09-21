import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../lib/supabase';

export async function POST(req) {
  try {
    const { 
      user, 
      videoData, 
      locations, 
      videoUrl,
      isPublic = false 
    } = await req.json();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (!videoData || !locations) {
      return NextResponse.json({ error: 'Video data and locations required' }, { status: 400 });
    }

    // Prepare video record for database
    const videoRecord = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      title: videoData.title || `${user.name}'s Video`,
      description: videoData.description || null,
      video_filename: videoData.filename || null,
      video_file_type: videoData.fileType || null,
      video_file_size: videoData.fileSize || null,
      video_url: videoUrl || null,
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

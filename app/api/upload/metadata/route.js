import { NextResponse } from 'next/server';
import { dbHelpers, validateSupabaseConfig } from '../../../../lib/supabase';
import { BUCKET_NAME } from '../../../../lib/cloudflare-r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    validateSupabaseConfig();
    
    const body = await req.json();
    const { user, videoData, locations, fileKey, fileName, fileSize, fileType, isPublic } = body;

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (!videoData || !locations || !fileKey) {
      return NextResponse.json({ error: 'Video metadata, locations, and fileKey required' }, { status: 400 });
    }

    // Construct the public URL for the uploaded file
    const videoUrl = `https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/${BUCKET_NAME}/${fileKey}`;

    // Prepare video record for database
    const videoRecord = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      title: videoData.title || `${user.name}'s Video`,
      description: videoData.description || null,
      video_filename: fileName || fileKey.split('/').pop(),
      video_file_type: fileType || 'video/mp4',
      video_file_size: fileSize || 0,
      video_url: videoUrl,
      general_locations: videoData.generalLocations || [],
      transcript: videoData.transcript || null,
      processing_status: 'completed',
      is_public: isPublic === true || isPublic === 'true'
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
    console.error('Upload metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video metadata', details: error.message },
      { status: 500 }
    );
  }
}


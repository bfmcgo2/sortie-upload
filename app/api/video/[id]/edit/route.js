import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../../../lib/supabase';
import { verifyVideoOwnership } from '../../../../../lib/auth-helpers';

/**
 * GET /api/video/[id]/edit - Get video data for editing
 * Requires: user authentication and ownership verification
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    
    // Get user from query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // EXPLICIT AUTHORIZATION CHECK
    const ownershipCheck = await verifyVideoOwnership(id, userId, userEmail);
    
    if (!ownershipCheck.authorized) {
      console.error(`Unauthorized video access attempt:`, {
        videoId: id,
        providedUserId: userId,
        providedUserEmail: userEmail,
        videoUserId: ownershipCheck.video?.user_id,
        videoUserEmail: ownershipCheck.video?.user_email,
        error: ownershipCheck.error
      });
      return NextResponse.json(
        { 
          error: ownershipCheck.error || 'Unauthorized: You do not own this video',
          debug: {
            providedUserId: userId,
            providedUserEmail: userEmail,
            videoUserId: ownershipCheck.video?.user_id,
            videoUserEmail: ownershipCheck.video?.user_email
          }
        },
        { status: 403 }
      );
    }

    // Fetch video with locations
    const videoWithLocations = await dbHelpers.getVideoWithLocations(id);

    // Normalize locations to match frontend format
    const normalizedLocations = (videoWithLocations.locations || []).map(loc => ({
      id: loc.id, // Include database ID for updates/deletes
      name: loc.name,
      address: loc.address,
      locationName: loc.location_name,
      coordinates: loc.coordinates,
      placeId: loc.place_id,
      timeStartSec: parseFloat(loc.time_start_sec),
      timeEndSec: loc.time_end_sec ? parseFloat(loc.time_end_sec) : null,
      mention: loc.mention,
      context: loc.context
    }));

    return NextResponse.json({
      video: {
        id: videoWithLocations.id,
        user_id: videoWithLocations.user_id, // Include for client-side verification
        user_email: videoWithLocations.user_email, // Include for client-side verification
        title: videoWithLocations.title,
        description: videoWithLocations.description,
        video_url: videoWithLocations.video_url,
        video_file_type: videoWithLocations.video_file_type,
        video_file_size: videoWithLocations.video_file_size,
        general_locations: videoWithLocations.general_locations || [],
        transcript: videoWithLocations.transcript,
        processing_status: videoWithLocations.processing_status,
        is_public: videoWithLocations.is_public,
        created_at: videoWithLocations.created_at
      },
      locations: normalizedLocations
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { dbHelpers, supabaseAdmin } from '../../../../lib/supabase';
import { verifyVideoOwnership } from '../../../../lib/auth-helpers';

/**
 * GET /api/guides/[id] - Get guide details with locations
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    // Fetch guide
    const guide = await dbHelpers.getGuideById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Check access: owner or public guide (public guides accessible without auth)
    const isOwner = userId && userEmail && guide.user_id === userId && guide.user_email === userEmail;
    if (guide.is_public || isOwner) {
      // Fetch guide with locations
      const guideWithLocations = await dbHelpers.getGuideWithLocations(id);

      // Fetch video URLs for locations
      const videoIds = [...new Set((guideWithLocations.locations || []).map(loc => loc.video_id).filter(Boolean))];
      const videoMap = {};
      
      if (videoIds.length > 0) {
        const { data: videos } = await supabaseAdmin
          .from('videos')
          .select('id, video_url')
          .in('id', videoIds);
        
        if (videos) {
          videos.forEach(video => {
            videoMap[video.id] = video.video_url;
          });
        }
      }

      // Normalize locations to match frontend format
      const normalizedLocations = (guideWithLocations.locations || []).map(loc => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        locationName: loc.location_name,
        coordinates: loc.coordinates,
        placeId: loc.place_id,
        timeStartSec: parseFloat(loc.time_start_sec),
        timeEndSec: loc.time_end_sec ? parseFloat(loc.time_end_sec) : null,
        mention: loc.mention,
        context: loc.context,
        videoId: loc.video_id,
        videoUrl: videoMap[loc.video_id] || null,
        // Remove isCompanyPin - company pins are now stored separately on the guide
      }));

      // Fetch pins for this guide (handle gracefully if table doesn't exist)
      let normalizedPins = [];
      try {
        const pins = await dbHelpers.getGuidePins(id);
        normalizedPins = (pins || []).map(pin => ({
          id: pin.id,
          name: pin.name,
          address: pin.address,
          coordinates: pin.coordinates,
          placeId: pin.place_id,
          description: pin.description,
          pinLinkUrl: pin.pin_link_url,
          pinImageUrl: pin.pin_image_url,
          pinImageFilename: pin.pin_image_filename,
          displayOrder: pin.display_order
        }));
      } catch (error) {
        console.error('Error fetching guide pins (table may not exist):', error);
        // Continue with empty pins array
        normalizedPins = [];
      }

      return NextResponse.json({
        guide: {
          id: guideWithLocations.id,
          name: guideWithLocations.name,
          description: guideWithLocations.description,
          company_id: guideWithLocations.company_id,
          logo_url: guideWithLocations.logo_url,
          coordinates: guideWithLocations.coordinates,
          is_active: guideWithLocations.is_active,
          is_public: guideWithLocations.is_public,
          created_at: guideWithLocations.created_at,
          updated_at: guideWithLocations.updated_at,
          // Company pin fields
          company_pin_name: guideWithLocations.company_pin_name,
          company_pin_address: guideWithLocations.company_pin_address,
          company_pin_coordinates: guideWithLocations.company_pin_coordinates,
          company_pin_place_id: guideWithLocations.company_pin_place_id
        },
        locations: normalizedLocations,
        pins: normalizedPins
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized: You do not have access to this guide' },
      { status: 403 }
    );

  } catch (error) {
    console.error('Get guide error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/guides/[id] - Update guide
 */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user, guideData } = body;

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Fetch existing guide
    const existingGuide = await dbHelpers.getGuideById(id);

    if (!existingGuide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingGuide.user_id !== user.id || existingGuide.user_email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this guide' },
        { status: 403 }
      );
    }

    // Prepare updates
    const updates = {};
    if (guideData.name !== undefined) updates.name = guideData.name;
    if (guideData.description !== undefined) updates.description = guideData.description;
    if (guideData.company_id !== undefined) updates.company_id = guideData.company_id;
    if (guideData.logo_url !== undefined) updates.logo_url = guideData.logo_url;
    if (guideData.coordinates !== undefined) updates.coordinates = guideData.coordinates;
    if (guideData.is_active !== undefined) updates.is_active = guideData.is_active;
    if (guideData.is_public !== undefined) updates.is_public = guideData.is_public;
    // Company pin fields
    if (guideData.company_pin !== undefined) {
      updates.company_pin_name = guideData.company_pin?.name || null;
      updates.company_pin_address = guideData.company_pin?.address || null;
      updates.company_pin_coordinates = guideData.company_pin?.coordinates || null;
      updates.company_pin_place_id = guideData.company_pin?.placeId || null;
    }

    // Update guide
    const updatedGuide = await dbHelpers.updateGuide(id, updates);

    // Update locations if provided
    if (guideData.location_ids !== undefined) {
      await dbHelpers.setGuideLocations(id, guideData.location_ids);
      
      // Recalculate and update coordinates from locations
      const calculatedCoordinates = await dbHelpers.calculateGuideCenter(id);
      if (calculatedCoordinates) {
        await dbHelpers.updateGuide(id, { coordinates: calculatedCoordinates });
      }
    }

    // Fetch updated guide with locations
    const guideWithLocations = await dbHelpers.getGuideWithLocations(id);

    return NextResponse.json({
      success: true,
      guide: guideWithLocations
    });

  } catch (error) {
    console.error('Update guide error:', error);
    return NextResponse.json(
      { error: 'Failed to update guide', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/guides/[id] - Delete guide
 */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Fetch existing guide
    const existingGuide = await dbHelpers.getGuideById(id);

    if (!existingGuide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingGuide.user_id !== userId || existingGuide.user_email !== userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this guide' },
        { status: 403 }
      );
    }

    // Delete guide (cascade will delete guide_locations)
    await dbHelpers.deleteGuide(id);

    return NextResponse.json({
      success: true,
      message: 'Guide deleted successfully'
    });

  } catch (error) {
    console.error('Delete guide error:', error);
    return NextResponse.json(
      { error: 'Failed to delete guide', details: error.message },
      { status: 500 }
    );
  }
}


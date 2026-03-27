import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../../../lib/supabase';
import { verifyVideoOwnership } from '../../../../../lib/auth-helpers';

/**
 * POST /api/guides/[id]/locations - Add locations to a guide
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user, location_ids } = body;

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    if (!location_ids || !Array.isArray(location_ids) || location_ids.length === 0) {
      return NextResponse.json(
        { error: 'Location IDs array is required' },
        { status: 400 }
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

    // Add locations to guide
    const result = await dbHelpers.addLocationsToGuide(id, location_ids);

    // Recalculate and update coordinates from locations
    const calculatedCoordinates = await dbHelpers.calculateGuideCenter(id);
    if (calculatedCoordinates) {
      await dbHelpers.updateGuide(id, { coordinates: calculatedCoordinates });
    }

    // Fetch updated guide with locations
    const guideWithLocations = await dbHelpers.getGuideWithLocations(id);

    return NextResponse.json({
      success: true,
      guide: guideWithLocations,
      added: result.length
    });

  } catch (error) {
    console.error('Add locations to guide error:', error);
    return NextResponse.json(
      { error: 'Failed to add locations to guide', details: error.message },
      { status: 500 }
    );
  }
}


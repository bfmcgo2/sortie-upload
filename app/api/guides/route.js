import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../lib/supabase';
import { verifyVideoOwnership } from '../../../lib/auth-helpers';

/**
 * POST /api/guides - Create a new guide
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { user, guideData } = body;

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    if (!guideData || !guideData.name) {
      return NextResponse.json(
        { error: 'Guide name is required' },
        { status: 400 }
      );
    }

    // Prepare guide record
    const guideRecord = {
      name: guideData.name,
      description: guideData.description || null,
      company_id: guideData.company_id || null,
      logo_url: guideData.logo_url || null,
      coordinates: guideData.coordinates || null,
      user_id: user.id,
      user_email: user.email,
      is_active: guideData.is_active !== undefined ? guideData.is_active : true,
      is_public: guideData.is_public !== undefined ? guideData.is_public : false,
      // Company pin fields
      company_pin_name: guideData.company_pin?.name || null,
      company_pin_address: guideData.company_pin?.address || null,
      company_pin_coordinates: guideData.company_pin?.coordinates || null,
      company_pin_place_id: guideData.company_pin?.placeId || null
    };

    // Create guide
    const guide = await dbHelpers.createGuide(guideRecord);

    // Add locations if provided
    if (guideData.location_ids && guideData.location_ids.length > 0) {
      await dbHelpers.setGuideLocations(guide.id, guideData.location_ids);
      
      // Calculate and update coordinates from locations
      const calculatedCoordinates = await dbHelpers.calculateGuideCenter(guide.id);
      if (calculatedCoordinates) {
        await dbHelpers.updateGuide(guide.id, { coordinates: calculatedCoordinates });
      }
    }

    // Fetch guide with locations
    const guideWithLocations = await dbHelpers.getGuideWithLocations(guide.id);

    return NextResponse.json({
      success: true,
      guide: guideWithLocations
    });

  } catch (error) {
    console.error('Create guide error:', error);
    return NextResponse.json(
      { error: 'Failed to create guide', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/guides - List guides
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    if (isPublic) {
      // Get public guides
      const guides = await dbHelpers.getPublicGuides();
      return NextResponse.json({ guides });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required for private guides' },
        { status: 400 }
      );
    }

    // Get user's guides
    const guides = await dbHelpers.getUserGuides(userId);
    return NextResponse.json({ guides });

  } catch (error) {
    console.error('Get guides error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides', details: error.message },
      { status: 500 }
    );
  }
}


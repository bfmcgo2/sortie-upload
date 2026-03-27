import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../../lib/supabase';

/**
 * GET /api/locations/browse - Browse all locations for guide creation
 * Query params:
 *   - city: Filter by city (from general_locations)
 *   - videoId: Filter by video ID
 *   - search: Search location names
 *   - limit: Number of results (default: 50)
 *   - offset: Pagination offset (default: 0)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    const filters = {
      city: searchParams.get('city') || null,
      videoId: searchParams.get('videoId') || null,
      search: searchParams.get('search') || null,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    // Fetch locations
    const locations = await dbHelpers.browseLocations(filters);

    // Normalize locations to match frontend format
    const normalizedLocations = locations.map(loc => ({
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
      videoTitle: loc.videos?.title || null,
      videoGeneralLocations: loc.videos?.general_locations || [],
      videoUrl: loc.videos?.video_url || null
    }));

    return NextResponse.json({
      locations: normalizedLocations,
      total: normalizedLocations.length,
      page: Math.floor(filters.offset / filters.limit) + 1,
      page_size: filters.limit
    });

  } catch (error) {
    console.error('Browse locations error:', error);
    return NextResponse.json(
      { error: 'Failed to browse locations', details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyLocationOwnership } from '../../../../lib/auth-helpers';

/**
 * PUT /api/locations/[id] - Update a location
 * Requires: user authentication and ownership verification
 */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Extract user info from request
    const { user, locationData } = body;
    
    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    if (!locationData) {
      return NextResponse.json(
        { error: 'Location data is required' },
        { status: 400 }
      );
    }

    // EXPLICIT AUTHORIZATION CHECK
    const ownershipCheck = await verifyLocationOwnership(id, user.id, user.email);
    
    if (!ownershipCheck.authorized) {
      console.error(`Unauthorized location update attempt: user ${user.email} tried to update location ${id}`);
      return NextResponse.json(
        { error: ownershipCheck.error || 'Unauthorized: You do not own this location' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {
      name: locationData.name,
      location_name: locationData.locationName || null,
      coordinates: locationData.coordinates || null,
      place_id: locationData.placeId || null,
      time_start_sec: parseFloat(locationData.timeStartSec),
      time_end_sec: locationData.timeEndSec ? parseFloat(locationData.timeEndSec) : null,
      mention: locationData.mention || null,
      context: locationData.context || null,
      lat: locationData.coordinates?.lat ?? null,
      lng: locationData.coordinates?.lng ?? null
    };

    // Update the location
    const { data: updatedLocation, error } = await supabaseAdmin
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Location update error:', error);
      return NextResponse.json(
        { error: 'Failed to update location', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      location: updatedLocation
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id] - Delete a location
 * Requires: user authentication and ownership verification
 */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    
    // Get user from query params or headers
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
    const ownershipCheck = await verifyLocationOwnership(id, userId, userEmail);
    
    if (!ownershipCheck.authorized) {
      console.error(`Unauthorized location delete attempt: user ${userEmail} tried to delete location ${id}`);
      return NextResponse.json(
        { error: ownershipCheck.error || 'Unauthorized: You do not own this location' },
        { status: 403 }
      );
    }

    // Delete the location
    const { error } = await supabaseAdmin
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Location delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete location', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


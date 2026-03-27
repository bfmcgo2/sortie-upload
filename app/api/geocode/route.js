import { NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

/**
 * POST /api/geocode - Geocode an address to get coordinates
 * Body: { address: "123 Main St, Philadelphia, PA" }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    const client = new Client({});
    const response = await client.geocode({
      params: {
        address: address,
        key: apiKey
      }
    });

    if (!response.data.results || response.data.results.length === 0) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    return NextResponse.json({
      success: true,
      address: result.formatted_address,
      coordinates: {
        lat: location.lat,
        lng: location.lng
      },
      placeId: result.place_id,
      formattedAddress: result.formatted_address
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address', details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Fetch video data from database
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (videoError) {
      console.error('Video fetch error:', videoError);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Fetch locations for this video
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('video_locations')
      .select('*')
      .eq('video_id', id)
      .order('time_start_sec', { ascending: true });

    if (locationsError) {
      console.error('Locations fetch error:', locationsError);
    }

    return NextResponse.json({
      ...video,
      locations: locations || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

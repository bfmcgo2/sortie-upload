import { NextResponse } from 'next/server';
import { supabaseAdmin, validateSupabaseConfig } from '../../../../lib/supabase';
import { getR2SignedUrl } from '../../../../lib/cloudflare-r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    // Validate Supabase config at runtime
    validateSupabaseConfig();
    
    const { id } = await params;

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
      .from('locations')
      .select('*')
      .eq('video_id', id)
      .order('time_start_sec', { ascending: true });

    if (locationsError) {
      console.error('Locations fetch error:', locationsError);
    }

    // Generate a fresh signed URL for the video
    let videoUrl = video.video_url;
    if (video.video_filename) {
      try {
        videoUrl = await getR2SignedUrl(video.video_filename, 3600); // 1 hour expiration
        console.log('✅ Generated fresh signed URL for video:', video.video_filename);
      } catch (error) {
        console.error('❌ Failed to generate signed URL:', error);
        // Fall back to the stored URL if signing fails
      }
    }

    return NextResponse.json({
      ...video,
      video_url: videoUrl,
      locations: locations || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

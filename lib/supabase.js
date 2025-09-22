import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const dbHelpers = {
  // Upload video data to database
  async uploadVideoData(videoData) {
    const { data, error } = await supabase
      .from('videos')
      .insert([videoData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Upload locations data for a video
  async uploadLocations(videoId, locations) {
    const locationsWithVideoId = locations.map(location => ({
      name: location.name,
      address: location.address,
      location_name: location.locationName, // Map camelCase to snake_case
      coordinates: location.coordinates,
      place_id: location.placeId, // Map camelCase to snake_case
      time_start_sec: location.timeStartSec, // Map camelCase to snake_case
      time_end_sec: location.timeEndSec, // Map camelCase to snake_case
      mention: location.mention,
      context: location.context,
      video_id: videoId,
      // Extract lat/lng from coordinates JSONB for spatial indexing
      lat: location.coordinates?.lat || null,
      lng: location.coordinates?.lng || null
    }))

    const { data, error } = await supabase
      .from('locations')
      .insert(locationsWithVideoId)
      .select()
    
    if (error) throw error
    return data
  },

  // Get video with locations
  async getVideoWithLocations(videoId) {
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError) throw videoError

    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('video_id', videoId)
      .order('time_start_sec')

    if (locationsError) throw locationsError

    return {
      ...video,
      locations
    }
  },

  // Get all videos for a user
  async getUserVideos(userId) {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        locations (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get public videos (for mobile app)
  async getPublicVideos(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        locations (*)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data
  },

  // Get videos by general location (e.g., "Philadelphia, PA")
  async getVideosByGeneralLocation(generalLocation) {
    const { data, error } = await supabase.rpc('get_videos_by_general_location', {
      general_loc: generalLocation
    })
    
    if (error) throw error
    return data
  },

  // Get videos within coordinate bounds (for map filtering)
  async getVideosByCoordinates(minLat, maxLat, minLng, maxLng) {
    const { data, error } = await supabase.rpc('get_videos_by_coordinates', {
      min_lat: minLat,
      max_lat: maxLat,
      min_lng: minLng,
      max_lng: maxLng
    })
    
    if (error) throw error
    return data
  },

  // Search videos by location name
  async searchVideosByLocation(searchTerm) {
    const { data, error } = await supabase.rpc('search_videos_by_location', {
      search_term: searchTerm
    })
    
    if (error) throw error
    return data
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client (for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database helper functions
export const dbHelpers = {
  // Upload video data to database
  async uploadVideoData(videoData) {
    const { data, error } = await supabaseAdmin
      .from('videos')
      .insert([videoData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Upload locations data for a video
  async uploadLocations(videoId, locations) {
    const locationsWithVideoId = locations.map(location => ({
      video_id: videoId,
      name: location.name,
      location_name: location.locationName || null,
      coordinates: location.coordinates || null,
      place_id: location.placeId || null,
      time_start_sec: parseFloat(location.timeStartSec),
      time_end_sec: location.timeEndSec ? parseFloat(location.timeEndSec) : null,
      mention: location.mention || null,
      context: location.context || null,
      // Extract lat/lng from coordinates JSONB for spatial indexing
      lat: location.coordinates?.lat ?? null,
      lng: location.coordinates?.lng ?? null
    }))

    const { data, error } = await supabaseAdmin
      .from('locations')
      .insert(locationsWithVideoId)
      .select()
    
    if (error) throw error
    return data
  },

  // Get video with locations
  async getVideoWithLocations(videoId) {
    // Use supabaseAdmin to bypass RLS and get all fields including user_id and user_email
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError) throw videoError

    const { data: locations, error: locationsError } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
  },

  // Guide management functions
  async createGuide(guideData) {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .insert([guideData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getGuideById(guideId) {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .select('*')
      .eq('id', guideId)
      .single()

    if (error) throw error
    return data
  },

  async getGuideWithLocations(guideId) {
    const { data: guide, error: guideError } = await supabaseAdmin
      .from('guides')
      .select('*')
      .eq('id', guideId)
      .single()

    if (guideError) throw guideError

    const { data: guideLocations, error: locationsError } = await supabaseAdmin
      .from('guide_locations')
      .select('location_id, display_order')
      .eq('guide_id', guideId)
      .order('display_order', { ascending: true })

    if (locationsError) throw locationsError

    const locationIds = guideLocations.map(gl => gl.location_id)

    if (locationIds.length === 0) {
      return { ...guide, locations: [] }
    }

    const { data: locations, error: locsError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .in('id', locationIds)

    if (locsError) throw locsError

    // Sort locations by display_order
    const sortedLocations = locationIds.map(id => 
      locations.find(loc => loc.id === id)
    ).filter(Boolean)

    return {
      ...guide,
      locations: sortedLocations
    }
  },

  async getUserGuides(userId) {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPublicGuides() {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateGuide(guideId, updates) {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .update(updates)
      .eq('id', guideId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteGuide(guideId) {
    const { error } = await supabaseAdmin
      .from('guides')
      .delete()
      .eq('id', guideId)

    if (error) throw error
  },

  async addLocationsToGuide(guideId, locationIds) {
    // First, get current display_order max
    const { data: existing } = await supabaseAdmin
      .from('guide_locations')
      .select('display_order')
      .eq('guide_id', guideId)
      .order('display_order', { ascending: false })
      .limit(1)

    let nextOrder = 0
    if (existing && existing.length > 0) {
      nextOrder = (existing[0].display_order || 0) + 1
    }

    const guideLocations = locationIds.map((locationId, index) => ({
      guide_id: guideId,
      location_id: locationId,
      display_order: nextOrder + index
    }))

    const { data, error } = await supabaseAdmin
      .from('guide_locations')
      .insert(guideLocations)
      .select()

    if (error) throw error
    return data
  },

  async removeLocationFromGuide(guideId, locationId) {
    const { error } = await supabaseAdmin
      .from('guide_locations')
      .delete()
      .eq('guide_id', guideId)
      .eq('location_id', locationId)

    if (error) throw error
  },

  async setGuideLocations(guideId, locationIds) {
    // Remove all existing locations
    await supabaseAdmin
      .from('guide_locations')
      .delete()
      .eq('guide_id', guideId)

    // Add new locations
    if (locationIds.length > 0) {
      const guideLocations = locationIds.map((locationId, index) => ({
        guide_id: guideId,
        location_id: locationId,
        display_order: index
      }))

      const { data, error } = await supabaseAdmin
        .from('guide_locations')
        .insert(guideLocations)
        .select()

      if (error) throw error
      return data
    }

    return []
  },

  // Browse all locations for guide creation
  async browseLocations(filters = {}) {
    // First, get public video IDs if filtering by city
    let videoIds = null;
    if (filters.city) {
      const { data: publicVideos } = await supabaseAdmin
        .from('videos')
        .select('id')
        .eq('is_public', true)
        .contains('general_locations', [filters.city]);
      
      if (publicVideos && publicVideos.length > 0) {
        videoIds = publicVideos.map(v => v.id);
      } else {
        // No videos match, return empty
        return [];
      }
    }

    let query = supabaseAdmin
      .from('locations')
      .select(`
        *,
        videos (
          id,
          title,
          general_locations,
          video_url,
          is_public
        )
      `)

    // Only show locations from public videos
    query = query.eq('videos.is_public', true)

    // Apply city filter via video IDs
    if (videoIds) {
      query = query.in('video_id', videoIds)
    }

    if (filters.videoId) {
      query = query.eq('video_id', filters.videoId)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,location_name.ilike.%${filters.search}%`)
    }

    query = query.order('name', { ascending: true })

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    
    // Filter out locations where video data is null (shouldn't happen but safety check)
    return (data || []).filter(loc => loc.videos && loc.videos.is_public)
  },

  // Calculate map center from guide locations
  async calculateGuideCenter(guideId) {
    // Get all locations for this guide
    const { data: guideLocations, error: glError } = await supabaseAdmin
      .from('guide_locations')
      .select('location_id')
      .eq('guide_id', guideId)

    if (glError || !guideLocations || guideLocations.length === 0) {
      return null
    }

    const locationIds = guideLocations.map(gl => gl.location_id)

    // Fetch location coordinates
    const { data: locations, error: locsError } = await supabaseAdmin
      .from('locations')
      .select('coordinates')
      .in('id', locationIds)

    if (locsError || !locations || locations.length === 0) {
      return null
    }

    // Filter out locations without coordinates
    const validLocations = locations.filter(loc => 
      loc.coordinates && 
      typeof loc.coordinates.lat === 'number' && 
      typeof loc.coordinates.lng === 'number'
    )

    if (validLocations.length === 0) {
      return null
    }

    // Calculate center (average of all coordinates)
    const sumLat = validLocations.reduce((sum, loc) => sum + loc.coordinates.lat, 0)
    const sumLng = validLocations.reduce((sum, loc) => sum + loc.coordinates.lng, 0)
    
    return {
      lat: sumLat / validLocations.length,
      lng: sumLng / validLocations.length
    }
  },

  // Guide Pins helpers
  async getGuidePins(guideId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('guide_pins')
        .select('*')
        .eq('guide_id', guideId)
        .order('display_order', { ascending: true })

      if (error) {
        // If table doesn't exist, return empty array instead of crashing
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('guide_pins table does not exist yet. Run the migration in database/guide-pins-schema.sql');
          return []
        }
        throw error
      }
      return data || []
    } catch (error) {
      // Fallback: if anything goes wrong, return empty array
      console.error('Error fetching guide pins:', error);
      return []
    }
  },

  async getGuidePinById(pinId) {
    const { data, error } = await supabaseAdmin
      .from('guide_pins')
      .select('*')
      .eq('id', pinId)
      .single()

    if (error) throw error
    return data
  },

  async createGuidePin(pinData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('guide_pins')
        .insert(pinData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating guide pin:', error);
        throw error
      }
      return data
    } catch (err) {
      console.error('Error in createGuidePin:', err);
      throw err
    }
  },

  async updateGuidePin(pinId, updates) {
    const { data, error } = await supabaseAdmin
      .from('guide_pins')
      .update(updates)
      .eq('id', pinId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteGuidePin(pinId) {
    const { error } = await supabaseAdmin
      .from('guide_pins')
      .delete()
      .eq('id', pinId)

    if (error) throw error
  },

  // Create or update location records for company pins
  async createOrUpdateCompanyPinLocations(userId, userEmail, companyPins, existingLocationIds = []) {
    if (!companyPins || companyPins.length === 0) {
      return []
    }

    // Create a system video for company pins if it doesn't exist
    // This is needed because locations require a video_id
    const systemVideoTitle = `Company Pins - ${userId}`
    let { data: systemVideo } = await supabaseAdmin
      .from('videos')
      .select('id')
      .eq('user_id', userId)
      .eq('title', systemVideoTitle)
      .single()

    if (!systemVideo) {
      // Create system video for company pins
      const { data: newVideo, error: videoError } = await supabaseAdmin
        .from('videos')
        .insert([{
          user_id: userId,
          user_email: userEmail,
          user_name: 'System',
          title: systemVideoTitle,
          description: 'System video for company pins',
          processing_status: 'completed',
          is_public: false
        }])
        .select()
        .single()

      if (videoError) throw videoError
      systemVideo = newVideo
    }

    const resultLocationIds = []

    // Update existing company pins
    for (let i = 0; i < companyPins.length; i++) {
      const pin = companyPins[i]
      
      // Check if this pin has an original location ID (from editing)
      if (pin.originalLocationId && existingLocationIds.includes(pin.originalLocationId)) {
        // Update existing location
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('locations')
          .update({
            name: pin.name,
            location_name: pin.locationName || null,
            coordinates: pin.coordinates || null,
            place_id: pin.placeId || null,
            lat: pin.coordinates?.lat ?? null,
            lng: pin.coordinates?.lng ?? null
          })
          .eq('id', pin.originalLocationId)
          .select('id')
          .single()

        if (updateError) throw updateError
        resultLocationIds.push(updated.id)
      } else {
        // Create new location record
        const { data: created, error: createError } = await supabaseAdmin
          .from('locations')
          .insert([{
            video_id: systemVideo.id,
            name: pin.name,
            location_name: pin.locationName || null,
            coordinates: pin.coordinates || null,
            place_id: pin.placeId || null,
            time_start_sec: 0, // Company pins don't have video timestamps
            time_end_sec: null,
            mention: null,
            context: null,
            lat: pin.coordinates?.lat ?? null,
            lng: pin.coordinates?.lng ?? null
          }])
          .select('id')
          .single()

        if (createError) throw createError
        resultLocationIds.push(created.id)
      }
    }

    return resultLocationIds
  },

  // Create location records for company pins (for new guides)
  async createCompanyPinLocations(userId, userEmail, companyPins) {
    return this.createOrUpdateCompanyPinLocations(userId, userEmail, companyPins, [])
  },

  // Calculate guide center including pins
  async calculateGuideCenter(guideId) {
    // Get all locations
    const guideWithLocations = await this.getGuideWithLocations(guideId)
    const locations = guideWithLocations.locations || []

    // Get all pins (handle gracefully if table doesn't exist)
    let pins = []
    try {
      pins = await this.getGuidePins(guideId)
    } catch (error) {
      console.error('Error fetching pins for center calculation:', error);
      // Continue without pins
    }

    // Combine all coordinates
    const allCoords = []

    // Add location coordinates
    locations.forEach(loc => {
      if (loc.coordinates && typeof loc.coordinates.lat === 'number' && typeof loc.coordinates.lng === 'number') {
        allCoords.push(loc.coordinates)
      }
    })

    // Add pin coordinates
    pins.forEach(pin => {
      if (pin.coordinates && typeof pin.coordinates.lat === 'number' && typeof pin.coordinates.lng === 'number') {
        allCoords.push(pin.coordinates)
      }
    })

    if (allCoords.length === 0) {
      return null
    }

    // Calculate center (average of all coordinates)
    const sumLat = allCoords.reduce((sum, coord) => sum + coord.lat, 0)
    const sumLng = allCoords.reduce((sum, coord) => sum + coord.lng, 0)

    return {
      lat: sumLat / allCoords.length,
      lng: sumLng / allCoords.length
    }
  }
}

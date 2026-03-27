/**
 * Authorization helpers for API routes
 * Verifies user ownership of videos and locations
 */

/**
 * Extract user info from request headers
 * Expects user info to be sent in headers or body
 */
export function getUserFromRequest(req) {
  // Try to get user from request body (for POST/PUT requests)
  // Or from headers (for GET requests)
  // This will be called after parsing the request
  return null; // Will be set by the calling route
}

/**
 * Verify that a user owns a video
 * @param {string} videoId - The video ID to check
 * @param {string} userId - The user ID from authentication
 * @param {string} userEmail - The user email from authentication
 * @returns {Promise<{authorized: boolean, video: object|null, error: string|null}>}
 */
export async function verifyVideoOwnership(videoId, userId, userEmail) {
  const { supabaseAdmin } = await import('./supabase');
  
  if (!videoId || !userId || !userEmail) {
    return {
      authorized: false,
      video: null,
      error: 'Missing required parameters'
    };
  }

  try {
    // Fetch the video
    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      return {
        authorized: false,
        video: null,
        error: 'Video not found'
      };
    }

    // Explicit ownership check with normalization
    // Normalize IDs to strings for comparison (Google IDs can be strings or numbers)
    const normalizedVideoUserId = String(video.user_id).trim();
    const normalizedUserId = String(userId).trim();
    
    // Normalize emails to lowercase for case-insensitive comparison
    const normalizedVideoEmail = (video.user_email || '').toLowerCase().trim();
    const normalizedUserEmail = (userEmail || '').toLowerCase().trim();
    
    const isOwner = normalizedVideoUserId === normalizedUserId && normalizedVideoEmail === normalizedUserEmail;

    // Debug logging for troubleshooting
    if (!isOwner) {
      console.error('Ownership check failed:', {
        video_user_id: video.user_id,
        provided_user_id: userId,
        video_user_email: video.user_email,
        provided_user_email: userEmail,
        normalized_video_user_id: normalizedVideoUserId,
        normalized_user_id: normalizedUserId,
        normalized_video_email: normalizedVideoEmail,
        normalized_user_email: normalizedUserEmail,
        user_id_match: normalizedVideoUserId === normalizedUserId,
        email_match: normalizedVideoEmail === normalizedUserEmail
      });
    }

    if (!isOwner) {
      return {
        authorized: false,
        video: null,
        error: 'Unauthorized: You do not own this video'
      };
    }

    return {
      authorized: true,
      video: video,
      error: null
    };
  } catch (error) {
    console.error('Error verifying video ownership:', error);
    return {
      authorized: false,
      video: null,
      error: 'Internal server error'
    };
  }
}

/**
 * Verify that a location belongs to a video owned by the user
 * @param {string} locationId - The location ID to check
 * @param {string} userId - The user ID from authentication
 * @param {string} userEmail - The user email from authentication
 * @returns {Promise<{authorized: boolean, location: object|null, video: object|null, error: string|null}>}
 */
export async function verifyLocationOwnership(locationId, userId, userEmail) {
  const { supabaseAdmin } = await import('./supabase');
  
  if (!locationId || !userId || !userEmail) {
    return {
      authorized: false,
      location: null,
      video: null,
      error: 'Missing required parameters'
    };
  }

  try {
    // Fetch the location with its video
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('*, videos(*)')
      .eq('id', locationId)
      .single();

    if (locationError || !location) {
      return {
        authorized: false,
        location: null,
        video: null,
        error: 'Location not found'
      };
    }

    // Get the video (it's nested in the response)
    const video = location.videos || (await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', location.video_id)
      .single()).data;

    if (!video) {
      return {
        authorized: false,
        location: null,
        video: null,
        error: 'Video not found for this location'
      };
    }

    // Explicit ownership check
    const isOwner = video.user_id === userId && video.user_email === userEmail;

    if (!isOwner) {
      return {
        authorized: false,
        location: location,
        video: null,
        error: 'Unauthorized: You do not own this video'
      };
    }

    return {
      authorized: true,
      location: location,
      video: video,
      error: null
    };
  } catch (error) {
    console.error('Error verifying location ownership:', error);
    return {
      authorized: false,
      location: null,
      video: null,
      error: 'Internal server error'
    };
  }
}


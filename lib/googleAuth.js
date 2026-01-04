// Google OAuth 2.0 authentication utilities
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Google OAuth scopes - we only need basic profile and email for Gmail users
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

// Get OAuth configuration dynamically to avoid SSR issues
function getOAuthConfig() {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return {
      client_id: GOOGLE_CLIENT_ID,
      response_type: 'code',
      scope: OAUTH_SCOPES,
      redirect_uri: '/auth/callback',
      access_type: 'offline',
      prompt: 'select_account'
    };
  }

  const origin = window.location.origin; // e.g., http://localhost:3000 or https://sortie-upload.vercel.app
  const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.');
  const prodRedirect = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'https://sortie-upload.vercel.app/auth/callback';
  const redirectUri = isLocal ? `${origin}/auth/callback` : prodRedirect;

  return {
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    redirect_uri: redirectUri,
    access_type: 'offline',
    prompt: 'select_account'
  };
}

/**
 * Initiate Google OAuth login in a popup window
 * @returns {Promise<Object>} User profile data
 */
export async function loginWithGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment variables.');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    throw new Error('loginWithGoogle can only be called in the browser');
  }

  return new Promise((resolve, reject) => {
    // Get OAuth configuration for current environment
    const oauthConfig = getOAuthConfig();
    
    // Create OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    Object.keys(oauthConfig).forEach(key => {
      authUrl.searchParams.append(key, oauthConfig[key]);
    });
    
    // Debug logging
    console.log('=== GOOGLE OAUTH DEBUG ===');
    console.log('OAuth Config:', oauthConfig);
    console.log('Final Auth URL:', authUrl.toString());

    // Open popup window
    const popup = window.open(
      authUrl.toString(),
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Handle popup closed manually with better error handling
    // Use a longer interval and wrap in try-catch to handle COOP errors gracefully
    const checkClosed = setInterval(() => {
      try {
        // Check if popup is closed - this may throw COOP errors, which we'll ignore
        if (popup.closed) {
          clearInterval(checkClosed);
          clearTimeout(timeout);
          window.removeEventListener('message', messageListener);
          // Only reject if we haven't received a message yet
          // Give it a moment in case the message is still being processed
          setTimeout(() => {
            reject(new Error('Authentication cancelled'));
          }, 100);
        }
      } catch (error) {
        // COOP errors are expected and can be ignored
        // The popup might still be open, we just can't check it
        // We'll rely on the message listener instead
      }
    }, 2000); // Check less frequently to reduce COOP errors

    // Set a timeout to prevent infinite checking (5 minutes)
    const timeout = setTimeout(() => {
      clearInterval(checkClosed);
      window.removeEventListener('message', messageListener);
      popup.close();
      reject(new Error('Authentication timeout'));
    }, 5 * 60 * 1000);

    // Listen for messages from popup
    const messageListener = (event) => {
      // Log for debugging
      console.log('Received message from popup:', event.origin, event.data);
      
      // Verify origin matches
      if (event.origin !== window.location.origin) {
        console.warn('Message origin mismatch:', event.origin, 'expected:', window.location.origin);
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        window.removeEventListener('message', messageListener);
        try {
          popup.close();
        } catch (e) {
          // Popup might already be closed, ignore
        }
        resolve(event.data.user);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        window.removeEventListener('message', messageListener);
        try {
          popup.close();
        } catch (e) {
          // Popup might already be closed, ignore
        }
        reject(new Error(event.data.error || 'Authentication failed'));
      }
    };

    window.addEventListener('message', messageListener);
  });
}

/**
 * Exchange authorization code for access token and user info
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} User profile data
 */
export async function exchangeCodeForToken(code) {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get user info from Google API using access token
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} User profile data
 */
export async function getUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

/**
 * Logout user by clearing stored tokens
 */
export function logout() {
  // Clear any stored tokens
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_refresh_token');
  localStorage.removeItem('google_user_profile');
  
  // Clear session storage
  sessionStorage.removeItem('google_access_token');
  sessionStorage.removeItem('google_user_profile');
}

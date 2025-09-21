// Google OAuth 2.0 authentication utilities
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Google OAuth scopes - we only need basic profile and email for Gmail users
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

// Get OAuth configuration dynamically to avoid SSR issues
function getOAuthConfig() {
  if (typeof window === 'undefined') {
    // Return a default config for SSR (will be overridden on client)
    return {
      client_id: GOOGLE_CLIENT_ID,
      response_type: 'code',
      scope: OAUTH_SCOPES,
      redirect_uri: '/auth/callback',
      access_type: 'offline',
      prompt: 'select_account'
    };
  }
  
  return {
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    redirect_uri: 'https://sortie-upload.vercel.app/auth/callback',
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
    const checkClosed = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearTimeout(timeout);
          window.removeEventListener('message', messageListener);
          reject(new Error('Authentication cancelled'));
        }
      } catch (error) {
        // Ignore COOP errors - they're just warnings
        if (!error.message.includes('Cross-Origin-Opener-Policy')) {
          console.error('Popup check error:', error);
        }
      }
    }, 1000);

    // Set a timeout to prevent infinite checking (5 minutes)
    const timeout = setTimeout(() => {
      clearInterval(checkClosed);
      window.removeEventListener('message', messageListener);
      popup.close();
      reject(new Error('Authentication timeout'));
    }, 5 * 60 * 1000);

    // Listen for messages from popup
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        window.removeEventListener('message', messageListener);
        popup.close();
        resolve(event.data.user);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        window.removeEventListener('message', messageListener);
        popup.close();
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

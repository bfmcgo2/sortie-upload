"use client";
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { exchangeCodeForToken, getUserInfo } from '../../../lib/googleAuth';

export default function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for access token
        const tokenData = await exchangeCodeForToken(code);
        
        // Get user profile information
        const userProfile = await getUserInfo(tokenData.access_token);
        
        // Store tokens and user data
        localStorage.setItem('google_access_token', tokenData.access_token);
        if (tokenData.refresh_token) {
          localStorage.setItem('google_refresh_token', tokenData.refresh_token);
        }
        localStorage.setItem('google_user_profile', JSON.stringify(userProfile));

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            user: {
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name,
              picture: userProfile.picture,
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token
            }
          }, window.location.origin);
        }

        // Close popup
        window.close();
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error.message
          }, window.location.origin);
        }

        // Close popup
        window.close();
      }
    };

    handleAuth();
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: "'Inter', sans-serif",
      backgroundColor: '#ffc27e'
    }}>
      <div style={{
        textAlign: 'center',
        color: '#18204aff'
      }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '16px'
        }}>
          Completing sign in...
        </div>
        <div style={{
          fontSize: '16px',
          opacity: 0.7
        }}>
          Please wait while we authenticate your account
        </div>
      </div>
    </div>
  );
}

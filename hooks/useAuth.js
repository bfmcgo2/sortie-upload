"use client";
import { useState, useEffect } from 'react';
import { loginWithGoogle, logout as logoutUser } from '../lib/googleAuth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Check if user is already logged in
    const checkAuthStatus = () => {
      try {
        const storedProfile = localStorage.getItem('google_user_profile');
        const accessToken = localStorage.getItem('google_access_token');
        
        if (storedProfile && accessToken) {
          const userProfile = JSON.parse(storedProfile);
          setUser({
            ...userProfile,
            accessToken
          });
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear invalid data
        localStorage.removeItem('google_user_profile');
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_refresh_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      const userData = await loginWithGoogle();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      logoutUser();
    }
    setUser(null);
  };

  return {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };
}

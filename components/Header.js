"use client";
import { useState } from 'react';
import Image from 'next/image';
import styles from './Header.module.css';
import { useAuth } from '../hooks/useAuth';

export default function Header({ showSubmitButton = false }) {
  const { user, login, logout, loading, isAuthenticated } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleSubmitVideo = () => {
    // TODO: Implement submit video functionality
    console.log('Submit Video clicked - functionality to be implemented');
  };

  const handleLogin = async () => {
    try {
      setLoginLoading(true);
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={styles.header}>
      {/* Logo */}
      <div className={styles.logo}>
        sortie
      </div>

      {/* Right Section */}
      <div className={styles.rightSection}>
        {/* Submit Video Button - Only show on map view */}
        {showSubmitButton && (
          <button 
            className={styles.submitButton}
            onClick={handleSubmitVideo}
          >
            Submit Video
          </button>
        )}

        {/* User Info or Login Button */}
        {loading ? (
          <div className={styles.loadingText}>Loading...</div>
        ) : isAuthenticated ? (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <Image 
                src={user.picture} 
                alt={user.name}
                width={32}
                height={32}
                className={styles.userAvatar}
                onError={(e) => {
                  // Fallback to a default avatar or initials
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div 
                className={styles.userAvatarFallback}
                style={{ display: 'none' }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className={styles.userName}>{user.name}</span>
            </div>
            <button 
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            className={styles.loginButton}
            onClick={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? 'Signing in...' : 'Login with Gmail'}
          </button>
        )}
      </div>
    </header>
  );
}

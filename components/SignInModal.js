"use client";
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function SignInModal({ isOpen, onClose, onSubmit }) {
  const { login } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoginLoading(true);
      await login();
      // Close modal and proceed with submit
      onClose();
      onSubmit();
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "'Inter', sans-serif"
      }}
      onClick={(e) => {
        // Close modal if clicking on backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: 40,
          borderRadius: 12,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          position: 'relative',
          textAlign: 'center'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#666',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f5f5f5';
            e.target.style.color = '#333';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#666';
          }}
        >
          ×
        </button>

        {/* Modal content */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 24,
            fontWeight: 600,
            color: '#18204aff',
            margin: '0 0 16px 0'
          }}>
            Sign in now to add your video
          </h2>
          
          <p style={{
            fontSize: 16,
            color: '#666',
            margin: '0 0 32px 0',
            lineHeight: 1.5
          }}>
            Create an account to submit your video and share your travel experiences with the community.
          </p>
        </div>

        {/* Login button */}
        <button 
          onClick={handleLogin}
          disabled={loginLoading}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: loginLoading ? '#ccc' : '#18204aff',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loginLoading ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s ease',
            marginBottom: 16
          }}
          onMouseEnter={(e) => {
            if (!loginLoading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(24, 32, 74, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loginLoading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }
          }}
        >
          {loginLoading ? (
            <span>Signing in...</span>
          ) : (
            <span>🔐 Sign in with Gmail</span>
          )}
        </button>

        {/* Cancel button */}
        <button 
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f8f9fa';
            e.target.style.borderColor = '#999';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = '#ddd';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

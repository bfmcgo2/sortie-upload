"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../../components/Header';
import { useAuth } from '../../../../hooks/useAuth';
import GuideEditor from '../../../../components/GuideEditor';

export default function EditGuidePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (isAuthenticated && user?.id && params.id) {
      fetchGuide();
    }
  }, [isAuthenticated, user, params.id, authLoading, router]);

  const fetchGuide = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/guides/${params.id}?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('Unauthorized: You do not own this guide');
          return;
        }
        if (response.status === 404) {
          setError('Guide not found');
          return;
        }
        throw new Error('Failed to fetch guide');
      }

      const data = await response.json();
      setGuide(data);
    } catch (err) {
      console.error('Error fetching guide:', err);
      setError(err.message || 'Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffc27e',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ fontSize: '18px', color: '#18204aff' }}>
            Loading guide...
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <>
        <Header />
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffc27e',
          padding: '20px',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ color: '#18204aff', margin: '0 0 20px 0' }}>Error</h1>
            <p style={{ color: '#ff4444', margin: '0 0 20px 0' }}>{error}</p>
            <button
              onClick={() => router.push('/guides')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#18204aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              ← Back to Guides
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <GuideEditor 
        user={user} 
        guide={guide}
        onSave={() => router.push('/guides')} 
        onCancel={() => router.push('/guides')} 
      />
    </>
  );
}


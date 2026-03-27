"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useAuth } from '../../hooks/useAuth';

export default function GuidesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (isAuthenticated && user?.id) {
      fetchGuides();
    }
  }, [isAuthenticated, user, authLoading, router]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/guides?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch guides');
      }
      
      const data = await response.json();
      setGuides(data.guides || []);
    } catch (err) {
      console.error('Error fetching guides:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guideId) => {
    if (!confirm('Are you sure you want to delete this guide?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/guides/${guideId}?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete guide');
      }

      // Refresh guides list
      fetchGuides();
    } catch (err) {
      console.error('Error deleting guide:', err);
      alert(`Failed to delete guide: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
            Loading guides...
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffc27e',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Page Header */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h1 style={{
                color: '#18204aff',
                margin: 0,
                fontSize: '32px',
                fontWeight: '600'
              }}>
                My Guides
              </h1>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => router.push('/')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#18204aff',
                    border: '2px solid #18204aff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => router.push('/guides/new')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#18204aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  ➕ Create Guide
                </button>
              </div>
            </div>
            <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>
              {guides.length === 0 
                ? 'You haven\'t created any guides yet.' 
                : `You have ${guides.length} guide${guides.length === 1 ? '' : 's'}.`
              }
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: '2px solid #ff4444',
              color: '#ff4444'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {guides.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
              <h2 style={{
                color: '#18204aff',
                margin: '0 0 10px 0',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                No guides yet
              </h2>
              <p style={{ color: '#666', margin: '0 0 30px 0', fontSize: '16px' }}>
                Create your first guide to curate locations from your videos!
              </p>
              <button
                onClick={() => router.push('/guides/new')}
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
                Create Guide
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => router.push(`/guides/${guide.id}/edit`)}
                >
                  <h3 style={{
                    color: '#18204aff',
                    margin: '0 0 12px 0',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    {guide.name}
                  </h3>

                  {guide.description && (
                    <p style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {guide.description}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid #eee'
                  }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: guide.is_public ? '#d4edda' : '#f0f0f0',
                      color: guide.is_public ? '#155724' : '#666'
                    }}>
                      {guide.is_public ? '🌐 Public' : '🔒 Private'}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: guide.is_active ? '#d4edda' : '#fff3cd',
                      color: guide.is_active ? '#155724' : '#856404'
                    }}>
                      {guide.is_active ? '✓ Active' : '⏸ Inactive'}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    Created {formatDate(guide.created_at)}
                  </div>

                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/guides/${guide.id}`);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#4444ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      View Map
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/guides/${guide.id}/edit`);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#18204aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(guide.id);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


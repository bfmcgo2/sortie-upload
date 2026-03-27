"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useAuth } from '../../hooks/useAuth';

export default function MyVideos() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch videos if authenticated
    if (isAuthenticated && user?.id) {
      fetchVideos();
    }
  }, [isAuthenticated, user, authLoading, router]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/upload?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
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
          <div style={{
            fontSize: '18px',
            color: '#18204aff'
          }}>
            Loading your videos...
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
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
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
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
                My Videos
              </h1>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#18204aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0f1533';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#18204aff';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                ← Back to Upload
              </button>
            </div>
            <p style={{
              color: '#666',
              margin: 0,
              fontSize: '16px'
            }}>
              {videos.length === 0 
                ? 'You haven\'t uploaded any videos yet.' 
                : `You have ${videos.length} video${videos.length === 1 ? '' : 's'} saved.`
              }
            </p>
          </div>

          {/* Error Message */}
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

          {/* Videos Grid */}
          {videos.length === 0 && !loading && !error ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px'
              }}>
                📹
              </div>
              <h2 style={{
                color: '#18204aff',
                margin: '0 0 10px 0',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                No videos yet
              </h2>
              <p style={{
                color: '#666',
                margin: '0 0 30px 0',
                fontSize: '16px'
              }}>
                Upload your first video to get started!
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#18204aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0f1533';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#18204aff';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Upload Video
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {videos.map((video) => {
                const locationNamesRaw = (video.locations || []).map((loc) => loc?.name || loc?.location_name).filter(Boolean);
                const locationNames = Array.from(new Set(locationNamesRaw));
                const defaultVideoTitle = user?.name ? `${user.name}'s Video` : null;
                const showLocationAsTitle = locationNames.length > 0 && defaultVideoTitle && video.title === defaultVideoTitle;
                const MAX_LOCATION_CHIPS = 6;

                return (
                  <div
                    key={video.id}
                    onClick={() => router.push(`/video/${video.id}/edit`)}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Video Title */}
                    <h3 style={{
                      color: '#18204aff',
                      margin: '0 0 12px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      lineHeight: '1.3',
                      flex: 1
                    }}>
                      {showLocationAsTitle ? locationNames[0] : (video.title || 'Untitled Video')}
                    </h3>

                  {/* Video Info */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    {video.description && (
                      <p style={{
                        margin: 0,
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {video.description}
                      </p>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <span>
                        📅 {formatDate(video.created_at)}
                      </span>
                      <span>
                        💾 {formatFileSize(video.video_file_size)}
                      </span>
                    </div>

                    {locationNames.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '4px'
                      }}>
                        {locationNames.slice(0, MAX_LOCATION_CHIPS).map((loc, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#f0f0f0',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#18204aff'
                            }}
                          >
                            {loc}
                          </span>
                        ))}
                        {locationNames.length > MAX_LOCATION_CHIPS && (
                          <span
                            style={{
                              backgroundColor: '#f0f0f0',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#18204aff'
                            }}
                          >
                            +{locationNames.length - MAX_LOCATION_CHIPS} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid #eee'
                  }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: video.processing_status === 'completed' 
                        ? '#d4edda' 
                        : video.processing_status === 'failed'
                        ? '#f8d7da'
                        : '#fff3cd',
                      color: video.processing_status === 'completed'
                        ? '#155724'
                        : video.processing_status === 'failed'
                        ? '#721c24'
                        : '#856404'
                    }}>
                      {video.processing_status === 'completed' ? '✓ Completed' :
                       video.processing_status === 'failed' ? '✗ Failed' :
                       '⏳ Processing'}
                    </span>
                    
                    <span style={{
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      {video.is_public ? '🌐 Public' : '🔒 Private'}
                    </span>
                  </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


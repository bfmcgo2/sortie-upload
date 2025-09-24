"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function VideoPlayer() {
  const params = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVideo() {
      try {
        const response = await fetch(`/api/video/${params.id}`);
        if (!response.ok) {
          throw new Error('Video not found');
        }
        const data = await response.json();
        setVideo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchVideo();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div>Loading video...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
        color: '#ff4444'
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div>Video not found</div>
      </div>
    );
  }

  return (
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
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #18204aff',
          paddingBottom: '15px'
        }}>
          <h1 style={{
            color: '#18204aff',
            margin: 0,
            fontSize: '24px',
            fontWeight: '600'
          }}>
            {video.title}
          </h1>
          <div style={{
            fontSize: '14px',
            color: '#666'
          }}>
            by {video.user_name}
          </div>
        </div>

        {/* Video Player */}
        <div style={{
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <video
            controls
            preload="metadata"
            playsInline
            style={{
              width: '100%',
              maxWidth: '800px',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              backgroundColor: '#000'
            }}
            onLoadStart={() => console.log('Video loading started')}
            onCanPlay={() => console.log('Video can start playing')}
            onError={(e) => console.error('Video error:', e)}
          >
            <source src={video.video_url} type={video.video_file_type} />
            Your browser does not support the video tag.
          </video>
          
          {/* Loading indicator */}
          <div style={{
            marginTop: '10px',
            fontSize: '14px',
            color: '#666'
          }}>
            {video.video_file_size > 50 * 1024 * 1024 ? 
              'Large video - may take time to load on mobile networks' : 
              'Video ready to play'
            }
          </div>
        </div>

        {/* Video Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <h3 style={{
              color: '#18204aff',
              fontSize: '16px',
              margin: '0 0 8px 0'
            }}>
              File Info
            </h3>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Size:</strong> {(video.video_file_size / 1024 / 1024).toFixed(1)} MB
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Type:</strong> {video.video_file_type}
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Filename:</strong> {video.video_file_name}
            </p>
          </div>

          {video.general_locations && video.general_locations.length > 0 && (
            <div>
              <h3 style={{
                color: '#18204aff',
                fontSize: '16px',
                margin: '0 0 8px 0'
              }}>
                Locations
              </h3>
              {video.general_locations.map((location, index) => (
                <p key={index} style={{ margin: '4px 0', fontSize: '14px' }}>
                  {location}
                </p>
              ))}
            </div>
          )}

          <div>
            <h3 style={{
              color: '#18204aff',
              fontSize: '16px',
              margin: '0 0 8px 0'
            }}>
              Status
            </h3>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Processing:</strong> {video.processing_status}
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Public:</strong> {video.is_public ? 'Yes' : 'No'}
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Created:</strong> {new Date(video.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            <h3 style={{
              color: '#18204aff',
              fontSize: '16px',
              margin: '0 0 10px 0'
            }}>
              Description
            </h3>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
              {video.description}
            </p>
          </div>
        )}

        {/* Back Button */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <button
            onClick={() => window.history.back()}
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
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

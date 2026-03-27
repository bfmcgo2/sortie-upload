"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import GoogleMap from '../../../components/GoogleMap';
import LocationSidebar from '../../../components/LocationSidebar';
import FullVideoPlayer from '../../../components/FullVideoPlayer';
import { useAuth } from '../../../hooks/useAuth';

export default function GuideViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [guide, setGuide] = useState(null);
  const [locations, setLocations] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [hoveredLocationIndex, setHoveredLocationIndex] = useState(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && params.id) {
      fetchGuideData();
    }
  }, [params.id, authLoading]);

  const fetchGuideData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build URL - try with auth if available, otherwise try public
      let url = `/api/guides/${params.id}`;
      if (isAuthenticated && user?.id && user?.email) {
        url += `?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      }
      // If not authenticated, the API will check if guide is public

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 403) {
          setError('Unauthorized: You do not have access to this guide');
          return;
        }
        if (response.status === 404) {
          setError('Guide not found');
          return;
        }
        throw new Error('Failed to fetch guide');
      }

      const data = await response.json();
      setGuide(data.guide);
      
      // Normalize locations to match the format expected by components
      const normalizedLocations = (data.locations || []).map((loc, index) => ({
        ...loc,
        index: index,
        endTime: loc.timeEndSec || (index + 1 < data.locations.length ? data.locations[index + 1].timeStartSec : null)
      }));
      
      setLocations(normalizedLocations);
      
      // Set pins
      setPins(data.pins || []);

      // Set map center from guide coordinates or calculate from locations
      if (data.guide.coordinates) {
        setMapCenter({
          lat: data.guide.coordinates.lat,
          lng: data.guide.coordinates.lng
        });
      } else if (normalizedLocations.length > 0) {
        // Calculate center from locations and pins
        const validLocations = normalizedLocations.filter(loc => 
          loc.coordinates && 
          typeof loc.coordinates.lat === 'number' && 
          typeof loc.coordinates.lng === 'number'
        );
        
        const validPins = (data.pins || []).filter(pin =>
          pin.coordinates &&
          typeof pin.coordinates.lat === 'number' &&
          typeof pin.coordinates.lng === 'number'
        );
        
        const allCoords = [...validLocations.map(l => l.coordinates), ...validPins.map(p => p.coordinates)];
        
        if (allCoords.length > 0) {
          const avgLat = allCoords.reduce((sum, coord) => sum + coord.lat, 0) / allCoords.length;
          const avgLng = allCoords.reduce((sum, coord) => sum + coord.lng, 0) / allCoords.length;
          setMapCenter({ lat: avgLat, lng: avgLng });
        }
      }
    } catch (err) {
      console.error('Error fetching guide:', err);
      setError(err.message || 'Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  const getGuideUrl = () => {
    if (typeof window !== 'undefined' && params.id) {
      return `${window.location.origin}/guides/${params.id}`;
    }
    return null;
  };

  const copyGuideUrl = async () => {
    const url = getGuideUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    }
  };

  const getLocationUrl = (location) => {
    if (!location) return null;
    
    // Prefer Google Place ID if available
    if (location.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
    }
    
    // Fallback to coordinates
    if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
      return `https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}`;
    }
    
    // Fallback to location name search
    if (location.locationName || location.name) {
      const query = encodeURIComponent(location.locationName || location.name);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    
    return null;
  };

  const handleLocationClick = (location, index) => {
    // Pan map to the selected location
    if (location.coordinates) {
      setMapCenter({
        lat: location.coordinates.lat,
        lng: location.coordinates.lng
      });
    }
    
    const endTime = index + 1 < locations.length 
      ? locations[index + 1].timeStartSec 
      : null;
    
    const locationWithEndTime = {
      ...location,
      endTime: endTime,
      index: index
    };
    
    setSelectedLocation(locationWithEndTime);

    // Set video stream URL for this location's video
    if (location.videoId) {
      let url = `/api/video/${location.videoId}/proxy`;
      if (isAuthenticated && user?.id && user?.email) {
        url += `?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      }
      setVideoStreamUrl(url);
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

  if (!guide) {
    return null;
  }

  return (
    <>
      <Header />
      
      {locations.length > 0 && (
        <>
          <LocationSidebar 
            locations={locations}
            onLocationClick={handleLocationClick}
            onLocationHover={setHoveredLocationIndex}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
          />
          
          <GoogleMap 
            locations={locations}
            pins={pins}
            onLocationClick={handleLocationClick}
            isVisible={true}
            mapCenter={mapCenter}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
          />

          {/* Guide Info Header */}
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '370px',
            right: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 25,
            maxWidth: '600px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '10px'
            }}>
              <div style={{ flex: 1 }}>
                <h1 style={{
                  color: '#18204aff',
                  margin: '0 0 8px 0',
                  fontSize: '24px',
                  fontWeight: '600',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {guide.name}
                </h1>
                {guide.description && (
                  <p style={{
                    color: '#666',
                    margin: 0,
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {guide.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyGuideUrl}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: urlCopied ? '#4caf50' : 'transparent',
                    color: urlCopied ? 'white' : '#18204aff',
                    border: '2px solid #18204aff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s ease'
                  }}
                  title={getGuideUrl() || 'Copy guide URL'}
                >
                  {urlCopied ? '✓ Copied!' : '🔗 Copy URL'}
                </button>
                <button
                  onClick={() => router.push('/guides')}
                  style={{
                    padding: '8px 16px',
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
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              fontSize: '12px',
              color: '#999',
              fontFamily: "'Inter', sans-serif",
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <span>{locations.length} location{locations.length === 1 ? '' : 's'}</span>
              <span>{guide.is_public ? '🌐 Public' : '🔒 Private'}</span>
              {getGuideUrl() && (
                <span style={{
                  fontSize: '11px',
                  color: '#666',
                  fontFamily: 'monospace',
                  backgroundColor: '#f5f5f5',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {getGuideUrl()}
                </span>
              )}
              {selectedLocation && getLocationUrl(selectedLocation) && (
                <a
                  href={getLocationUrl(selectedLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#18204aff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                  }}
                >
                  🗺️ View on Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Play Full Video Button - Show if we have a selected location with video */}
          {selectedLocation && videoStreamUrl && (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 25
            }}>
              <button
                onClick={() => setShowFullVideo(true)}
                style={{
                  padding: '12px 24px',
                  background: '#18204aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
              >
                ▶️ Play Video
              </button>
            </div>
          )}
        </>
      )}

      {locations.length === 0 && (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffc27e',
          padding: '20px',
          fontFamily: "'Inter', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              color: '#18204aff',
              margin: '0 0 10px 0',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              {guide.name}
            </h2>
            <p style={{ color: '#666', margin: '0 0 20px 0' }}>
              This guide doesn't have any locations yet.
            </p>
            {isAuthenticated && user?.id === guide.user_id && (
              <button
                onClick={() => router.push(`/guides/${guide.id}/edit`)}
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
                Edit Guide
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Video Player Modal */}
      {showFullVideo && videoStreamUrl && (
        <FullVideoPlayer
          videoUrl={videoStreamUrl}
          onClose={() => setShowFullVideo(false)}
        />
      )}
    </>
  );
}


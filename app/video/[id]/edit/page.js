"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../../components/Header';
import VideoPlayer from '../../../../components/VideoPlayer';
import GoogleMap from '../../../../components/GoogleMap';
import LocationSidebar from '../../../../components/LocationSidebar';
import FullVideoPlayer from '../../../../components/FullVideoPlayer';
import AddToGuideModal from '../../../../components/AddToGuideModal';
import { useAuth } from '../../../../hooks/useAuth';

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [video, setVideo] = useState(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState(null); // Signed URL for streaming
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [hoveredLocationIndex, setHoveredLocationIndex] = useState(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showAddToGuideModal, setShowAddToGuideModal] = useState(false);
  const [selectedLocationForGuide, setSelectedLocationForGuide] = useState(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch video data if authenticated
    if (isAuthenticated && user?.id && params.id) {
      fetchVideoData();
    }
  }, [isAuthenticated, user, params.id, authLoading, router]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Log user info being sent
      console.log('Fetching video data with user:', {
        id: user.id,
        email: user.email,
        idType: typeof user.id,
        emailType: typeof user.email
      });

      // Fetch video with explicit ownership check
      const response = await fetch(
        `/api/video/${params.id}/edit?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          // Try to get debug info from response
          const errorData = await response.json().catch(() => ({}));
          console.error('Authorization failed:', errorData);
          setError(
            errorData.debug 
              ? `Unauthorized: You do not own this video. Debug: Your ID "${errorData.debug.providedUserId}" vs Video Owner ID "${errorData.debug.videoUserId}", Your Email "${errorData.debug.providedUserEmail}" vs Video Owner Email "${errorData.debug.videoUserEmail}"`
              : 'Unauthorized: You do not own this video'
          );
          return;
        }
        if (response.status === 404) {
          setError('Video not found');
          return;
        }
        throw new Error('Failed to fetch video');
      }

      const data = await response.json();
      
      // EXPLICIT CLIENT-SIDE OWNERSHIP VERIFICATION
      // Double-check ownership on client side as well (with normalization)
      if (data.video) {
        const normalizedVideoUserId = String(data.video.user_id || '').trim();
        const normalizedUserId = String(user.id || '').trim();
        const normalizedVideoEmail = (data.video.user_email || '').toLowerCase().trim();
        const normalizedUserEmail = (user.email || '').toLowerCase().trim();
        
        if (normalizedVideoUserId !== normalizedUserId || normalizedVideoEmail !== normalizedUserEmail) {
          console.error('Client-side ownership check failed:', {
            video_user_id: data.video.user_id,
            user_id: user.id,
            video_user_email: data.video.user_email,
            user_email: user.email,
            normalized_video_user_id: normalizedVideoUserId,
            normalized_user_id: normalizedUserId,
            normalized_video_email: normalizedVideoEmail,
            normalized_user_email: normalizedUserEmail
          });
          setError(
            `Unauthorized: You do not own this video. Your ID "${user.id}" vs Video Owner ID "${data.video.user_id}", Your Email "${user.email}" vs Video Owner Email "${data.video.user_email}"`
          );
          return;
        }
      }

      setVideo(data.video);
      
      // Use proxy URL for video streaming (to avoid CORS issues)
      // The proxy endpoint streams the video through our server with proper CORS headers
      const proxyUrl = `/api/video/${params.id}/proxy?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      setVideoStreamUrl(proxyUrl);
      
      // Normalize locations to match the format expected by components
      const normalizedLocations = (data.locations || []).map((loc, index) => ({
        ...loc,
        index: index,
        endTime: loc.timeEndSec || (index + 1 < data.locations.length ? data.locations[index + 1].timeStartSec : null)
      }));
      
      setLocations(normalizedLocations);
      setShowMap(true);
    } catch (err) {
      console.error('Error fetching video:', err);
      setError(err.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = (location, index) => {
    console.log('=== LOCATION CLICKED ===');
    console.log('Location name:', location.name);
    console.log('Location index:', index);
    
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
      index: index,
      locationId: location.id // Store database ID for updates
    };
    
    setSelectedLocation(locationWithEndTime);
  };

  const handleLocationSave = async (updatedLocation) => {
    if (!selectedLocation || !selectedLocation.locationId) {
      console.error('Cannot save: location ID missing');
      return;
    }

    try {
      // Prepare location data for API
      const locationData = {
        name: updatedLocation.name,
        locationName: updatedLocation.locationName || updatedLocation.location_name,
        coordinates: updatedLocation.coordinates,
        placeId: updatedLocation.placeId || updatedLocation.place_id,
        timeStartSec: updatedLocation.timeStartSec,
        timeEndSec: updatedLocation.timeEndSec || updatedLocation.endTime,
        mention: updatedLocation.mention,
        context: updatedLocation.context
      };

      // Update location via API with explicit authorization
      const response = await fetch(`/api/locations/${selectedLocation.locationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: {
            id: user.id,
            email: user.email
          },
          locationData: locationData
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert('Unauthorized: You do not own this location');
          return;
        }
        throw new Error('Failed to update location');
      }

      const result = await response.json();

      // Update local state
      const updatedLocations = [...locations];
      updatedLocations[selectedLocation.index] = {
        ...updatedLocation,
        id: selectedLocation.locationId,
        timeStartSec: updatedLocation.timeStartSec,
        timeEndSec: updatedLocation.timeEndSec || updatedLocation.endTime
      };
      
      setLocations(updatedLocations);

      // Update map center if coordinates changed
      if (updatedLocation.coordinates) {
        setMapCenter({
          lat: updatedLocation.coordinates.lat,
          lng: updatedLocation.coordinates.lng
        });
      }

      // Close video player
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      alert(`Failed to save location: ${error.message}`);
    }
  };

  const handleLocationDelete = async (index) => {
    const location = locations[index];
    
    if (!location || !location.id) {
      console.error('Cannot delete: location ID missing');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return;
    }

    try {
      // Delete location via API with explicit authorization
      const response = await fetch(
        `/api/locations/${location.id}?userId=${user.id}&userEmail=${encodeURIComponent(user.email)}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          alert('Unauthorized: You do not own this location');
          return;
        }
        throw new Error('Failed to delete location');
      }

      // Update local state
      const updatedLocations = locations.filter((_, i) => i !== index);
      // Re-index locations
      updatedLocations.forEach((loc, i) => {
        loc.index = i;
      });
      setLocations(updatedLocations);

      // Close video player if this was the selected location
      if (selectedLocation && selectedLocation.index === index) {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert(`Failed to delete location: ${error.message}`);
    }
  };

  const handleLocationAdd = async (newLocation) => {
    // For now, just add to local state
    // TODO: Implement API endpoint to add new locations to existing videos
    const updatedLocations = [...locations];
    
    // Insert in correct position based on timestamp
    const newStartTime = typeof newLocation.timeStartSec === 'number' 
      ? newLocation.timeStartSec 
      : parseFloat(newLocation.timeStartSec) || 0;
    
    const insertIndex = updatedLocations.findIndex(
      loc => {
        const locStartTime = typeof loc.timeStartSec === 'number' 
          ? loc.timeStartSec 
          : parseFloat(loc.timeStartSec) || 0;
        return locStartTime > newStartTime;
      }
    );
    
    if (insertIndex === -1) {
      updatedLocations.push(newLocation);
    } else {
      updatedLocations.splice(insertIndex, 0, newLocation);
    }
    
    // Re-index
    updatedLocations.forEach((loc, i) => {
      loc.index = i;
    });
    
    setLocations(updatedLocations);

    // Pan map if coordinates exist
    if (newLocation.coordinates) {
      setMapCenter({
        lat: newLocation.coordinates.lat,
        lng: newLocation.coordinates.lng
      });
    }

    setIsAddingLocation(false);
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
            Loading video...
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
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
            <h1 style={{
              color: '#18204aff',
              margin: '0 0 20px 0',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Error
            </h1>
            <p style={{
              color: '#ff4444',
              margin: '0 0 20px 0',
              fontSize: '16px'
            }}>
              {error}
            </p>
            <button
              onClick={() => router.push('/my-videos')}
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
              ← Back to My Videos
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <>
      <Header />
      
      {showMap && (
        <>
          <LocationSidebar 
            locations={locations}
            onLocationClick={handleLocationClick}
            onLocationHover={setHoveredLocationIndex}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
            onAddToGuide={(locationId) => {
              setSelectedLocationForGuide(locationId);
              setShowAddToGuideModal(true);
            }}
          />
          
          <GoogleMap 
            locations={locations}
            onLocationClick={handleLocationClick}
            isVisible={true}
            mapCenter={mapCenter}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
          />

          {/* Back Button */}
          <button
            onClick={() => router.push('/my-videos')}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '12px 24px',
              background: 'white',
              color: '#18204aff',
              border: '2px solid #18204aff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              zIndex: 25,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#18204aff';
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.color = '#18204aff';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ← Back to My Videos
          </button>

          {/* Add Location Button */}
          <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 25
          }}>
            <button
              onClick={() => setIsAddingLocation(true)}
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
              ➕ Add Location
            </button>
          </div>

          {/* Play Full Video Button */}
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
              ▶️ Play Full Video
            </button>
          </div>
        </>
      )}

      {/* Video Player Modal - Edit Mode */}
      {selectedLocation && video && videoStreamUrl && !isAddingLocation && (
        <VideoPlayer
          videoUrl={videoStreamUrl}
          startTime={selectedLocation.timeStartSec}
          endTime={selectedLocation.endTime}
          locationName={selectedLocation.name}
          onClose={() => setSelectedLocation(null)}
          location={selectedLocation}
          allLocations={locations}
          onSave={handleLocationSave}
          onDelete={(index) => {
            handleLocationDelete(index);
            setSelectedLocation(null);
          }}
          isAddMode={false}
        />
      )}

      {/* Video Player Modal - Add Mode */}
      {isAddingLocation && video && videoStreamUrl && (
        <VideoPlayer
          videoUrl={videoStreamUrl}
          startTime={0}
          endTime={null}
          locationName="New Location"
          onClose={() => setIsAddingLocation(false)}
          location={null}
          allLocations={locations}
          onSave={handleLocationAdd}
          isAddMode={true}
        />
      )}

      {/* Full Video Player Modal */}
      {showFullVideo && video && videoStreamUrl && (
        <FullVideoPlayer
          videoUrl={videoStreamUrl}
          onClose={() => setShowFullVideo(false)}
        />
      )}

      {/* Add to Guide Modal */}
      {showAddToGuideModal && selectedLocationForGuide && user && (
        <AddToGuideModal
          locationId={selectedLocationForGuide}
          userId={user.id}
          userEmail={user.email}
          onClose={(success) => {
            setShowAddToGuideModal(false);
            setSelectedLocationForGuide(null);
            if (success) {
              // Optionally show a success message
              console.log('Location added to guide(s) successfully');
            }
          }}
        />
      )}
    </>
  );
}


"use client";
import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ videoFile, startTime, endTime, locationName, onClose, location, allLocations, onSave, onDelete }) {
  
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actualEndTime, setActualEndTime] = useState(endTime);
  const [isEditing, setIsEditing] = useState(false);
  const [editStartTime, setEditStartTime] = useState(startTime);
  const [editEndTime, setEditEndTime] = useState(endTime);
  const [editLocationName, setEditLocationName] = useState(location?.name || '');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  
  // Convert actual video time to "clip time" (0-based)
  const getClipTime = (videoTime) => Math.max(0, videoTime - startTime);
  const getVideoTime = (clipTime) => startTime + clipTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    const handleLoadedData = () => {
      // If no endTime provided, use video duration
      if (!endTime && video.duration) {
        setActualEndTime(video.duration);
      }
      
      // Reset video state and set start time
      video.currentTime = startTime;
      setIsPlaying(false); // Reset play state
      
      // Don't auto-play, let user control it
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Loop back to start when we reach the end time
      if (actualEndTime && video.currentTime >= actualEndTime) {
        video.currentTime = startTime;
        // Keep playing (don't pause)
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleSeeking = () => {
      // Prevent seeking outside the allowed range
      if (video.currentTime < startTime) {
        video.currentTime = startTime;
      } else if (actualEndTime && video.currentTime > actualEndTime) {
        video.currentTime = actualEndTime;
        video.pause();
      }
    };

    const handleSeeked = () => {
      // Also check after seeking is complete
      if (video.currentTime < startTime) {
        video.currentTime = startTime;
      } else if (actualEndTime && video.currentTime > actualEndTime) {
        video.currentTime = startTime; // Loop back to start instead of pausing
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Cleanup
    return () => {
      // Safely pause and reset video before cleanup
      try {
        video.pause();
        video.currentTime = 0;
        video.src = ''; // Clear the src to stop any pending requests
      } catch (error) {
        console.log('Video cleanup error (safe to ignore):', error);
      }
      
      setIsPlaying(false);
      
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      
      // Revoke URL after a small delay to ensure video operations are complete
      setTimeout(() => {
        try {
          URL.revokeObjectURL(videoUrl);
        } catch (error) {
          console.log('URL revocation error (safe to ignore):', error);
        }
      }, 100);
    };
  }, [videoFile, startTime, endTime, actualEndTime]);

  // Force rerender key
  const [videoKey, setVideoKey] = useState(0);


  const formatTime = (sec) => {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [h, m, s].map((n) => String(n).padStart(2, '0'));
    return parts.join(':');
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    if (!video || !actualEndTime) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    
    const clipDuration = actualEndTime - startTime;
    const newClipTime = clipDuration * percentage;
    const newVideoTime = getVideoTime(newClipTime);
    
    video.currentTime = Math.max(startTime, Math.min(newVideoTime, actualEndTime));
  };

  const clipDuration = actualEndTime ? actualEndTime - startTime : 0;
  const currentClipTime = getClipTime(currentTime);
  const progress = clipDuration > 0 ? (currentClipTime / clipDuration) * 100 : 0;

  // Google Places Autocomplete
  const searchPlaces = async (query) => {
    if (!query.trim() || !window.google || !window.google.maps || !window.google.maps.places) {
      console.log('Google Places API not ready yet');
      return;
    }
    
    try {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ['establishment', 'geocode']
      };
      
      service.getPlacePredictions(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      });
    } catch (error) {
      console.error('Places autocomplete error:', error);
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleLocationInputChange = (value) => {
    setEditLocationName(value);
    setSelectedPlace(null);
    if (value.length > 2) {
      // Add a small delay to allow Google Maps API to fully load
      setTimeout(() => searchPlaces(value), 100);
    } else {
      setShowPredictions(false);
    }
  };

  const selectPlace = (prediction) => {
    // Extract just the name (before the first comma)
    const name = prediction.description.split(',')[0].trim();
    setEditLocationName(name);
    setSelectedPlace(prediction);
    setShowPredictions(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${location?.name}"?`)) {
      onDelete?.(location?.index);
      setIsEditing(false);
      onClose(); // Close the video player and return to map
    }
  };

  const handleSave = async () => {
    if (!selectedPlace && editLocationName !== location?.name) {
      alert('Please select a location from the dropdown');
      return;
    }
    
    // Validate time ranges
    if (editStartTime >= editEndTime) {
      alert('End time must be after start time');
      return;
    }
    
    // Check for overlaps with other locations
    if (allLocations && location?.index !== undefined) {
      const currentIndex = location.index;
      
      // Check overlap with previous location
      if (currentIndex > 0) {
        const prevLocation = allLocations[currentIndex - 1];
        if (prevLocation && editStartTime < prevLocation.timeEndSec) {
          alert(`Time range overlaps with "${prevLocation.name}" (ends at ${formatTime(prevLocation.timeEndSec)})`);
          return;
        }
      }
      
      // Check overlap with next location
      if (currentIndex < allLocations.length - 1) {
        const nextLocation = allLocations[currentIndex + 1];
        if (nextLocation && editEndTime > nextLocation.timeStartSec) {
          alert(`Time range overlaps with "${nextLocation.name}" (starts at ${formatTime(nextLocation.timeStartSec)})`);
          return;
        }
      }
    }
    
    let updatedLocation = {
      ...location,
      name: editLocationName,
      timeStartSec: editStartTime,
      timeEndSec: editEndTime,
      ...(selectedPlace && {
        placeId: selectedPlace.place_id,
        locationName: selectedPlace.description
      })
    };
    
    // If we have a selected place, geocode it to get coordinates
    if (selectedPlace && window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ placeId: selectedPlace.place_id }, (results, status) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });
        
        if (result.geometry && result.geometry.location) {
          updatedLocation.coordinates = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng()
          };
          updatedLocation.locationName = result.formatted_address;
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Continue without coordinates if geocoding fails
      }
    }
    
    onSave?.(updatedLocation);
    setIsEditing(false);
  };

  const formatTimeForInput = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseTimeFromInput = (timeString) => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
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
          padding: 20,
          borderRadius: 8,
          maxWidth: '350px',
          maxHeight: '90vh',
          width: '100%',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            {locationName}
          </h3>
          <button
            onClick={() => {
              if (!isEditing) {
                // Pause video when entering edit mode
                if (videoRef.current) {
                  videoRef.current.pause();
                }
              }
              setIsEditing(!isEditing);
            }}
            style={{
              background: '#18204aff',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        
        <video
          key={videoKey}
          ref={videoRef}
          onClick={togglePlayPause}
          style={{
            width: '100%',
            aspectRatio: '678 / 1198',
            objectFit: 'cover',
            backgroundColor: '#000',
            cursor: 'pointer',
            display: isEditing ? 'none' : 'block'
          }}
        />
        
        {/* Edit Mode */}
        {isEditing && (
          <div style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #ddd'
          }}>
            <h4 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: '#18204aff',
              margin: '0 0 16px 0'
            }}>
              Edit Location Details
            </h4>
            
            {/* Time Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#18204aff',
                  marginBottom: 4,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  Start Time (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={formatTimeForInput(editStartTime)}
                  onChange={(e) => setEditStartTime(parseTimeFromInput(e.target.value))}
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#18204aff',
                  marginBottom: 4,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  End Time (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={formatTimeForInput(editEndTime)}
                  onChange={(e) => setEditEndTime(parseTimeFromInput(e.target.value))}
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>
            </div>
            
            {/* Location Input with Autocomplete */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#18204aff',
                marginBottom: 4,
                fontFamily: "'Inter', sans-serif"
              }}>
                Location Name
              </label>
              <input
                type="text"
                value={editLocationName}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                placeholder="Start typing to search locations..."
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "'Inter', sans-serif"
                }}
              />
              
              {/* Predictions Dropdown */}
              {showPredictions && predictions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 1001
                }}>
                  {predictions.map((prediction, index) => (
                    <div
                      key={prediction.place_id}
                      onClick={() => selectPlace(prediction)}
                      style={{
                        padding: 12,
                        borderBottom: index < predictions.length - 1 ? '1px solid #eee' : 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: "'Inter', sans-serif",
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {prediction.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Save/Cancel/Delete Buttons */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button
                onClick={handleDelete}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                Delete Location
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setVideoKey(prev => prev + 1); // Force video rerender
                    setIsEditing(false);
                  }}
                  style={{
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd',
                    padding: '8px 16px',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedPlace && editLocationName !== location?.name}
                  style={{
                    background: (!selectedPlace && editLocationName !== location?.name) ? '#ccc' : '#18204aff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: (!selectedPlace && editLocationName !== location?.name) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Controls - Only show when not editing */}
        {!isEditing && (
          <div style={{ marginTop: 12 }}>
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              style={{
                background: '#4444ff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 8
              }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            {/* Custom Progress Bar - Only shows the clip range */}
            <div
              onClick={handleProgressClick}
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#ddd',
                borderRadius: 4,
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, progress))}%`,
                  height: '100%',
                  backgroundColor: '#4444ff',
                  borderRadius: 4,
                  transition: 'width 0.1s ease'
                }}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: 12, 
              color: '#666',
              marginTop: 4
            }}>
              <span>{formatTime(currentClipTime)}</span>
              <span>{formatTime(clipDuration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

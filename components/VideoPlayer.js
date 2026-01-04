"use client";
import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ videoFile, startTime, endTime, locationName, onClose, location, allLocations, onSave, onDelete, isAddMode = false }) {
  
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actualEndTime, setActualEndTime] = useState(endTime);
  const [isEditing, setIsEditing] = useState(isAddMode); // Start in edit mode if adding
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
      // Use a small delay to ensure video is ready
      setTimeout(() => {
        try {
          if (video && video.readyState >= 2) {
            video.currentTime = startTime;
            setIsPlaying(false); // Reset play state
          }
        } catch (error) {
          // Ignore errors when setting currentTime
          if (error.name !== 'AbortError') {
            console.log('Error setting video time:', error);
          }
        }
      }, 50);
      
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
        // Only pause if video is actually playing to avoid interrupting pending play() calls
        if (!video.paused) {
          video.pause().catch(err => {
            // Ignore errors during cleanup
            if (err.name !== 'AbortError') {
              console.log('Video cleanup pause error (safe to ignore):', err);
            }
          });
        }
        video.currentTime = 0;
        video.src = ''; // Clear the src to stop any pending requests
      } catch (error) {
        // Ignore AbortError during cleanup
        if (error.name !== 'AbortError') {
          console.log('Video cleanup error (safe to ignore):', error);
        }
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

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (isPlaying) {
        video.pause();
      } else {
        // Wait for video to be ready before playing
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          await video.play();
        } else {
          // Wait for video to load enough data
          const playWhenReady = () => {
            if (video.readyState >= 2) {
              video.play().catch(err => {
                // Ignore AbortError - it's safe to ignore
                if (err.name !== 'AbortError') {
                  console.error('Play error:', err);
                }
              });
              video.removeEventListener('loadeddata', playWhenReady);
            }
          };
          video.addEventListener('loadeddata', playWhenReady);
        }
      }
    } catch (error) {
      // Ignore AbortError - it happens when play() is interrupted
      if (error.name !== 'AbortError') {
        console.error('Play/pause error:', error);
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
    // In add mode, require a selected place
    if (isAddMode && !selectedPlace) {
      alert('Please select a location from the dropdown');
      return;
    }
    
    // In edit mode, only require selection if name changed
    if (!isAddMode && !selectedPlace && editLocationName !== location?.name) {
      alert('Please select a location from the dropdown');
      return;
    }
    
    // Validate time ranges
    if (editEndTime && editStartTime >= editEndTime) {
      alert('End time must be after start time');
      return;
    }
    
    // Check for overlaps with other locations
    if (allLocations) {
      // Helper function to check if two time ranges overlap
      const rangesOverlap = (start1, end1, start2, end2) => {
        // If either range has no end time, treat it as extending indefinitely
        // Two ranges overlap if: start1 < end2 && end1 > start2
        // But we need to handle null end times
        
        if (end1 === null && end2 === null) {
          // Both have no end - they overlap if they have the same start time
          return start1 === start2;
        } else if (end1 === null) {
          // First range has no end - overlaps if it starts before second range ends
          return start1 < end2;
        } else if (end2 === null) {
          // Second range has no end - overlaps if first range ends after second starts
          return end1 > start2;
        } else {
          // Both have end times - standard overlap check
          return start1 < end2 && end1 > start2;
        }
      };

      if (isAddMode) {
        // For new locations, check all existing locations
        for (const existingLoc of allLocations) {
          const existingStart = existingLoc.timeStartSec;
          const existingEnd = existingLoc.timeEndSec;
          
          if (rangesOverlap(editStartTime, editEndTime, existingStart, existingEnd)) {
            const existingEndDisplay = existingEnd ? formatTime(existingEnd) : 'end of video';
            alert(`Time range overlaps with "${existingLoc.name}" (${formatTime(existingStart)} - ${existingEndDisplay})`);
            return;
          }
        }
      } else if (location?.index !== undefined) {
        // For editing, check overlaps with all other locations (excluding current)
        const currentIndex = location.index;
        
        for (let i = 0; i < allLocations.length; i++) {
          if (i === currentIndex) continue; // Skip the location being edited
          
          const otherLoc = allLocations[i];
          const otherStart = otherLoc.timeStartSec;
          const otherEnd = otherLoc.timeEndSec;
          
          if (rangesOverlap(editStartTime, editEndTime, otherStart, otherEnd)) {
            const otherEndDisplay = otherEnd ? formatTime(otherEnd) : 'end of video';
            alert(`Time range overlaps with "${otherLoc.name}" (${formatTime(otherStart)} - ${otherEndDisplay})`);
            return;
          }
        }
      }
    }
    
    let updatedLocation = {
      ...(location || {}),
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
            {isAddMode ? 'Add Location' : locationName}
          </h3>
          {!isAddMode && (
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
          )}
        </div>
        
        {!isAddMode && (
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
        )}
        
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
              {isAddMode ? 'Add Location Details' : 'Edit Location Details'}
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
            <div style={{ display: 'flex', gap: 8, justifyContent: isAddMode ? 'flex-end' : 'space-between' }}>
              {!isAddMode && (
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
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    if (!isAddMode) {
                      setVideoKey(prev => prev + 1); // Force video rerender
                    }
                    setIsEditing(false);
                    if (isAddMode) {
                      onClose();
                    }
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
                  disabled={isAddMode ? !selectedPlace : (!selectedPlace && editLocationName !== location?.name)}
                  style={{
                    background: (isAddMode ? !selectedPlace : (!selectedPlace && editLocationName !== location?.name)) ? '#ccc' : '#18204aff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: (isAddMode ? !selectedPlace : (!selectedPlace && editLocationName !== location?.name)) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  {isAddMode ? 'Add Location' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Controls - Only show when not editing and not in add mode */}
        {!isEditing && !isAddMode && (
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

"use client";
import { useState } from "react";
import UploadDropzone from "../components/UploadDropzone";
import VideoPlayer from "../components/VideoPlayer";
import Header from "../components/Header";
import GoogleMap from "../components/GoogleMap";
import LocationSidebar from "../components/LocationSidebar";
import FullVideoPlayer from "../components/FullVideoPlayer";
import SignInModal from "../components/SignInModal";
import { useAuth } from "../hooks/useAuth";
import { dbHelpers } from "../lib/supabase";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [results, setResults] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showUpload, setShowUpload] = useState(true);
  const [mapCenter, setMapCenter] = useState(null);
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [hoveredLocationIndex, setHoveredLocationIndex] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const removeLocation = (indexToRemove) => {
    if (!results) return;
    const updatedLocations = results.locations.filter((_, index) => index !== indexToRemove);
    setResults({
      ...results,
      locations: updatedLocations,
      debug: {
        ...results.debug,
        geocodedCount: updatedLocations.length
      }
    });
  };

  const handleResults = async (resultsData, file) => {
    console.log('handleResults called with:', { resultsData, file });
    
    // Store results and video file
    setResults(resultsData);
    setVideoFile(file);
    
    // Start fade out transition
    setShowUpload(false);
    
    // After fade out completes, show map
    setTimeout(() => {
      setShowMap(true);
    }, 800); // Match fade out duration
  };

  const handleLocationClick = (location, index) => {
    console.log('=== LOCATION CLICKED ===');
    console.log('Location name:', location.name);
    console.log('Location index:', index);
    console.log('Location coordinates:', location.coordinates);
    console.log('Video file available:', !!videoFile);
    console.log('Results available:', !!results);
    
    // Pan map to the selected location
    if (location.coordinates) {
      console.log('Setting map center to:', location.coordinates);
      const newCenter = {
        lat: location.coordinates.lat,
        lng: location.coordinates.lng
      };
      console.log('New map center:', newCenter);
      setMapCenter(newCenter);
      console.log('mapCenter state updated, current value:', newCenter);
    } else {
      console.log('❌ No coordinates found for location:', location.name);
    }
    
    const endTime = index + 1 < results.locations.length 
      ? results.locations[index + 1].timeStartSec 
      : null;
    
    console.log('Calculated endTime:', endTime);
    
    const locationWithEndTime = {
      ...location,
      endTime: endTime,
      index: index // Store index for saving edits
    };
    
    console.log('Setting selectedLocation:', locationWithEndTime);
    setSelectedLocation(locationWithEndTime);
  };

  const handleLocationSave = (updatedLocation) => {
    if (!results || selectedLocation.index === undefined) return;
    
    const updatedLocations = [...results.locations];
    updatedLocations[selectedLocation.index] = updatedLocation;
    
    setResults({
      ...results,
      locations: updatedLocations
    });
    
    // If the location has new coordinates, pan the map to it
    if (updatedLocation.coordinates) {
      setMapCenter({
        lat: updatedLocation.coordinates.lat,
        lng: updatedLocation.coordinates.lng
      });
    }
    
    // Close video player
    setSelectedLocation(null);
  };

  const handleLocationAdd = (newLocation) => {
    if (!results) return;
    
    // Ensure timeStartSec is a number for proper comparison
    const newStartTime = typeof newLocation.timeStartSec === 'number' 
      ? newLocation.timeStartSec 
      : parseFloat(newLocation.timeStartSec) || 0;
    
    // Insert the new location in the correct position based on timestamp
    const updatedLocations = [...results.locations];
    
    // Find the first location where start time is greater than the new location's start time
    const insertIndex = updatedLocations.findIndex(
      loc => {
        const locStartTime = typeof loc.timeStartSec === 'number' 
          ? loc.timeStartSec 
          : parseFloat(loc.timeStartSec) || 0;
        return locStartTime > newStartTime;
      }
    );
    
    console.log('=== ADDING LOCATION ===');
    console.log('New location start time:', newStartTime);
    console.log('Existing locations:', updatedLocations.map(l => ({
      name: l.name,
      timeStartSec: l.timeStartSec,
      timeStartSecType: typeof l.timeStartSec
    })));
    console.log('Insert index:', insertIndex);
    
    if (insertIndex === -1) {
      // New location is after all existing locations
      updatedLocations.push(newLocation);
      console.log('Inserting at end of array');
    } else {
      // Insert at the correct position
      updatedLocations.splice(insertIndex, 0, newLocation);
      console.log(`Inserting at position ${insertIndex}`);
    }
    
    console.log('Final locations order:', updatedLocations.map(l => ({
      name: l.name,
      timeStartSec: l.timeStartSec
    })));
    
    setResults({
      ...results,
      locations: updatedLocations
    });
    
    // If the location has coordinates, pan the map to it
    if (newLocation.coordinates) {
      setMapCenter({
        lat: newLocation.coordinates.lat,
        lng: newLocation.coordinates.lng
      });
    }
    
    // Close add location modal
    setIsAddingLocation(false);
  };

  const formatTime = (sec) => {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [h, m, s].map((n) => String(n).padStart(2, '0'));
    return parts.join(':');
  };
  
  const handleSubmitVideo = async () => {
    if (!isAuthenticated) {
      // Show sign-in modal if not authenticated
      setShowSignInModal(true);
      return;
    }
    
    if (!results || !videoFile) {
      alert('No video data to submit. Please process a video first.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare video data for upload
      const videoData = {
        filename: videoFile.name,
        fileType: videoFile.type,
        fileSize: videoFile.size,
        generalLocations: results.generalLocations || [],
        transcript: results.transcript || null,
        title: `${user.name}'s Video`,
        description: `A travel video with ${results.locations.length} locations`
      };

      // Upload to Supabase using FormData (server-to-server upload)
      const formData = new FormData();
      formData.append('user', JSON.stringify(user));
      formData.append('videoData', JSON.stringify(videoData));
      formData.append('locations', JSON.stringify(results.locations));
      formData.append('videoFile', videoFile);
      formData.append('isPublic', 'true');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        const text = await response.text();
        if (!response.ok) {
          // Handle 413 Payload Too Large error specifically
          if (response.status === 413) {
            const fileSizeMB = (videoFile.size / (1024 * 1024)).toFixed(2);
            throw new Error(
              `File too large (${fileSizeMB} MB). The server has a size limit. ` +
              `Please compress your video or use a smaller file. ` +
              `The system will automatically compress files over 50MB, but the initial upload must be under the server limit.`
            );
          }
          throw new Error(text || 'Upload failed');
        }
        throw e;
      }
      
      if (!response.ok) {
        // Handle 413 error with better message
        if (response.status === 413) {
          const fileSizeMB = (videoFile.size / (1024 * 1024)).toFixed(2);
          throw new Error(
            `File too large (${fileSizeMB} MB). The server has a size limit. ` +
            `Please compress your video or use a smaller file.`
          );
        }
        throw new Error(result.error || 'Upload failed');
      }

      if (result.videoUrl) {
        alert(`Video submitted successfully! View your video: ${window.location.origin}${result.videoUrl}`);
      } else {
        alert('Video submitted successfully! Your travel data has been saved.');
      }
              
              // Optionally reset the form or show success state
              // setResults(null);
              // setVideoFile(null);
              // setShowMap(false);
              // setShowUpload(true);

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInSuccess = () => {
    // After successful sign-in, proceed with video submission
    console.log('User signed in successfully, proceeding with video submission');
    // TODO: Implement actual video submission logic here
  };

  return (
    <>
      <Header showSubmitButton={showMap} />
      
      {/* Upload Section with Fade Out */}
      <div style={{
        opacity: showUpload ? 1 : 0,
        transform: showUpload ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.8s ease-out',
        display: showUpload ? 'flex' : 'none',
        flexDirection: 'column',
        gap: 106,
        padding: '74px 24px'
      }}>
        <h1 style={{ textAlign: 'center' }}>Itiner-ize Your Content</h1>
        <UploadDropzone onResults={handleResults} />
      </div>

      {/* Map Section */}
      {showMap && (
        <>
          <LocationSidebar 
            locations={results?.locations || []}
            onLocationClick={handleLocationClick}
            onLocationHover={setHoveredLocationIndex}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
          />
          
          <GoogleMap 
            locations={results?.locations || []}
            onLocationClick={handleLocationClick}
            isVisible={true}
            mapCenter={mapCenter}
            selectedLocationIndex={selectedLocation?.index}
            hoveredLocationIndex={hoveredLocationIndex}
          />

          {/* Submit Video Button */}
          <button
            onClick={handleSubmitVideo}
            disabled={isSubmitting}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '12px 24px',
              background: isSubmitting ? '#ccc' : 'white',
              color: isSubmitting ? '#666' : '#18204aff',
              border: '2px solid #18204aff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              zIndex: 25,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.background = '#18204aff';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.target.style.background = 'white';
                e.target.style.color = '#18204aff';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Video'}
          </button>

          {/* Add Location Button */}
          {videoFile && (
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
          )}

          {/* Play Full Video Button */}
          {videoFile && (
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
          )}
        </>
      )}

      {/* Video Player Modal - Edit Mode */}
      {selectedLocation && videoFile && !isAddingLocation && (
        <VideoPlayer
          videoFile={videoFile}
          startTime={selectedLocation.timeStartSec}
          endTime={selectedLocation.endTime}
          locationName={selectedLocation.name}
          onClose={() => setSelectedLocation(null)}
          location={selectedLocation}
          allLocations={results?.locations || []}
          onSave={handleLocationSave}
          onDelete={(index) => {
            removeLocation(index);
            setSelectedLocation(null);
          }}
          isAddMode={false}
        />
      )}

      {/* Video Player Modal - Add Mode */}
      {isAddingLocation && videoFile && (
        <VideoPlayer
          videoFile={videoFile}
          startTime={0}
          endTime={null}
          locationName="New Location"
          onClose={() => setIsAddingLocation(false)}
          location={null}
          allLocations={results?.locations || []}
          onSave={handleLocationAdd}
          isAddMode={true}
        />
      )}

      {/* Full Video Player Modal */}
      {showFullVideo && videoFile && (
        <FullVideoPlayer
          videoFile={videoFile}
          onClose={() => setShowFullVideo(false)}
        />
      )}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSubmit={handleSignInSuccess}
      />
    </>
  );
}

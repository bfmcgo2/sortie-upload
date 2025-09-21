"use client";
import { useState } from 'react';
import LocationModal from './LocationModal';

export default function UploadDropzone({ onResults }) {
  const [file, setFile] = useState(null);
  const [generalLocations, setGeneralLocations] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const addLocation = () => {
    setGeneralLocations([...generalLocations, '']);
  };

  const removeLocation = (index) => {
    if (generalLocations.length > 1) {
      setGeneralLocations(generalLocations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index, value) => {
    const updated = [...generalLocations];
    updated[index] = value;
    setGeneralLocations(updated);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setShowLocationModal(true);
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShowLocationModal(true);
    }
  };

  const handleLocationSubmit = (locations) => {
    setGeneralLocations(locations);
    setShowLocationModal(false);
    // Automatically start processing after location is set
    processVideo(locations);
  };

  const useTestData = () => {
    console.log('useTestData called');
    const testData = {
      generalLocations: ['Philadelphia, PA'],
      locations: [
        {
          name: 'Guildhouse Hotel',
          address: null,
          coordinates: { lat: 39.9481885, lng: -75.1626781 },
          timeStartSec: 9,
          timeEndSec: 13,
          mention: 'this national landmark slash hotel, also known as the Guildhouse Hotel.',
          context: "Being one of the oldest cities in America, there's a lot of history here, including at this national landmark slash hotel, also known as the Guildhouse Hotel.",
          locationName: '1307 Locust St, Philadelphia, PA 19107, USA',
          placeId: 'ChIJ3xF1jnHHxokRZJY02iCfMjg'
        },
        {
          name: 'Center City',
          address: null,
          coordinates: { lat: 39.9509036, lng: -75.1574567 },
          timeStartSec: 19,
          timeEndSec: 21,
          mention: 'between Popular Location Center City and Rittenhouse.',
          context: 'Conveniently enough, this hotel is centered right between Popular Location Center City and Rittenhouse.',
          locationName: 'Center City, Philadelphia, PA, USA',
          placeId: 'ChIJaej7Ni_GxokRW8D3PNHhNqQ'
        },
        {
          name: 'Rittenhouse',
          address: null,
          coordinates: { lat: 39.9484461, lng: -75.17212270000002 },
          timeStartSec: 21,
          timeEndSec: 23,
          mention: 'between Popular Location Center City and Rittenhouse.',
          context: 'Conveniently enough, this hotel is centered right between Popular Location Center City and Rittenhouse.',
          locationName: 'Rittenhouse, Philadelphia, PA 19103, USA',
          placeId: 'ChIJVXwAzjnGxokRRzt7GPXYphQ'
        },
        {
          name: 'Flavors',
          address: null,
          coordinates: { lat: 39.9525839, lng: -75.1652215 },
          timeStartSec: 27,
          timeEndSec: 32,
          mention: "Flavors not only had a self-pour wall, but they also had probably the cheesiest cheesesteak I've ever had in my life.",
          context: 'There are tons of food options, but when in Philly, you know you have to get a cheesesteak.',
          locationName: 'Philadelphia, PA, USA',
          placeId: 'ChIJ60u11Ni3xokRwVg-jNgU9Yk'
        },
        {
          name: 'Wonder Spaces',
          address: null,
          coordinates: { lat: 39.9522711, lng: -75.1581618 },
          timeStartSec: 32,
          timeEndSec: 36,
          mention: 'We wrapped up our short night at Wonder Spaces, which is a two-story interactive art space.',
          context: 'We wrapped up our short night at Wonder Spaces, which is a two-story interactive art space.',
          locationName: '27 N 11th St, Philadelphia, PA 19107, USA',
          placeId: 'ChIJKe6spD7HxokRzJYkomStdKk'
        },
        {
          name: 'Homegrown',
          address: null,
          coordinates: { lat: 39.8700276, lng: -75.0945983 },
          timeStartSec: 44,
          timeEndSec: 48,
          mention: 'this small family-owned cafe in South Philly, also known as Homegrown',
          context: 'Found at this small family-owned cafe in South Philly, also known as Homegrown, their signature Yobo was egg, cheese, potato, and choice of meat.',
          locationName: '363 W Browning Rd, Bellmawr, NJ 08031, USA',
          placeId: 'ChIJe6zos-TJxokR5jM-FrtFpYc'
        },
        {
          name: 'City Hall',
          address: null,
          coordinates: { lat: 39.9528, lng: -75.1634833 },
          timeStartSec: 60,
          timeEndSec: 65,
          mention: 'we walked through City Hall and found this pop-up retro roller rink open until the end of June.',
          context: 'Back in Center City, we walked through City Hall and found this pop-up retro roller rink open until the end of June.',
          locationName: '1400 John F Kennedy Blvd, Philadelphia, PA 19107, USA',
          placeId: 'ChIJyb-70KChxokR5YR1l-Nka5s'
        },
        {
          name: 'Reading Terminal Market',
          address: null,
          coordinates: { lat: 39.9531593, lng: -75.15909839999999 },
          timeStartSec: 65,
          timeEndSec: 68,
          mention: 'A few blocks away was Redding Terminal Market, but it was super hot and starting to get crowded.',
          context: "A few blocks away was Redding Terminal Market, but it was super hot and starting to get crowded, so we didn't stay here long, but definitely check it out because it's one of my favorite markets ever.",
          locationName: '1136 Arch St, Philadelphia, PA 19107, USA',
          placeId: 'ChIJCQH7WCnGxokRAWsd3AfQj80'
        },
        {
          name: 'Cherry Street Pier',
          address: null,
          coordinates: { lat: 39.9524997, lng: -75.13927919999999 },
          timeStartSec: 72,
          timeEndSec: 76,
          mention: 'we went to the Cherry Street Pier to check out some art from local artists.',
          context: 'Ending our trip on a cooler note, we went to the Cherry Street Pier to check out some art from local artists that also work within the space and relax in their free greenhouse area that overlooks the water.',
          locationName: '121 N Christopher Columbus Blvd, Philadelphia, PA 19106, USA',
          placeId: 'ChIJreKNFonIxokRPfXi7jRKom0'
        },
        {
          name: "Elfreth's Alley",
          address: null,
          coordinates: { lat: 39.95271779999999, lng: -75.14248189999999 },
          timeStartSec: 81,
          timeEndSec: 83,
          mention: 'take a stroll through Elthris Alley.',
          context: 'On your way out, take a stroll through Elthris Alley. One of the oldest inhabited streets in the U.S.',
          locationName: "126 Elfreth's Alley, Philadelphia, PA 19106, USA",
          placeId: 'ChIJn_0OoojIxokRli62b71uVCo'
        }
      ],
      debug: {
        segmentCount: 10,
        transcriptLength: 1500,
        locationsFound: 10,
        geocodedCount: 10
      }
    };

    // Use the video from public folder for testing
    console.log('Fetching test video...');
    fetch('/day_in_philly.mov')
      .then(response => {
        console.log('Fetch response:', response.status);
        return response.blob();
      })
      .then(blob => {
        console.log('Blob created, size:', blob.size);
        const testVideoFile = new File([blob], 'day_in_philly.mov', { type: 'video/quicktime' });
        console.log('Calling onResults with test data and video file');
        onResults?.(testData, testVideoFile);
      })
      .catch(error => {
        console.error('Failed to load test video:', error);
        // Fallback: just load the map without video functionality
        console.log('Using fallback - calling onResults with test data only');
        onResults?.(testData, null);
      });
  };

  const handleLocationCancel = () => {
    setShowLocationModal(false);
    setFile(null); // Clear the file if user cancels
  };

  async function processVideo(locations) {
    if (!file || !locations.length) return;
    
    console.log('=== FRONTEND DEBUG ===');
    console.log('Selected file:', file);
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size);
    console.log('Locations:', locations);
    
    setLoading(true); 
    setError(null);
    
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('generalLocations', JSON.stringify(locations));
      
      console.log('FormData created:', data);
      console.log('FormData entries:', [...data.entries()]);
      
      const res = await fetch('/api/process', { method: 'POST', body: data });
      
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      const json = await res.json();
      
      console.log('Response JSON:', json);
      
      if (!res.ok) throw new Error(json.error || 'Failed');
      onResults?.(json, file); // Pass the file along with results
    } catch (e) {
      console.error('Frontend error:', e);
      console.error('Error message:', e.message);
      console.error('Error stack:', e.stack);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const validLocations = generalLocations.filter(loc => loc.trim());

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `3px dashed ${isDragOver ? '#18204aff' : '#18204aff'}`,
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
            backgroundColor: '#f55c4a',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            width: '50%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120
          }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#18204aff',
            textAlign: 'center'
          }}>
            {loading ? 'Processing...' : (file ? file.name : 'Drop Video Here')}
          </div>
          
          {file && !loading && (
            <div style={{
              fontSize: 14,
              color: '#666',
              marginTop: 8,
              position: 'absolute',
              bottom: 20
            }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB • Click to change
            </div>
          )}
        </div>

        {/* Test Data Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={useTestData}
            style={{
              padding: '12px 24px',
              background: '#18204aff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            🧪 Use Test Data (Philadelphia)
          </button>
        </div>

        {error && (
          <div style={{ 
            color: '#ff4444', 
            textAlign: 'center', 
            padding: 12,
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            borderRadius: 6,
            border: '1px solid #ff4444',
            maxWidth: '50%',
            margin: '0 auto'
          }}>
            {error}
          </div>
        )}
      </div>

      <LocationModal 
        isOpen={showLocationModal}
        onClose={handleLocationCancel}
        onSubmit={handleLocationSubmit}
      />
    </>
  );
}

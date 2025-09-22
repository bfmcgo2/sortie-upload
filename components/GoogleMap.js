"use client";
import { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

function MapComponent({ locations, onLocationClick, mapCenter, selectedLocationIndex, hoveredLocationIndex }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
          const markersRef = useRef([]);


  useEffect(() => {
    if (!mapRef.current || !window.google) return;

            // Initialize map
            const mapInstance = new window.google.maps.Map(mapRef.current, {
              zoom: 12,
              center: { lat: 39.9526, lng: -75.1652 }, // Default to Philadelphia
              // Remove mapId to allow custom styles
              styles: [
                {
                  featureType: 'all',
                  elementType: 'geometry.fill',
                  stylers: [{ saturation: -40 }]
                }
              ],
      // Disable various controls and features
      mapTypeControl: false,        // Removes Map/Satellite toggle
      streetViewControl: false,     // Removes Street View pegman
      fullscreenControl: false,     // Removes fullscreen button
      zoomControl: true,            // Keep zoom controls
      scaleControl: false,          // Removes scale indicator
      rotateControl: false,         // Removes rotate control
      gestureHandling: 'greedy',    // Better touch/mouse handling
      clickableIcons: false,        // Disable clicking on POI icons
      keyboardShortcuts: false      // Disable keyboard shortcuts
    });

            setMap(mapInstance);
            
            // Set initial bounds to show all locations on first load
            if (locations?.length > 0) {
              const bounds = new window.google.maps.LatLngBounds();
              locations.forEach(location => {
                if (location.coordinates) {
                  bounds.extend(new window.google.maps.LatLng(
                    location.coordinates.lat,
                    location.coordinates.lng
                  ));
                }
              });
              mapInstance.fitBounds(bounds);
              
              // Ensure minimum zoom level
              const listener = window.google.maps.event.addListener(mapInstance, 'idle', () => {
                if (mapInstance.getZoom() > 15) mapInstance.setZoom(15);
                window.google.maps.event.removeListener(listener);
              });
            }
  }, []);

  // Handle map center changes
  useEffect(() => {
    if (!map || !mapCenter) return;
    
    // Don't offset the center - let the map positioning handle the sidebar
    const offsetCenter = {
      lat: mapCenter.lat,
      lng: mapCenter.lng
    };
    
    // Try different approaches to ensure the map moves
    try {
      // Method 1: Use setCenter instead of panTo
      map.setCenter(offsetCenter);
      map.setZoom(14);
      
      // Method 2: Force update after a small delay
      setTimeout(() => {
        map.setCenter(offsetCenter);
        map.setZoom(14);
      }, 50);
    } catch (error) {
      console.error('Error setting map center:', error);
    }
  }, [map, mapCenter]);

  // Create markers only when map changes (not when locations change)
  useEffect(() => {
    if (!map || !locations?.length) return;

            // Clear existing markers first
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];

            // Create new markers with SVG icons
            locations.forEach((location, index) => {
              if (!location.coordinates) return;

              // Use regular Marker (AdvancedMarkerElement requires mapId)
              const marker = new window.google.maps.Marker({
                position: {
                  lat: location.coordinates.lat,
                  lng: location.coordinates.lng
                },
                map: map,
                title: location.name,
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="15" cy="15" r="12" fill="#18204aff" stroke="white" stroke-width="3"/>
                      <text x="15" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${index + 1}</text>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(30, 30),
                  anchor: new window.google.maps.Point(15, 15)
                },
                animation: window.google.maps.Animation.DROP
              });

              // Add click listener
              const clickHandler = () => {
                onLocationClick?.(location, index);
                // No info window popup - just trigger the location click
              };

              marker.addListener('click', clickHandler);

              markersRef.current.push(marker);
    });

            // Only fit bounds on initial load, not when locations change
            // This prevents resetting the map view when video overlay closes
            // map.fitBounds() is now handled separately in the map initialization
          }, [map, locations, onLocationClick]); // Added dependencies back

  // Note: Marker styling is now handled via SVG icons, so no dynamic style updates needed

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  );
}

export default function GoogleMap({ locations, onLocationClick, isVisible, mapCenter, selectedLocationIndex, hoveredLocationIndex }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#ff4444',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderRadius: 12,
        border: '1px solid #ff4444'
      }}>
        Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment.
      </div>
    );
  }

          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 350, // Start after the sidebar (350px wide)
              right: 0,  // Extend to the right edge
              height: '100%',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s ease-out',
              zIndex: 10
            }}>
              <Wrapper apiKey={apiKey} libraries={['marker', 'places']} version="weekly">
                <MapComponent locations={locations} onLocationClick={onLocationClick} mapCenter={mapCenter} selectedLocationIndex={selectedLocationIndex} hoveredLocationIndex={hoveredLocationIndex} />
              </Wrapper>
    </div>
  );
}

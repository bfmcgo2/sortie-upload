"use client";
import { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

function MapComponent({ locations, onLocationClick, mapCenter, selectedLocationIndex, hoveredLocationIndex }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersRef = useRef([]);
  const markerElementsRef = useRef([]);


  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 39.9526, lng: -75.1652 }, // Default to Philadelphia
      mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
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

    // Only create markers if we don't have any yet
    if (markersRef.current.length > 0) return;

    // Create new markers using AdvancedMarkerElement
    locations.forEach((location, index) => {
      if (!location.coordinates) return;

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.style.cssText = `
        width: 30px;
        height: 30px;
        background: #18204aff;
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      `;
      markerElement.textContent = (index + 1).toString();

      // Use AdvancedMarkerElement if available, fallback to regular Marker
      let marker;
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: location.coordinates.lat,
            lng: location.coordinates.lng
          },
          map: map,
          title: location.name,
          content: markerElement
        });
      } else {
        // Fallback to regular marker
        marker = new window.google.maps.Marker({
          position: {
            lat: location.coordinates.lat,
            lng: location.coordinates.lng
          },
          map: map,
          title: location.name,
          animation: window.google.maps.Animation.DROP
        });
      }

      // Add click listener
      const clickHandler = () => {
        onLocationClick?.(location, index);
        // No info window popup - just trigger the location click
      };

      if (marker.addListener) {
        marker.addListener('click', clickHandler);
      } else if (markerElement) {
        markerElement.addEventListener('click', clickHandler);
      }

      markersRef.current.push(marker);
      markerElementsRef.current.push(markerElement);
    });

    // Only fit bounds on initial load, not when locations change
    // This prevents resetting the map view when video overlay closes
    // map.fitBounds() is now handled separately in the map initialization
  }, [map]); // Removed locations and onLocationClick from dependencies

  // Update marker styles when selection or hover changes
  useEffect(() => {
    if (!markerElementsRef.current.length) return;

    markerElementsRef.current.forEach((element, index) => {
      if (!element) return;
      
      const isSelected = selectedLocationIndex === index;
      const isHovered = hoveredLocationIndex === index;
      const isHighlighted = isSelected || isHovered;
      
      element.style.background = isHighlighted ? '#ffffff' : '#18204aff';
      element.style.border = `3px solid ${isHighlighted ? '#18204aff' : 'white'}`;
      element.style.color = isHighlighted ? '#18204aff' : 'white';
    });
  }, [selectedLocationIndex, hoveredLocationIndex]);

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

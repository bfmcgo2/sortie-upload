"use client";
import { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

function MapComponent({ locations, pins = [], onLocationClick, mapCenter, selectedLocationIndex, hoveredLocationIndex }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
          const markersRef = useRef([]);
          const markerElementsRef = useRef([]);
          const pinMarkersRef = useRef([]);
          const pinMarkerElementsRef = useRef([]);


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
            
            // Set initial bounds to show all locations and pins on first load with padding
            if ((locations?.length > 0 || pins?.length > 0)) {
              const bounds = new window.google.maps.LatLngBounds();
              
              // Add locations
              locations?.forEach(location => {
                if (location.coordinates) {
                  bounds.extend(new window.google.maps.LatLng(
                    location.coordinates.lat,
                    location.coordinates.lng
                  ));
                }
              });
              
              // Add pins
              pins?.forEach(pin => {
                if (pin.coordinates) {
                  bounds.extend(new window.google.maps.LatLng(
                    pin.coordinates.lat,
                    pin.coordinates.lng
                  ));
                }
              });
              
              // Add padding to bounds (80 pixels on all sides for better buffer)
              mapInstance.fitBounds(bounds, {
                top: 80,
                right: 80,
                bottom: 80,
                left: 80
              });
              
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

  // Create markers when map, locations, or pins change
  useEffect(() => {
    if (!map) return;

            // Clear existing location markers first
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            markerElementsRef.current = [];

            // Clear existing pin markers
            pinMarkersRef.current.forEach(marker => marker.setMap(null));
            pinMarkersRef.current = [];
            pinMarkerElementsRef.current = [];

            // Create bounds to fit all locations and pins
            const bounds = new window.google.maps.LatLngBounds();
            let hasValidCoordinates = false;

            // Create location markers using AdvancedMarkerElement
            locations?.forEach((location, index) => {
              if (!location.coordinates) return;
              
              // Add to bounds
              bounds.extend(new window.google.maps.LatLng(
                location.coordinates.lat,
                location.coordinates.lng
              ));
              hasValidCoordinates = true;

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
                z-index: 1;
                position: relative;
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

            // Create pin markers
            pins?.forEach((pin, index) => {
              if (!pin.coordinates) return;
              
              // Add to bounds
              bounds.extend(new window.google.maps.LatLng(
                pin.coordinates.lat,
                pin.coordinates.lng
              ));
              hasValidCoordinates = true;

              // Create marker element - use image if available, otherwise use pin emoji
              const pinElement = document.createElement('div');
              
              if (pin.pinImageUrl) {
                // Pin with custom image
                pinElement.style.cssText = `
                  width: 50px;
                  height: 50px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  cursor: pointer;
                  overflow: hidden;
                  background: white;
                `;
                const img = document.createElement('img');
                img.src = pin.pinImageUrl;
                img.style.cssText = `
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                `;
                pinElement.appendChild(img);
              } else {
                // Pin with emoji
                pinElement.style.cssText = `
                  width: 40px;
                  height: 40px;
                  background: #18204aff;
                  border: 3px solid white;
                  border-radius: 50%;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 20px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  transition: all 0.2s ease;
                `;
                pinElement.textContent = '📍';
              }

              // Use AdvancedMarkerElement if available, fallback to regular Marker
              let marker;
              if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                marker = new window.google.maps.marker.AdvancedMarkerElement({
                  position: {
                    lat: pin.coordinates.lat,
                    lng: pin.coordinates.lng
                  },
                  map: map,
                  title: pin.name,
                  content: pinElement
                });
              } else {
                marker = new window.google.maps.Marker({
                  position: {
                    lat: pin.coordinates.lat,
                    lng: pin.coordinates.lng
                  },
                  map: map,
                  title: pin.name,
                  animation: window.google.maps.Animation.DROP
                });
              }

              pinMarkersRef.current.push(marker);
              pinMarkerElementsRef.current.push(pinElement);
            });

            // Only fit bounds on initial load, not on every location change
            // This prevents the map from jumping when hovering over locations
            // The bounds fitting is handled in the initial map setup
          }, [map, locations, pins, onLocationClick]); // Added pins dependency

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
      
      // Bring hovered/selected markers to the front with higher z-index
      element.style.zIndex = isHighlighted ? '1000' : '1';
      
      // Also add a subtle scale effect for hovered markers
      element.style.transform = isHovered ? 'scale(1.2)' : 'scale(1)';
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

export default function GoogleMap({ locations, pins = [], onLocationClick, isVisible, mapCenter, selectedLocationIndex, hoveredLocationIndex }) {
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
                <MapComponent locations={locations} pins={pins} onLocationClick={onLocationClick} mapCenter={mapCenter} selectedLocationIndex={selectedLocationIndex} hoveredLocationIndex={hoveredLocationIndex} />
              </Wrapper>
    </div>
  );
}

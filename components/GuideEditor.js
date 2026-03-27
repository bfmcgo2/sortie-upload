"use client";
import { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';
import PinManager from './PinManager';

export default function GuideEditor({ user, guide = null, onSave, onCancel }) {
  const [name, setName] = useState(guide?.guide?.name || '');
  const [description, setDescription] = useState(guide?.guide?.description || '');
  const [companyId, setCompanyId] = useState(guide?.guide?.company_id || '');
  const [logoUrl, setLogoUrl] = useState(guide?.guide?.logo_url || '');
  const [isPublic, setIsPublic] = useState(guide?.guide?.is_public || false);
  const [isActive, setIsActive] = useState(guide?.guide?.is_active !== undefined ? guide?.guide?.is_active : true);
  const [selectedLocations, setSelectedLocations] = useState(
    guide?.locations?.map(loc => loc.id) || []
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [companyPin, setCompanyPin] = useState({
    name: guide?.guide?.company_pin_name || '',
    address: guide?.guide?.company_pin_address || '',
    coordinates: guide?.guide?.company_pin_coordinates || null,
    placeId: guide?.guide?.company_pin_place_id || null
  });
  const [geocoding, setGeocoding] = useState(false);
  const [pins, setPins] = useState(guide?.pins || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pins if editing existing guide
  useEffect(() => {
    if (guide?.guide?.id) {
      fetchPins();
    }
  }, [guide?.guide?.id]);

  const fetchPins = async () => {
    if (!guide?.guide?.id) return;

    try {
      const response = await fetch(`/api/guides/${guide.guide.id}/pins`);
      if (response.ok) {
        const data = await response.json();
        setPins(data.pins || []);
      }
    } catch (err) {
      console.error('Error fetching pins:', err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Guide name is required');
      return;
    }

    if (selectedLocations.length === 0 && pins.length === 0) {
      setError('Please select at least one location or add at least one pin');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const guideData = {
        name: name.trim(),
        description: description.trim() || null,
        company_id: companyId.trim() || null,
        logo_url: logoUrl.trim() || null,
        // Coordinates will be auto-calculated from locations on the server
        is_public: isPublic,
        is_active: isActive,
        location_ids: selectedLocations,
        company_pin: companyPin.name || companyPin.coordinates ? {
          name: companyPin.name.trim() || null,
          address: companyPin.address.trim() || null,
          coordinates: companyPin.coordinates,
          placeId: companyPin.placeId || null
        } : null
      };

      const url = guide 
        ? `/api/guides/${guide.guide.id}`
        : '/api/guides';

      const method = guide ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: {
            id: user.id,
            email: user.email
          },
          guideData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save guide');
      }

      onSave();
    } catch (err) {
      console.error('Error saving guide:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelect = (locationIds) => {
    setSelectedLocations(locationIds);
    setShowLocationPicker(false);
  };

  const handleRemoveLocation = (locationId) => {
    setSelectedLocations(selectedLocations.filter(id => id !== locationId));
  };

  const handleReorder = (fromIndex, toIndex) => {
    const newLocations = [...selectedLocations];
    const [removed] = newLocations.splice(fromIndex, 1);
    newLocations.splice(toIndex, 0, removed);
    setSelectedLocations(newLocations);
  };

  const handleGeocodeCompanyPin = async () => {
    if (!companyPin.address.trim()) {
      setError('Please enter an address');
      return;
    }

    try {
      setGeocoding(true);
      setError(null);

      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: companyPin.address.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to geocode address');
      }

      const data = await response.json();
      setCompanyPin({
        ...companyPin,
        coordinates: data.coordinates,
        placeId: data.placeId || null,
        address: data.formattedAddress || data.address
      });
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(err.message || 'Failed to geocode address');
    } finally {
      setGeocoding(false);
    }
  };

  const handleClearCompanyPin = () => {
    setCompanyPin({
      name: '',
      address: '',
      coordinates: null,
      placeId: null
    });
  };

  // Fetch selected location details for display
  const [selectedLocationDetails, setSelectedLocationDetails] = useState([]);


  // Load location details from guide data when editing, or fetch when locations change
  useEffect(() => {
    if (selectedLocations.length === 0) {
      setSelectedLocationDetails([]);
      return;
    }

    // If editing and guide has locations, use those directly (most reliable)
    if (guide?.locations && guide.locations.length > 0) {
      const details = selectedLocations
        .map(id => guide.locations.find(loc => loc.id === id))
        .filter(Boolean);
      
      // If we found all selected locations in guide data, use them
      if (details.length === selectedLocations.length) {
        setSelectedLocationDetails(details);
        return;
      }
      
      // If some are missing, try to fetch the missing ones
      const foundIds = new Set(details.map(d => d.id));
      const missingIds = selectedLocations.filter(id => !foundIds.has(id));
      
      if (missingIds.length > 0) {
        // Fetch missing locations
        const fetchMissing = async () => {
          try {
            const response = await fetch(
              `/api/locations/browse?limit=1000`
            );
            if (response.ok) {
              const data = await response.json();
              const missingDetails = missingIds
                .map(id => data.locations.find(loc => loc.id === id))
                .filter(Boolean);
              
              // Combine found and missing
              setSelectedLocationDetails([...details, ...missingDetails]);
            }
          } catch (err) {
            console.error('Error fetching missing location details:', err);
            // Still show what we have
            setSelectedLocationDetails(details);
          }
        };
        fetchMissing();
        return;
      }
    }

    // If not editing or guide data not available, fetch all location details
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `/api/locations/browse?limit=1000`
        );
        if (response.ok) {
          const data = await response.json();
          const details = selectedLocations
            .map(id => data.locations.find(loc => loc.id === id))
            .filter(Boolean);
          setSelectedLocationDetails(details);
        }
      } catch (err) {
        console.error('Error fetching location details:', err);
      }
    };

    fetchDetails();
  }, [selectedLocations, guide?.locations]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffc27e',
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            color: '#18204aff',
            margin: '0 0 20px 0',
            fontSize: '32px',
            fontWeight: '600'
          }}>
            {guide ? 'Edit Guide' : 'Create New Guide'}
          </h1>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Guide Metadata Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Guide Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Philadelphia Guide"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this guide covers..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: "'Inter', sans-serif",
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#18204aff'
                }}>
                  Company ID (optional)
                </label>
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="e.g., 2345023"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#18204aff'
                }}>
                  Logo URL (optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/companies/logo.png"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Company Pin Geocoder */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f7ff',
              border: '2px solid #4caf50',
              borderRadius: '8px'
            }}>
              <h3 style={{
                color: '#18204aff',
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Company Pin (optional)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#18204aff'
                  }}>
                    Company Pin Name
                  </label>
                  <input
                    type="text"
                    value={companyPin.name}
                    onChange={(e) => setCompanyPin({ ...companyPin, name: e.target.value })}
                    placeholder="e.g., Company Headquarters"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: "'Inter', sans-serif"
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#18204aff'
                  }}>
                    Address
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={companyPin.address}
                      onChange={(e) => setCompanyPin({ ...companyPin, address: e.target.value })}
                      placeholder="e.g., 123 Main St, Philadelphia, PA"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    />
                    <button
                      onClick={handleGeocodeCompanyPin}
                      disabled={geocoding || !companyPin.address.trim()}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: geocoding || !companyPin.address.trim() ? '#ccc' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: geocoding || !companyPin.address.trim() ? 'not-allowed' : 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {geocoding ? 'Geocoding...' : '📍 Geocode'}
                    </button>
                    {companyPin.coordinates && (
                      <button
                        onClick={handleClearCompanyPin}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif"
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {companyPin.coordinates && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#d4edda',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#155724'
                    }}>
                      ✓ Coordinates: {companyPin.coordinates.lat.toFixed(6)}, {companyPin.coordinates.lng.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            </div>


            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#18204aff' }}>Public Guide</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#18204aff' }}>Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Selected Locations */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              color: '#18204aff',
              margin: 0,
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Selected Locations ({selectedLocations.length})
            </h2>
            <button
              onClick={() => setShowLocationPicker(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#18204aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {selectedLocations.length === 0 ? '➕ Add Locations' : '✏️ Edit Locations'}
            </button>
          </div>

          {selectedLocations.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#999',
              border: '2px dashed #ddd',
              borderRadius: '8px'
            }}>
              No locations selected. Click "Add Locations" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedLocationDetails.map((location, index) => (
                <div
                  key={location.id}
                  style={{
                    padding: '16px',
                    border: '2px solid #eee',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#18204aff', marginBottom: '4px' }}>
                      {location.name}
                    </div>
                    {location.locationName && (
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {location.locationName}
                      </div>
                    )}
                    {location.id && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', fontFamily: 'monospace' }}>
                        ID: {location.id}
                      </div>
                    )}
                    {location.videoTitle && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        From: {location.videoTitle}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveLocation(location.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pins Management */}
        {guide?.guide?.id && (
          <PinManager
            pins={pins}
            guideId={guide.guide.id}
            user={user}
            onPinsChange={fetchPins}
          />
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#18204aff',
              border: '2px solid #18204aff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              opacity: saving ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: saving ? '#ccc' : '#18204aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {saving ? 'Saving...' : 'Save Guide'}
          </button>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          selectedLocationIds={selectedLocations}
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}


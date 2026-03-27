"use client";
import { useState } from 'react';

export default function PinManager({ pins = [], guideId, user, onPinsChange }) {
  const [showAddPin, setShowAddPin] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [pinLinkUrl, setPinLinkUrl] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [placeId, setPlaceId] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleGeocode = async () => {
    if (!address.trim()) {
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
        body: JSON.stringify({ address: address.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to geocode address');
      }

      const data = await response.json();
      setCoordinates(data.coordinates);
      setPlaceId(data.placeId || null);
      
      // Update address with formatted address from geocoding
      if (data.formattedAddress) {
        setAddress(data.formattedAddress);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(err.message || 'Failed to geocode address');
    } finally {
      setGeocoding(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid image type. Please use JPG, PNG, WebP, or GIF.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image too large. Please use an image under 5MB.');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Pin name is required');
      return;
    }

    if (!coordinates) {
      setError('Please geocode the address to get coordinates');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const formData = new FormData();
      formData.append('user', JSON.stringify(user));
      formData.append('pinData', JSON.stringify({
        name: name.trim(),
        address: address.trim() || null,
        coordinates: coordinates,
        placeId: placeId,
        description: description.trim() || null,
        pinLinkUrl: pinLinkUrl.trim() || null
      }));

      if (imageFile) {
        formData.append('imageFile', imageFile);
      }

      const url = editingPin
        ? `/api/guides/${guideId}/pins/${editingPin.id}`
        : `/api/guides/${guideId}/pins`;

      const method = editingPin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save pin');
      }

      // Reset form
      setName('');
      setAddress('');
      setDescription('');
      setPinLinkUrl('');
      setCoordinates(null);
      setPlaceId(null);
      setImageFile(null);
      setImagePreview(null);
      setShowAddPin(false);
      setEditingPin(null);

      // Refresh pins
      onPinsChange?.();
    } catch (err) {
      console.error('Save pin error:', err);
      setError(err.message || 'Failed to save pin');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pin) => {
    setEditingPin(pin);
    setName(pin.name);
    setAddress(pin.address || '');
    setDescription(pin.description || '');
    setPinLinkUrl(pin.pinLinkUrl || '');
    setCoordinates(pin.coordinates);
    setPlaceId(pin.placeId || null);
    setImagePreview(pin.pinImageUrl || null);
    setImageFile(null);
    setShowAddPin(true);
  };

  const handleDelete = async (pinId) => {
    if (!confirm('Are you sure you want to delete this pin?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/guides/${guideId}/pins/${pinId}?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete pin');
      }

      // Refresh pins
      onPinsChange?.();
    } catch (err) {
      console.error('Delete pin error:', err);
      alert(`Failed to delete pin: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setName('');
    setAddress('');
    setDescription('');
    setPinLinkUrl('');
    setCoordinates(null);
    setPlaceId(null);
    setImageFile(null);
    setImagePreview(null);
    setShowAddPin(false);
    setEditingPin(null);
    setError(null);
  };

  return (
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
          Pins ({pins.length})
        </h2>
        {!showAddPin && (
          <button
            onClick={() => setShowAddPin(true)}
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
            ➕ Add Pin
          </button>
        )}
      </div>

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

      {showAddPin && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            color: '#18204aff',
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {editingPin ? 'Edit Pin' : 'Add New Pin'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Pin Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Reading Terminal Market"
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
                Link URL (optional)
              </label>
              <input
                type="url"
                value={pinLinkUrl}
                onChange={(e) => setPinLinkUrl(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
              <div style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#777',
                fontFamily: "'Inter', sans-serif"
              }}>
                Mobile can open this link when the pin is tapped.
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Address *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 51 N 12th St, Philadelphia, PA"
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
                  onClick={handleGeocode}
                  disabled={geocoding || !address.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: geocoding || !address.trim() ? '#ccc' : '#18204aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: geocoding || !address.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: 'nowrap'
                  }}
                >
                  {geocoding ? 'Geocoding...' : '📍 Geocode'}
                </button>
              </div>
              {coordinates && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#d4edda',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#155724'
                }}>
                  ✓ Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this pin..."
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

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Pin Image (optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
              {imagePreview && (
                <div style={{
                  marginTop: '12px',
                  width: '200px',
                  height: '200px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #ddd'
                }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
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
                disabled={saving || !name.trim() || !coordinates}
                style={{
                  padding: '12px 24px',
                  backgroundColor: saving || !name.trim() || !coordinates ? '#ccc' : '#18204aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: saving || !name.trim() || !coordinates ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {saving ? 'Saving...' : editingPin ? 'Update Pin' : 'Add Pin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pins.length === 0 && !showAddPin ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#999',
          border: '2px dashed #ddd',
          borderRadius: '8px'
        }}>
          No pins yet. Click "Add Pin" to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pins.map((pin) => (
            <div
              key={pin.id}
              style={{
                padding: '16px',
                border: '2px solid #eee',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                {pin.pinImageUrl && (
                  <img
                    src={pin.pinImageUrl}
                    alt={pin.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid #eee'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#18204aff', marginBottom: '4px' }}>
                    📍 {pin.name}
                  </div>
                  {pin.address && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {pin.address}
                    </div>
                  )}
                  {pin.description && (
                    <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                      {pin.description}
                    </div>
                  )}
                  {pin.pinLinkUrl && (
                    <a
                      href={pin.pinLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        fontSize: '13px',
                        color: '#18204aff',
                        textDecoration: 'underline'
                      }}
                    >
                      Open link
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEdit(pin)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#18204aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pin.id)}
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
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


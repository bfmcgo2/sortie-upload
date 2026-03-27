"use client";
import { useState, useEffect } from 'react';

export default function AddToGuideModal({ locationId, onClose, userId, userEmail }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideIds, setSelectedGuideIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchGuides();
    }
  }, [userId]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guides?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch guides');
      }
      
      const data = await response.json();
      setGuides(data.guides || []);
    } catch (err) {
      console.error('Error fetching guides:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGuide = (guideId) => {
    const newSelected = new Set(selectedGuideIds);
    if (newSelected.has(guideId)) {
      newSelected.delete(guideId);
    } else {
      newSelected.add(guideId);
    }
    setSelectedGuideIds(newSelected);
  };

  const handleSave = async () => {
    if (selectedGuideIds.size === 0) {
      setError('Please select at least one guide');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Add location to each selected guide
      const promises = Array.from(selectedGuideIds).map(guideId =>
        fetch(`/api/guides/${guideId}/locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user: {
              id: userId,
              email: userEmail
            },
            location_ids: [locationId]
          })
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        throw new Error(`Failed to add to ${failed.length} guide(s)`);
      }

      onClose(true); // Pass true to indicate success
    } catch (err) {
      console.error('Error adding location to guides:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose(false);
      }
    }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            Add to Guide
          </h2>
          <button
            onClick={() => onClose(false)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading guides...
          </div>
        ) : guides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ marginBottom: '20px' }}>You don't have any guides yet.</p>
            <button
              onClick={() => {
                onClose(false);
                window.location.href = '/guides/new';
              }}
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
              Create Guide
            </button>
          </div>
        ) : (
          <>
            <p style={{
              color: '#666',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              Select one or more guides to add this location to:
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {guides.map((guide) => (
                <label
                  key={guide.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    border: '2px solid',
                    borderColor: selectedGuideIds.has(guide.id) ? '#18204aff' : '#eee',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedGuideIds.has(guide.id) ? '#f0f4ff' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGuideIds.has(guide.id)}
                    onChange={() => handleToggleGuide(guide.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#18204aff',
                      marginBottom: '4px'
                    }}>
                      {guide.name}
                    </div>
                    {guide.description && (
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {guide.description}
                      </div>
                    )}
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      marginTop: '4px',
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <span>{guide.is_public ? '🌐 Public' : '🔒 Private'}</span>
                      <span>{guide.is_active ? '✓ Active' : '⏸ Inactive'}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '2px solid #eee'
            }}>
              <button
                onClick={() => onClose(false)}
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
                disabled={saving || selectedGuideIds.size === 0}
                style={{
                  padding: '12px 24px',
                  backgroundColor: saving || selectedGuideIds.size === 0 ? '#ccc' : '#18204aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: saving || selectedGuideIds.size === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {saving ? 'Adding...' : `Add to ${selectedGuideIds.size} Guide${selectedGuideIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


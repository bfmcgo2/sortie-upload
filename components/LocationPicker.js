"use client";
import { useState, useEffect } from 'react';

export default function LocationPicker({ selectedLocationIds = [], onSelect, onClose }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set(selectedLocationIds));
  const [filters, setFilters] = useState({
    city: '',
    videoId: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchLocations();
  }, [filters, page]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      });

      if (filters.city) params.append('city', filters.city);
      if (filters.videoId) params.append('videoId', filters.videoId);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/locations/browse?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      setLocations(data.locations || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLocation = (locationId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
    } else {
      newSelected.add(locationId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === locations.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set([...selectedIds, ...locations.map(l => l.id)]);
      setSelectedIds(allIds);
    }
  };

  const handleApply = () => {
    onSelect(Array.from(selectedIds));
  };

  const handleClearFilters = () => {
    setFilters({ city: '', videoId: '', search: '' });
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

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
        onClose();
      }
    }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
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
            Select Locations ({selectedIds.size} selected)
          </h2>
          <button
            onClick={onClose}
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

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Search Location Name
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                placeholder="Search locations..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#18204aff'
              }}>
                Filter by City
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => {
                  setFilters({ ...filters, city: e.target.value });
                  setPage(1);
                }}
                placeholder="e.g., Philadelphia, PA"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>
          </div>

          <button
            onClick={handleClearFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#18204aff',
              border: '2px solid #18204aff',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              alignSelf: 'flex-start'
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Select All */}
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handleSelectAll}
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
            {selectedIds.size === locations.length && locations.length > 0
              ? 'Deselect All'
              : 'Select All on Page'
            }
          </button>
        </div>

        {/* Locations List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading locations...
          </div>
        ) : error ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c33'
          }}>
            Error: {error}
          </div>
        ) : locations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            No locations found. Try adjusting your filters.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '400px',
            overflowY: 'auto',
            marginBottom: '20px'
          }}>
            {locations.map((location) => (
              <label
                key={location.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: '2px solid',
                  borderColor: selectedIds.has(location.id) ? '#18204aff' : '#eee',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedIds.has(location.id) ? '#f0f4ff' : 'white',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(location.id)}
                  onChange={() => handleToggleLocation(location.id)}
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
                    {location.name}
                  </div>
                  {location.locationName && (
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>
                      {location.locationName}
                    </div>
                  )}
                  {location.videoTitle && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      From: {location.videoTitle}
                    </div>
                  )}
                  {location.videoGeneralLocations && location.videoGeneralLocations.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                      {location.videoGeneralLocations.join(', ')}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: page === 1 ? '#ccc' : '#18204aff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              ← Previous
            </button>
            <span style={{ color: '#666', fontSize: '14px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 16px',
                backgroundColor: page === totalPages ? '#ccc' : '#18204aff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '2px solid #eee'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#18204aff',
              border: '2px solid #18204aff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
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
            Apply ({selectedIds.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}


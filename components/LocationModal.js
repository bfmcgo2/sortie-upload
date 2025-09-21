"use client";
import { useState } from 'react';

export default function LocationModal({ isOpen, onClose, onSubmit }) {
  const [generalLocations, setGeneralLocations] = useState(['']);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const validLocations = generalLocations.filter(loc => loc.trim());
    if (validLocations.length > 0) {
      onSubmit(validLocations);
      setGeneralLocations(['']); // Reset for next time
    }
  };

  const validLocations = generalLocations.filter(loc => loc.trim());

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
      <div style={{
        backgroundColor: '#ffc27e',
        padding: 40,
        borderRadius: 12,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: '#18204aff',
            margin: 0,
            padding: 0,
            textAlign: 'center',
            lineHeight: 1.2
          }}>
            In what city, state, province, territory did this video take place?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {generalLocations.map((location, index) => (
              <div key={index} style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => updateLocation(index, e.target.value)}
                  placeholder="e.g. Philadelphia, PA, USA"
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    borderRadius: 6,
                    border: '2px solid #18204aff',
                    fontSize: 16,
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none'
                  }}
                  required={index === 0}
                  autoFocus={index === 0}
                />
                {generalLocations.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeLocation(index)}
                    style={{ 
                      padding: '8px 12px', 
                      background: '#ff4444', 
                      color: 'white', 
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 16
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={addLocation}
              style={{ 
                padding: '8px 16px', 
                background: '#18204aff', 
                color: 'white', 
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                alignSelf: 'flex-start'
              }}
            >
              + Add Another Location
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#18204aff',
                border: `2px solid #18204aff`,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Cancel
            </button>
            
            <button 
              type="submit"
              disabled={!validLocations.length}
              style={{
                padding: '12px 24px',
                background: !validLocations.length ? '#ccc' : '#18204aff',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: !validLocations.length ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

export default function LocationSidebar({ locations, onLocationClick, onLocationHover, selectedLocationIndex, hoveredLocationIndex }) {
  const formatTime = (sec) => {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [h, m, s].map((n) => String(n).padStart(2, '0'));
    return parts.join(':');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: 'rgba(255, 194, 126, 0.95)', // Orange background with slight transparency
      backdropFilter: 'blur(10px)',
      borderRight: '2px solid #18204aff',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #18204aff',
        backgroundColor: 'rgba(24, 32, 74, 0.1)'
      }}>
        <h2 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '24px',
          fontWeight: '600',
          color: '#18204aff',
          margin: 0,
          textAlign: 'center'
        }}>
          Locations
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          color: '#18204aff',
          margin: '8px 0 0 0',
          textAlign: 'center',
          opacity: 0.8
        }}>
          {locations.length} stops found
        </p>
      </div>

      {/* Scrollable Location List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {locations.map((location, index) => (
          <div
            key={index}
            onClick={() => onLocationClick?.(location, index)}
            style={{
              backgroundColor: '#fff',
              border: '2px solid #18204aff',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => onLocationHover?.(index)}
            onMouseLeave={() => onLocationHover?.(null)}
          >
            {/* Pin Number */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                backgroundColor: (selectedLocationIndex === index || hoveredLocationIndex === index) ? '#ffffff' : '#18204aff',
                color: (selectedLocationIndex === index || hoveredLocationIndex === index) ? '#18204aff' : 'white',
                border: (selectedLocationIndex === index || hoveredLocationIndex === index) ? '2px solid #18204aff' : 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                marginRight: '12px',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.2s ease'
              }}>
                {index + 1}
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#666',
                fontFamily: "'Inter', sans-serif"
              }}>
                {formatTime(location.timeStartSec)} - {formatTime(location.timeEndSec)}
              </div>
            </div>

            {/* Location Name */}
            <h3 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '18px',
              fontWeight: '600',
              color: '#18204aff',
              margin: '0 0 8px 0',
              lineHeight: 1.2
            }}>
              {location.name}
            </h3>

            {/* Address */}
            {location.locationName && (
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: '#666',
                margin: '0 0 8px 0',
                lineHeight: 1.3
              }}>
                📍 {location.locationName}
              </p>
            )}

            {/* Mention Preview */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: '#888',
              margin: 0,
              lineHeight: 1.4,
              fontStyle: 'italic'
            }}>
              "{location.mention.length > 80 ? location.mention.substring(0, 80) + '...' : location.mention}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

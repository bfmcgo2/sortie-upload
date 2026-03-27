# Sortie Mobile App - Integration Explainer

## Overview

This document explains how to integrate with the Sortie desktop app's guide system for the mobile web app. Guides are database-driven collections of video locations that can be displayed on a map with interactive video playback.

---

## Quick Start

### 1. Fetch a Guide

```typescript
// Fetch guide by ID (public guides don't require auth)
const response = await fetch(
  `https://your-desktop-app.com/api/guides/${guideId}?public=true`
);

const { guide, locations, pins } = await response.json();
```

### 2. Display Guide

- **Guide Info**: Name, description, logo
- **Map**: Show all locations and pins on a map
- **Location List**: Display locations with video playback
- **Company Pin**: Optional company location (if present)

---

## API Endpoints

### Get Guide by ID

```
GET /api/guides/[guide-id]?public=true
```

**For authenticated users (optional):**
```
GET /api/guides/[guide-id]?userId=[user-id]&userEmail=[email]
```

**Response:**
```json
{
  "guide": {
    "id": "uuid",
    "name": "Philadelphia Guide",
    "description": "Explore the best of Philly",
    "company_id": "optional-company-id",
    "logo_url": "/companies/logo.png",
    "coordinates": { "lat": 39.9526, "lng": -75.1652 },
    "is_active": true,
    "is_public": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z",
    "company_pin_name": "Company Headquarters",
    "company_pin_address": "123 Main St, Philadelphia, PA",
    "company_pin_coordinates": { "lat": 39.9533, "lng": -75.1589 },
    "company_pin_place_id": "ChIJ..."
  },
  "locations": [
    {
      "id": "location-uuid",
      "name": "Reading Terminal Market",
      "locationName": "51 N 12th St, Philadelphia, PA 19107",
      "coordinates": { "lat": 39.9533, "lng": -75.1589 },
      "placeId": "ChIJ...",
      "timeStartSec": 45.2,
      "timeEndSec": 120.5,
      "mention": "Historic market with great food",
      "context": null,
      "videoId": "video-uuid",
      "videoUrl": "https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/user-id/video.mp4"
    }
  ],
  "pins": [
    {
      "id": "pin-uuid",
      "name": "Landmark",
      "address": "456 Market St",
      "coordinates": { "lat": 39.95, "lng": -75.16 },
      "placeId": "ChIJ...",
      "description": "Optional description",
      "pinImageUrl": "https://...",
      "displayOrder": 0
    }
  ]
}
```

### Get Public Guides

```
GET /api/guides?public=true
```

Returns a list of all public guides.

---

## Data Structure

### Guide Object

```typescript
interface Guide {
  id: string;
  name: string;
  description?: string | null;
  company_id?: string | null;
  logo_url?: string | null;
  coordinates?: { lat: number; lng: number } | null; // Map center
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  
  // Company Pin (optional - all fields can be null)
  company_pin_name?: string | null;
  company_pin_address?: string | null;
  company_pin_coordinates?: { lat: number; lng: number } | null;
  company_pin_place_id?: string | null;
}
```

### Location Object (Video-based)

```typescript
interface GuideLocation {
  id: string;
  name: string;
  locationName?: string; // Full formatted address
  address?: string | null;
  coordinates: { lat: number; lng: number };
  placeId?: string; // Google Place ID
  timeStartSec: number; // Video timestamp start
  timeEndSec?: number | null; // Video timestamp end
  mention?: string | null; // Text mentioning this location
  context?: string | null; // Surrounding context
  videoId: string; // Associated video ID
  videoUrl: string | null; // Video URL for playback
}
```

### Pin Object (Non-video)

```typescript
interface GuidePin {
  id: string;
  name: string;
  address?: string | null;
  coordinates: { lat: number; lng: number };
  placeId?: string | null;
  description?: string | null;
  pinImageUrl?: string | null;
  displayOrder: number;
}
```

---

## Key Concepts

### 1. Locations vs Pins vs Company Pin

- **Locations**: Video-based locations with timestamps and video playback
- **Pins**: Custom markers without videos (landmarks, businesses, etc.)
- **Company Pin**: A single special pin stored on the guide (optional)

### 2. Company Pin

The company pin is a special location that:
- Is stored directly on the guide object (not in the locations array)
- Doesn't have video playback
- Is optional (all fields can be `null`)
- Should be displayed separately or at the top of the location list

**Check if guide has company pin:**
```typescript
const hasCompanyPin = guide.company_pin_name && guide.company_pin_coordinates;
```

### 3. Video Playback

Locations have `videoUrl` and `timeStartSec`/`timeEndSec` for video playback:
- `videoUrl`: Direct URL to video file
- `timeStartSec`: Start time in seconds
- `timeEndSec`: End time in seconds (null if to end of video)

---

## Implementation Guide

### Step 1: Fetch Guide Data

```typescript
async function fetchGuide(guideId: string): Promise<GuideWithLocations> {
  const response = await fetch(
    `https://your-desktop-app.com/api/guides/${guideId}?public=true`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch guide: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Step 2: Display Company Pin (if present)

```typescript
function CompanyPinCard({ guide }: { guide: Guide }) {
  if (!guide.company_pin_name || !guide.company_pin_coordinates) {
    return null;
  }
  
  return (
    <div className="company-pin-card">
      <div className="badge">🏢 COMPANY PIN</div>
      <h3>{guide.company_pin_name}</h3>
      {guide.company_pin_address && (
        <p>{guide.company_pin_address}</p>
      )}
      <a 
        href={getCompanyPinUrl(guide)}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Google Maps
      </a>
    </div>
  );
}

function getCompanyPinUrl(guide: Guide): string {
  if (guide.company_pin_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${guide.company_pin_place_id}`;
  }
  
  if (guide.company_pin_coordinates) {
    const { lat, lng } = guide.company_pin_coordinates;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  
  if (guide.company_pin_address) {
    const query = encodeURIComponent(guide.company_pin_address);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  
  return '';
}
```

### Step 3: Display Video Locations

```typescript
function LocationCard({ location }: { location: GuideLocation }) {
  return (
    <div className="location-card">
      <h3>{location.name}</h3>
      {location.locationName && <p>{location.locationName}</p>}
      {location.mention && (
        <p className="mention">"{location.mention}"</p>
      )}
      
      {/* Video playback */}
      {location.videoUrl && (
        <VideoPlayer
          url={location.videoUrl}
          startTime={location.timeStartSec}
          endTime={location.timeEndSec}
        />
      )}
      
      {/* Google Maps link */}
      <a href={getLocationUrl(location)} target="_blank">
        View on Google Maps
      </a>
    </div>
  );
}

function getLocationUrl(location: GuideLocation): string {
  if (location.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
  }
  
  if (location.coordinates) {
    const { lat, lng } = location.coordinates;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  
  if (location.locationName) {
    const query = encodeURIComponent(location.locationName);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  
  return '';
}
```

### Step 4: Display Pins

```typescript
function PinCard({ pin }: { pin: GuidePin }) {
  return (
    <div className="pin-card">
      {pin.pinImageUrl && (
        <img src={pin.pinImageUrl} alt={pin.name} />
      )}
      <h3>{pin.name}</h3>
      {pin.address && <p>{pin.address}</p>}
      {pin.description && <p>{pin.description}</p>}
      <a href={getPinUrl(pin)} target="_blank">
        View on Google Maps
      </a>
    </div>
  );
}
```

### Step 5: Map Display

```typescript
function GuideMap({ guide, locations, pins }: GuideMapProps) {
  const mapCenter = guide.coordinates || calculateCenter(locations, pins);
  
  return (
    <Map center={mapCenter}>
      {/* Company Pin */}
      {guide.company_pin_coordinates && (
        <Marker
          position={guide.company_pin_coordinates}
          icon={companyPinIcon}
          title={guide.company_pin_name}
        />
      )}
      
      {/* Video Locations */}
      {locations.map(location => (
        <Marker
          key={location.id}
          position={location.coordinates}
          icon={locationIcon}
          title={location.name}
        />
      ))}
      
      {/* Pins */}
      {pins.map(pin => (
        <Marker
          key={pin.id}
          position={pin.coordinates}
          icon={pinIcon}
          title={pin.name}
        />
      ))}
    </Map>
  );
}
```

---

## Visual Design Recommendations

### Company Pin
- **Color**: Green (#4caf50)
- **Icon**: Building/company icon (🏢)
- **Badge**: "COMPANY PIN" label
- **No video controls**: Don't show video playback

### Video Locations
- **Color**: Blue/primary color
- **Icon**: Video/play icon (▶️)
- **Show video controls**: Include video playback
- **Show timestamps**: Display timeStartSec/timeEndSec

### Pins
- **Color**: Orange/secondary color
- **Icon**: Pin/marker icon (📍)
- **Show image**: Display pinImageUrl if available
- **No video controls**: Don't show video playback

---

## Error Handling

```typescript
try {
  const guideData = await fetchGuide(guideId);
  // Display guide
} catch (error) {
  if (error.status === 404) {
    // Guide not found
  } else if (error.status === 403) {
    // Unauthorized (private guide)
  } else {
    // Other error
  }
}
```

---

## Testing Checklist

- [ ] Fetch public guide successfully
- [ ] Display guide name and description
- [ ] Show company pin (if present) with correct styling
- [ ] Display all video locations
- [ ] Video playback works for locations
- [ ] Display all pins
- [ ] Map shows all markers correctly
- [ ] Google Maps links work for all location types
- [ ] Guides without company pin work correctly
- [ ] Guides with no locations/pins handle gracefully

---

## Common Issues

### Issue: Company pin not showing
**Solution**: Check `guide.company_pin_name` and `guide.company_pin_coordinates` are not null

### Issue: Video not playing
**Solution**: 
- Verify `videoUrl` is a valid URL
- Check CORS settings on video storage
- Ensure video format is supported by browser

### Issue: Map not centering
**Solution**: Use `guide.coordinates` or calculate center from locations/pins

### Issue: Locations missing
**Solution**: Verify API response includes all locations (check `locations` array length)

---

## Example Complete Implementation

```typescript
import { useState, useEffect } from 'react';

export default function GuideView({ guideId }: { guideId: string }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [locations, setLocations] = useState<GuideLocation[]>([]);
  const [pins, setPins] = useState<GuidePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGuideData();
  }, [guideId]);

  const fetchGuideData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://your-desktop-app.com/api/guides/${guideId}?public=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch guide');
      }
      
      const data = await response.json();
      setGuide(data.guide);
      setLocations(data.locations || []);
      setPins(data.pins || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading guide...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!guide) return <div>Guide not found</div>;

  return (
    <div className="guide-view">
      <h1>{guide.name}</h1>
      {guide.description && <p>{guide.description}</p>}
      
      {/* Company Pin */}
      {guide.company_pin_name && guide.company_pin_coordinates && (
        <CompanyPinCard guide={guide} />
      )}
      
      {/* Map */}
      <GuideMap guide={guide} locations={locations} pins={pins} />
      
      {/* Location List */}
      <div className="locations-list">
        {locations.map(location => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>
      
      {/* Pins List */}
      {pins.length > 0 && (
        <div className="pins-list">
          {pins.map(pin => (
            <PinCard key={pin.id} pin={pin} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Support

For questions or issues:
1. Check API response structure matches this document
2. Verify guide is marked as `is_public: true`
3. Test with a known working guide ID
4. Check browser console for errors

---

## Next Steps

1. **Update TypeScript types** with the new `Guide` interface
2. **Implement company pin display** with visual differentiation
3. **Test with real guide data** from the desktop app
4. **Add error handling** for edge cases
5. **Style components** according to design recommendations

Good luck with the integration! 🚀

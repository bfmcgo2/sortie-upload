# Company Pins Feature - Mobile App Update

## Overview

Guides now support **Company Pins** - custom locations added via geocoding search that are not tied to videos. These appear in the locations array alongside video-based locations but should be visually differentiated.

---
f
## API Response Changes

### Updated Location Object

The location object in the API response now includes an optional `isCompanyPin` field:

```json
{
  "locations": [
    {
      "id": "location-uuid",
      "name": "Company Headquarters",
      "address": null,
      "locationName": "123 Main St, Philadelphia, PA 19107",
      "coordinates": { "lat": 39.9533, "lng": -75.1589 },
      "placeId": "ChIJ...",
      "timeStartSec": 0,
      "timeEndSec": null,
      "mention": null,
      "context": null,
      "videoId": "video-uuid-or-null",
      "videoUrl": null,
      "isCompanyPin": true
    },
    {
      "id": "location-uuid-2",
      "name": "Reading Terminal Market",
      "locationName": "51 N 12th St, Philadelphia, PA 19107",
      "coordinates": { "lat": 39.9533, "lng": -75.1589 },
      "placeId": "ChIJ...",
      "timeStartSec": 45.2,
      "timeEndSec": 120.5,
      "mention": "Historic market with great food",
      "context": null,
      "videoId": "video-uuid",
      "videoUrl": "https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/user-id/video.mp4",
      "isCompanyPin": false
    }
  ]
}
```

---

## Identifying Company Pins

### Method 1: Use the `isCompanyPin` field (Recommended)
```typescript
if (location.isCompanyPin === true) {
  // This is a company pin
}
```

### Method 2: Heuristic Detection (Fallback)
If `isCompanyPin` is not present, you can identify company pins by:
- `timeStartSec === 0`
- `mention === null` or empty
- `context === null` or empty
- `videoUrl === null` (usually)

```typescript
const isCompanyPin = location.timeStartSec === 0 && 
                     !location.mention && 
                     !location.context;
```

---

## Display Recommendations

### Visual Differentiation

Company pins should be visually distinct from video-based locations:

1. **Badge/Indicator**: Show a "COMPANY PIN" or "📍" badge
2. **Color Scheme**: Use a different color (e.g., green) to distinguish from video locations
3. **Icon**: Use a different icon (e.g., building/pin icon vs. video icon)

### UI Behavior

1. **No Video Playback**: Company pins don't have associated videos, so:
   - Don't show video playback controls
   - Don't show video timestamps
   - Don't link to video segments

2. **Map Display**: 
   - Show company pins on the map like regular locations
   - Use a different marker/pin style if possible

3. **Location List**:
   - Display company pins in the location list
   - Show name, address, and coordinates
   - Optionally show a "View on Google Maps" link using `placeId` or coordinates

---

## TypeScript Type Updates

Update your location type definition:

```typescript
export interface GuideLocation {
  id: string;
  name: string;
  locationName?: string;
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  timeStartSec: number;
  timeEndSec?: number;
  mention?: string;
  context?: string;
  videoId: string | null;  // Can be null for company pins
  videoUrl: string | null; // Can be null for company pins
  isCompanyPin?: boolean;  // NEW: Optional flag
}
```

---

## Implementation Example

```typescript
// Filter and display locations
const videoLocations = locations.filter(loc => !loc.isCompanyPin);
const companyPins = locations.filter(loc => loc.isCompanyPin);

// Render company pins with different styling
{companyPins.map(pin => (
  <LocationCard
    key={pin.id}
    location={pin}
    isCompanyPin={true}
    showVideoControls={false}
  />
))}

// Render video locations normally
{videoLocations.map(location => (
  <LocationCard
    key={location.id}
    location={location}
    isCompanyPin={false}
    showVideoControls={true}
    videoUrl={location.videoUrl}
  />
))}
```

---

## Google Maps Integration

Company pins have `placeId` and `coordinates` just like regular locations. You can generate Google Maps URLs:

```typescript
function getLocationUrl(location: GuideLocation): string {
  if (location.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
  }
  
  if (location.coordinates) {
    return `https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}`;
  }
  
  if (location.locationName) {
    const query = encodeURIComponent(location.locationName);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  
  return '';
}
```

---

## Backward Compatibility

- If `isCompanyPin` is not present in the response, use the heuristic method
- Existing guides without company pins will continue to work as before
- Company pins are optional - guides can have 0 or more company pins

---

## Testing Checklist

- [ ] Company pins appear in the locations array
- [ ] Company pins are visually differentiated from video locations
- [ ] Company pins don't show video playback controls
- [ ] Company pins appear on the map correctly
- [ ] Company pins can open Google Maps links
- [ ] Guides with only company pins work correctly
- [ ] Guides with mixed company pins and video locations work correctly

---

## Questions?

If you need clarification or run into issues:
1. Check the API response structure
2. Verify the `isCompanyPin` field is present
3. Test with a guide that has company pins created in the desktop app

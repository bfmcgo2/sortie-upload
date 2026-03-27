# Company Pin Feature - Mobile App Update

## Overview

Guides now support a **single Company Pin** - a custom location added via geocoding that is stored directly on the guide record (not in the locations array). This is separate from video-based locations.

---

## API Response Changes

### Updated Guide Object

The guide object in the API response now includes company pin fields:

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
    "company_pin_address": "123 Main St, Philadelphia, PA 19107",
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
      "videoId": "video-uuid",
      "videoUrl": "https://..."
    }
  ]
}
```

**Note:** The `locations` array contains ONLY video-based locations. The company pin is stored separately on the guide object.

---

## Company Pin Fields

All company pin fields are optional (can be `null`):

- `company_pin_name`: Name of the company pin (e.g., "Company Headquarters")
- `company_pin_address`: Full formatted address from geocoding
- `company_pin_coordinates`: `{ lat: number, lng: number }` object
- `company_pin_place_id`: Google Place ID (if available)

---

## Display Recommendations

### Visual Differentiation

The company pin should be visually distinct from video locations:

1. **Badge/Indicator**: Show a "COMPANY PIN" or "🏢" badge
2. **Color Scheme**: Use a different color (e.g., green) to distinguish from video locations
3. **Icon**: Use a building/pin icon vs. video icon

### UI Behavior

1. **No Video Playback**: Company pins don't have associated videos:
   - Don't show video playback controls
   - Don't show video timestamps
   - Don't link to video segments

2. **Map Display**: 
   - Show company pin on the map like regular locations
   - Use a different marker/pin style (e.g., building icon)

3. **Location List**:
   - Display company pin separately or at the top of the location list
   - Show name, address, and coordinates
   - Show a "View on Google Maps" link using `placeId` or coordinates

---

## TypeScript Type Updates

Update your guide type definition:

```typescript
export interface Guide {
  id: string;
  name: string;
  description?: string;
  company_id?: string;
  logo_url?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // NEW: Company pin fields
  company_pin_name?: string | null;
  company_pin_address?: string | null;
  company_pin_coordinates?: {
    lat: number;
    lng: number;
  } | null;
  company_pin_place_id?: string | null;
}

export interface GuideWithLocations {
  guide: Guide;
  locations: GuideLocation[]; // Only video-based locations
}
```

---

## Implementation Example

```typescript
// Check if guide has a company pin
const hasCompanyPin = guide.company_pin_name && guide.company_pin_coordinates;

// Render company pin separately
{hasCompanyPin && (
  <LocationCard
    name={guide.company_pin_name}
    address={guide.company_pin_address}
    coordinates={guide.company_pin_coordinates}
    placeId={guide.company_pin_place_id}
    isCompanyPin={true}
    showVideoControls={false}
  />
)}

// Render video locations normally
{locations.map(location => (
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

Company pins have `placeId` and `coordinates` just like regular locations:

```typescript
function getCompanyPinUrl(guide: Guide): string {
  if (guide.company_pin_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${guide.company_pin_place_id}`;
  }
  
  if (guide.company_pin_coordinates) {
    return `https://www.google.com/maps?q=${guide.company_pin_coordinates.lat},${guide.company_pin_coordinates.lng}`;
  }
  
  if (guide.company_pin_address) {
    const query = encodeURIComponent(guide.company_pin_address);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  
  return '';
}
```

---

## Backward Compatibility

- All company pin fields are optional (`null` if not set)
- Existing guides without company pins will have `null` values
- The `locations` array behavior is unchanged (only contains video locations)

---

## Testing Checklist

- [ ] Company pin fields appear in guide object
- [ ] Company pin is visually differentiated from video locations
- [ ] Company pin doesn't show video playback controls
- [ ] Company pin appears on the map correctly
- [ ] Company pin can open Google Maps links
- [ ] Guides without company pins work correctly (null values)
- [ ] Guides with company pin and video locations work correctly

---

## Migration Notes

**Important:** The previous implementation stored company pins as locations in the `locations` array with `isCompanyPin: true`. This has been changed. Company pins are now stored directly on the guide object.

If you have existing code checking for `location.isCompanyPin`, you should:
1. Remove that check (locations no longer have this field)
2. Check `guide.company_pin_name` instead to determine if a company pin exists

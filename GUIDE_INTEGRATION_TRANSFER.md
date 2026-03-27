# Guide Integration Transfer Document
## Desktop App → Mobile Web App Integration

**Date:** January 2025  
**Purpose:** Enable mobile web app to consume database-driven guides created in the desktop app

---

## Executive Summary

The desktop app now supports creating and managing guides dynamically through a database-driven system. Guides can include locations from multiple videos and are stored in Supabase. The mobile web app needs to be updated to fetch and display these guides instead of (or in addition to) the current static JSON-based approach.

### Key Changes
- **New Database Tables:** `guides` and `guide_locations` 
- **New API Endpoints:** Available on desktop app for fetching guides
- **Backward Compatibility:** Can coexist with existing JSON-based guides
- **Public/Private Guides:** Guides can be marked as public for mobile consumption

---

## Database Schema

### New Tables

#### `guides` Table
```sql
CREATE TABLE guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- e.g., "Philadelphia Guide"
  description TEXT,                      -- Optional description
  company_id TEXT,                       -- Optional: for backward compatibility with company-based guides
  logo_url TEXT,                         -- Company/guide logo URL
  coordinates JSONB,                     -- { lat, lng } - auto-calculated from locations
  user_id TEXT NOT NULL,                 -- Creator's user ID
  user_email TEXT NOT NULL,              -- Creator's email
  is_active BOOLEAN DEFAULT true,        -- Enable/disable guide
  is_public BOOLEAN DEFAULT false,       -- Make guide accessible without auth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `guide_locations` Junction Table
```sql
CREATE TABLE guide_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,       -- Order locations appear in guide
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guide_id, location_id)
);
```

**Note:** The SQL migration file is available at `/database/guides-schema.sql` in the desktop app repository.

---

## API Endpoints (Desktop App)

All endpoints are available on the desktop app domain (e.g., `https://your-desktop-app.com/api/...`).

### 1. Get Public Guides
```
GET /api/guides?public=true
```
**Response:**
```json
{
  "guides": [
    {
      "id": "uuid",
      "name": "Philadelphia Guide",
      "description": "Best spots in Philly",
      "company_id": "optional-company-id",
      "logo_url": "/companies/philly-logo.png",
      "coordinates": { "lat": 39.9526, "lng": -75.1652 },
      "is_active": true,
      "is_public": true,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### 2. Get Guide by ID (with locations)
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
    "logo_url": "/companies/philly-logo.png",
    "coordinates": { "lat": 39.9526, "lng": -75.1652 },
    "is_active": true,
    "is_public": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  "locations": [
    {
      "id": "location-uuid",
      "name": "Reading Terminal Market",
      "address": null,
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
  ]
}
```

**Access Control:**
- Public guides (`is_public: true`) can be accessed without authentication
- Private guides require authentication and ownership verification
- Use `?public=true` query param to explicitly request public guides

### 3. Get Guides by Company ID
```
GET /api/guides?company_id=[company-id]&public=true
```
**Note:** This filters guides by `company_id` field for backward compatibility.

---

## Mobile Web App Integration Options

### Option 1: Direct Supabase Query (Recommended)

Query Supabase directly from the mobile app (same database, different app).

**Advantages:**
- No CORS issues
- Faster (direct database access)
- More control over queries

**Implementation:**

#### Update `lib/supabase.ts`:

```typescript
// Fetch guide by ID
export async function fetchGuideById(guideId: string): Promise<GuideWithLocations> {
  // Fetch guide with locations
  const { data: guide, error: guideError } = await supabase
    .from('guides')
    .select(`
      *,
      guide_locations (
        display_order,
        locations (
          *,
          videos (
            id,
            video_url,
            is_public,
            general_locations
          )
        )
      )
    `)
    .eq('id', guideId)
    .eq('is_active', true)
    .eq('is_public', true)  // Only fetch public guides for mobile
    .single();

  if (guideError) throw guideError;

  // Transform data to match expected format
  const locations = (guide.guide_locations || [])
    .sort((a, b) => a.display_order - b.display_order)
    .map(gl => gl.locations)
    .filter(loc => loc && loc.videos && loc.videos.is_public) // Only public videos
    .map(loc => ({
      id: loc.id,
      name: loc.name,
      locationName: loc.location_name,
      address: loc.address,
      coordinates: loc.coordinates,
      placeId: loc.place_id,
      timeStartSec: parseFloat(loc.time_start_sec),
      timeEndSec: loc.time_end_sec ? parseFloat(loc.time_end_sec) : null,
      mention: loc.mention,
      context: loc.context,
      videoId: loc.video_id,
      videoUrl: convertR2Url(loc.videos.video_url) // Convert to public R2 URL
    }));

  return {
    guide: {
      id: guide.id,
      name: guide.name,
      description: guide.description,
      company_id: guide.company_id,
      logo_url: guide.logo_url,
      coordinates: guide.coordinates
    },
    locations
  };
}

// Fetch guides by company_id (for backward compatibility)
export async function fetchGuidesByCompany(companyId: string): Promise<Guide[]> {
  const { data, error } = await supabase
    .from('guides')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Fetch all public guides
export async function fetchPublicGuides(): Promise<Guide[]> {
  const { data, error } = await supabase
    .from('guides')
    .select('*')
    .eq('is_public', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Helper: Convert Supabase signed URL to public R2 URL
function convertR2Url(signedUrl: string): string {
  // If already a public R2 URL, return as-is
  if (signedUrl.includes('r2.dev') || signedUrl.includes('r2.cloudflarestorage.com')) {
    return signedUrl;
  }
  
  // Extract path from signed URL
  // Example: https://[project].supabase.co/storage/v1/object/sign/videos/[user-id]/[filename]?token=...
  // Convert to: https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/[user-id]/[filename]
  
  const match = signedUrl.match(/\/videos\/([^?]+)/);
  if (match) {
    const path = match[1];
    return `https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/${path}`;
  }
  
  return signedUrl;
}
```

### Option 2: API Endpoint (Alternative)

Call the desktop app's API endpoints (requires CORS setup).

**Advantages:**
- Centralized logic
- Desktop app can add caching/optimization

**Disadvantages:**
- Requires CORS configuration
- Additional network hop
- Desktop app must be accessible

**Implementation:**

```typescript
const DESKTOP_APP_URL = process.env.NEXT_PUBLIC_DESKTOP_APP_URL || 'https://your-desktop-app.com';

export async function fetchGuideById(guideId: string): Promise<GuideWithLocations> {
  const response = await fetch(`${DESKTOP_APP_URL}/api/guides/${guideId}?public=true`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch guide: ${response.statusText}`);
  }
  
  return await response.json();
}
```

**CORS Setup (on desktop app):**
Ensure the desktop app allows requests from the mobile app domain:
```javascript
// In Next.js API route middleware or headers
res.setHeader('Access-Control-Allow-Origin', 'https://your-mobile-app.com');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
```

---

## Route Updates

### Current Routes (JSON-based)
- `/guide/[companyid]` - Fetches guide by company ID from JSON files

### New Routes (Database-based)

#### Option A: Update Existing Route
Update `/app/guide/[companyid]/page.tsx` to support both:

```typescript
// Check if companyid is a UUID (guide ID) or company ID
const isGuideId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyid);

if (isGuideId) {
  // Fetch guide directly by ID
  const guide = await fetchGuideById(companyid);
  // ... render guide
} else {
  // Fetch guide by company_id (backward compatibility)
  const guides = await fetchGuidesByCompany(companyid);
  if (guides.length > 0) {
    // Use first guide or let user select
    const guide = await fetchGuideById(guides[0].id);
    // ... render guide
  } else {
    // Fallback to JSON-based approach
    // ... existing JSON logic
  }
}
```

#### Option B: Create New Route (Recommended for Gradual Migration)
Create `/app/guide/direct/[guideid]/page.tsx`:

```typescript
export default async function DirectGuidePage({ params }: { params: { guideid: string } }) {
  const guide = await fetchGuideById(params.guideid);
  
  // Render guide using existing GuideMap and VideoSegmentPlayer components
  return (
    <GuideMap 
      guide={guide.guide}
      locations={guide.locations}
    />
  );
}
```

Keep existing `/guide/[companyid]` route for backward compatibility.

---

## Data Structure Comparison

### Old Format (JSON)
```json
{
  "id": "2345023",
  "name": "The Edwin Hotel",
  "logo": "/companies/edwinhotel.png",
  "coordinates": { "lat": 35.0553, "lng": -85.3075 }
}
```

### New Format (Database)
```json
{
  "guide": {
    "id": "uuid",
    "name": "Kauai Guide",
    "description": "Explore beautiful Kauai",
    "company_id": "2345023",  // Optional: links to company
    "logo_url": "/companies/kauai-logo.png",
    "coordinates": { "lat": 22.0964, "lng": -159.5261 }
  },
  "locations": [
    {
      "id": "location-uuid",
      "name": "Limahuli Garden",
      "locationName": "5-8291 Kuhio Hwy, Hanalei, HI 96714",
      "coordinates": { "lat": 22.2219, "lng": -159.5528 },
      "timeStartSec": 45.2,
      "timeEndSec": 120.5,
      "videoId": "video-uuid",
      "videoUrl": "https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/user-id/video.mp4"
    }
  ]
}
```

**Key Differences:**
- `id` is now a UUID instead of numeric string
- `logo` → `logo_url`
- Locations are included in the response (no need for separate `company-locations.json` lookup)
- Video URLs are included in location objects

---

## Migration Steps

### Phase 1: Add Database Support (Backward Compatible)

1. **Add Supabase helper functions** (see Option 1 above)
2. **Update guide page** to try database first, fallback to JSON:
   ```typescript
   // Try database first
   try {
     const guide = await fetchGuideById(params.id);
     return <GuideMap guide={guide} />;
   } catch (error) {
     // Fallback to JSON
     const companyData = await loadCompanyFromJSON(params.id);
     return <GuideMap guide={companyData} />;
   }
   ```
3. **Test with a public guide** created in desktop app

### Phase 2: Full Migration (Optional)

1. Migrate all existing JSON guides to database
2. Remove JSON file dependency
3. Update all routes to use database only

### Phase 3: Deprecation

1. Mark JSON-based guides as deprecated
2. Eventually remove JSON loading code

---

## Video URL Conversion

The desktop app stores videos with signed URLs or R2 URLs. The mobile app should convert these to public R2 URLs for consistent playback.

**Current desktop storage:**
- `video_url` may be a signed Supabase URL or direct R2 URL

**Mobile app needs:**
- Public R2 URL: `https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/[user-id]/[filename]`

**Conversion helper:**
```typescript
function convertToPublicR2Url(videoUrl: string): string {
  // Already public R2 URL
  if (videoUrl.includes('r2.dev') || videoUrl.includes('r2.cloudflarestorage.com')) {
    return videoUrl;
  }
  
  // Extract path from signed Supabase URL
  const signedUrlPattern = /\/videos\/([^?]+)/;
  const match = videoUrl.match(signedUrlPattern);
  
  if (match) {
    const path = match[1]; // user-id/filename.mp4
    return `https://pub-2d441c7919fd461bbca73a2b957915fa.r2.dev/${path}`;
  }
  
  // Fallback: return as-is
  return videoUrl;
}
```

**Note:** The public R2 bucket URL (`pub-2d441c7919fd461bbca73a2b957915fa.r2.dev`) should match your actual R2 bucket public URL. Update this in your mobile app configuration.

---

## Testing Checklist

- [ ] Create a public guide in desktop app
- [ ] Fetch guide by ID in mobile app (via Supabase or API)
- [ ] Verify locations are displayed correctly
- [ ] Verify video URLs work and play correctly
- [ ] Test map centering with guide coordinates
- [ ] Test backward compatibility with JSON-based guides (if keeping)
- [ ] Test guide with multiple locations
- [ ] Test guide with locations from multiple videos
- [ ] Verify public guides are accessible without auth
- [ ] Verify private guides require auth (if implementing)

---

## Example Implementation

### Complete Guide Page Example

```typescript
// app/guide/[id]/page.tsx
import { fetchGuideById } from '@/lib/supabase';
import GuideMap from '@/components/GuideMap';
import VideoSegmentPlayer from '@/components/VideoSegmentPlayer';

export default async function GuidePage({ params }: { params: { id: string } }) {
  try {
    // Fetch guide from database
    const { guide, locations } = await fetchGuideById(params.id);
    
    return (
      <div>
        <GuideMap 
          guide={guide}
          locations={locations}
          center={guide.coordinates || calculateCenter(locations)}
        />
        <VideoSegmentPlayer 
          locations={locations}
          onLocationSelect={(location) => {
            // Handle location selection
          }}
        />
      </div>
    );
  } catch (error) {
    // Fallback to JSON or show error
    console.error('Failed to load guide:', error);
    return <div>Guide not found</div>;
  }
}

function calculateCenter(locations: Location[]): { lat: number; lng: number } {
  if (locations.length === 0) return { lat: 0, lng: 0 };
  
  const avgLat = locations.reduce((sum, loc) => sum + loc.coordinates.lat, 0) / locations.length;
  const avgLng = locations.reduce((sum, loc) => sum + loc.coordinates.lng, 0) / locations.length;
  
  return { lat: avgLat, lng: avgLng };
}
```

---

## Type Definitions

Add these TypeScript types to your mobile app:

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
}

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
  videoId: string;
  videoUrl: string;
}

export interface GuideWithLocations {
  guide: Guide;
  locations: GuideLocation[];
}
```

---

## Troubleshooting

### Issue: Guide not found
- **Check:** Guide is marked as `is_public: true` and `is_active: true`
- **Check:** Guide ID is correct (UUID format)
- **Check:** Supabase connection and RLS policies allow public reads

### Issue: Locations not showing
- **Check:** Locations are linked to guide via `guide_locations` table
- **Check:** Associated videos are marked as `is_public: true`
- **Check:** Location coordinates are valid

### Issue: Videos not playing
- **Check:** Video URLs are converted to public R2 URLs
- **Check:** R2 bucket CORS settings allow mobile app domain
- **Check:** Video files exist in R2 bucket

### Issue: CORS errors (if using API approach)
- **Check:** Desktop app has CORS headers configured
- **Check:** Mobile app domain is whitelisted in desktop app

---

## Support & Contact

For questions or issues:
1. Check the desktop app repository: `/database/guides-schema.sql` for schema
2. Review API endpoint code: `/app/api/guides/` in desktop app
3. Test API endpoints using: `https://your-desktop-app.com/api/guides?public=true`

---

## Next Steps

1. **Review this document** with the mobile app team
2. **Choose integration approach** (Direct Supabase vs API)
3. **Implement helper functions** in mobile app
4. **Update guide routes** to support database guides
5. **Test with a sample guide** from desktop app
6. **Deploy and monitor** for issues

Good luck with the integration! 🚀


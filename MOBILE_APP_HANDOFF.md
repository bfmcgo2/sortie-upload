## Mobile App Handoff (React Native)

This document summarizes the backend, data schema, APIs, and storage used by the Sortie prototype so you can build a new React Native app against it.

### Tech Overview
- Backend/UI: Next.js app in this repo
- Processing: ffmpeg, OpenAI Whisper (transcription), OpenAI GPT (NER), Google Geocoding
- Storage: Cloudflare R2 (raw video files, private) via S3-compatible API with signed URLs
- Database: Supabase Postgres (videos + locations)

### Environment (server)
Add to `.env.local` on the server (already done here):
```
OPENAI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=sortie-videos
```

### Core API Endpoints (server-side in this repo)
- `POST /api/process`
  - FormData: `file` (video), `generalLocations` (JSON array)
  - Returns: `{ generalLocations, locations[], transcript, extractedLocations[], debug }`
- `POST /api/upload`
  - FormData: `user` (JSON), `videoData` (JSON), `locations` (JSON), `videoFile` (File), `isPublic` ('true'|'false')
  - Flow: uploads file to Cloudflare R2 → generates signed URL → inserts video + locations into Supabase
  - Returns: `{ success, video, locations, videoUrl: "/video/:id" }`
- `GET /api/video/:id`
  - Returns the video record (incl. signed `video_url`) and its `locations`.

Note: Signed URLs currently expire in 7 days; client should be able to refresh via `GET /api/video/:id` before playback if needed.

### Data Model (simplified)
- Table `videos` (Supabase)
  - `id` (uuid)
  - `user_id`, `user_email`, `user_name`
  - `title`, `description`
  - `video_filename`, `video_file_type`, `video_file_size`
  - `video_url` (signed Cloudflare R2 URL)
  - `general_locations` (text[] or jsonb)
  - `transcript` (text)
  - `processing_status` (text)
  - `is_public` (bool)
  - `created_at`
- Table `video_locations`
  - `id` (uuid)
  - `video_id` (fk → videos.id)
  - `name` (short business/POI name)
  - `location_name` (formatted address)
  - `coordinates` (jsonb: `{ lat, lng }`)
  - `place_id` (text)
  - `time_start_sec` (int), `time_end_sec` (int | null)
  - `mention` (text), `context` (text)

See `database/schema.sql` in this repo for exact DDL and indexes.

### Client Responsibilities (React Native)
1. Upload/Process
   - Option A: Mirror web flow: upload to `/api/process` first to get `locations` → then `/api/upload` with user + `videoFile` + `locations`.
   - Option B: For prototype: directly hit `/api/upload` with `videoFile` and precomputed fields.
2. Playback
   - Fetch `GET /api/video/:id`, read `video_url` (signed), stream with `react-native-video`.
   - If URL is expired, re-fetch the endpoint to obtain a fresh signed URL.
3. Map & Search
   - Use `locations[].coordinates` for pins; list/detail panes based on `time_start_sec`/`time_end_sec`.

### Example Client Calls

Upload (multipart):
```
POST /api/upload
FormData:
  user: { id, email, name }
  videoData: {
    filename, fileType, fileSize,
    generalLocations: ["Philadelphia, PA"],
    transcript, title, description
  }
  locations: [ { name, locationName, coordinates:{lat,lng}, timeStartSec, timeEndSec, placeId } ]
  videoFile: <binary>
  isPublic: "false"
```

Get by id:
```
GET /api/video/<uuid>
// → { id, title, video_url (signed), video_file_type, video_file_size, general_locations, locations: [...] }
```

### Mobile Video Guidance
- Prefer `mp4` (H.264 + AAC) for broad compatibility.
- Large files will stream, but consider optional mobile compression or multiple renditions later.

### Project Setup (React Native)
- Suggested stack: React Native + Expo (for speed) or bare RN if you need custom native modules.
- Use `react-native-video` for playback and `react-native-maps` for map pins.
- Configure API base URL to point at your deployed Next.js backend.

### Security Notes
- R2 bucket remains private; access via server-generated signed URLs only.
- Supabase RLS is enabled; server routes should use service role where needed.

### Where Things Live
- Raw videos: Cloudflare R2 bucket `sortie-videos` (private)
- Public access: time-limited signed URLs from server
- Metadata + locations: Supabase `videos`, `video_locations`

This doc is the minimal handoff needed to implement the mobile client.



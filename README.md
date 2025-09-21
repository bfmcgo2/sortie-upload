# Video Location Scanner

A Next.js app to process a video, extract captions or transcribe audio, find mentioned locations with timestamps, and geocode them.

## Environment

Create a `.env.local` file in `scanner/` with:

```
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Install & Run

```
cd scanner
npm install
npm run dev
```

Open http://localhost:3000 and upload a video file.

## Notes
- Tries to extract embedded subtitles via ffmpeg first, then falls back to OpenAI Whisper.
- Location extraction uses an OpenAI model to map mentions to time windows.
- Geocoding uses Google Maps Geocoding API.

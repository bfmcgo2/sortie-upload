# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `sortie-video-database` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## 2. Get API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## 3. Set Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `database/schema.sql`
4. Click "Run" to execute the schema

This will create:
- `videos` table for storing video metadata
- `locations` table for storing location data
- Row Level Security policies
- Indexes for performance
- A view for mobile app consumption

## 5. Enable Authentication (Optional)

If you want to use Supabase's built-in auth instead of Google OAuth:

1. Go to **Authentication** → **Providers**
2. Enable Google provider
3. Add your Google OAuth credentials

## 6. Test the Integration

1. Start your development server: `npm run dev`
2. Upload a video and process it
3. Sign in with Google
4. Click "Submit Video"
5. Check your Supabase dashboard → **Table Editor** to see the data

## Database Schema Overview

### Videos Table
- `id`: UUID primary key
- `user_id`: Google user ID
- `user_email`: User's email
- `user_name`: User's display name
- `title`: Video title
- `description`: Video description
- `video_filename`: Original filename
- `video_file_type`: MIME type
- `video_file_size`: File size in bytes
- `video_url`: URL to stored video (future)
- `general_locations`: JSON array of general locations
- `transcript`: Full video transcript
- `processing_status`: 'processing', 'completed', 'failed'
- `is_public`: Whether video is public for mobile app
- `created_at`, `updated_at`: Timestamps

### Locations Table
- `id`: UUID primary key
- `video_id`: Foreign key to videos table
- `name`: Location name
- `address`: Street address
- `location_name`: Full formatted address
- `coordinates`: JSON with lat/lng
- `place_id`: Google Place ID
- `time_start_sec`: Start time in video
- `time_end_sec`: End time in video
- `mention`: Exact text mentioning location
- `context`: Surrounding context
- `created_at`: Timestamp

## Mobile App Integration

The mobile app can consume data via:

1. **Public API endpoint**: `/api/upload?public=true` - Gets all public videos
2. **Direct Supabase queries**: Use the `public_videos_with_locations` view
3. **Supabase client**: Use the same environment variables

## Security

- Row Level Security (RLS) is enabled
- Users can only access their own videos
- Public videos are visible to everyone
- All API endpoints validate user authentication

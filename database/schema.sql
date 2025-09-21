-- Enable Row Level Security
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS locations ENABLE ROW LEVEL SECURITY;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Google user ID
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  video_filename TEXT,
  video_file_type TEXT,
  video_file_size BIGINT,
  video_url TEXT, -- URL to stored video file
  general_locations JSONB, -- Array of general locations like ["Philadelphia, PA"]
  transcript TEXT,
  processing_status TEXT DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  location_name TEXT, -- Full formatted address from Google
  coordinates JSONB, -- {"lat": 39.9526, "lng": -75.1652}
  place_id TEXT, -- Google Place ID
  time_start_sec DECIMAL(10,2) NOT NULL,
  time_end_sec DECIMAL(10,2),
  mention TEXT, -- The exact text mentioning the location
  context TEXT, -- Surrounding context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
CREATE INDEX IF NOT EXISTS idx_videos_general_locations ON videos USING GIN (general_locations);
CREATE INDEX IF NOT EXISTS idx_locations_video_id ON locations(video_id);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_place_id ON locations(place_id);

-- Row Level Security Policies

-- Users can only see their own videos
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- Public videos are visible to everyone (for mobile app)
CREATE POLICY "Public videos are viewable by everyone" ON videos
  FOR SELECT USING (is_public = true);

-- Locations inherit permissions from their video
CREATE POLICY "Users can view locations of own videos" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE videos.id = locations.video_id 
      AND videos.user_email = auth.jwt() ->> 'email'
    )
  );

-- Users can insert locations for their own videos
CREATE POLICY "Users can insert locations for own videos" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE videos.id = locations.video_id 
      AND videos.user_email = auth.jwt() ->> 'email'
    )
  );

-- Users can update locations for their own videos
CREATE POLICY "Users can update locations for own videos" ON locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE videos.id = locations.video_id 
      AND videos.user_email = auth.jwt() ->> 'email'
    )
  );

-- Users can delete locations for their own videos
CREATE POLICY "Users can delete locations for own videos" ON locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE videos.id = locations.video_id 
      AND videos.user_email = auth.jwt() ->> 'email'
    )
  );

-- Public locations are visible to everyone
CREATE POLICY "Public locations are viewable by everyone" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE videos.id = locations.video_id 
      AND videos.is_public = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for mobile app consumption (public videos with locations)
CREATE OR REPLACE VIEW public_videos_with_locations AS
SELECT 
  v.id,
  v.title,
  v.description,
  v.general_locations,
  v.transcript,
  v.video_url,
  v.created_at,
  json_agg(
    json_build_object(
      'id', l.id,
      'name', l.name,
      'address', l.address,
      'location_name', l.location_name,
      'coordinates', l.coordinates,
      'place_id', l.place_id,
      'time_start_sec', l.time_start_sec,
      'time_end_sec', l.time_end_sec,
      'mention', l.mention,
      'context', l.context
    ) ORDER BY l.time_start_sec
  ) as locations
FROM videos v
LEFT JOIN locations l ON v.id = l.video_id
WHERE v.is_public = true AND v.processing_status = 'completed'
GROUP BY v.id, v.title, v.description, v.general_locations, v.transcript, v.video_url, v.created_at;

-- Function to find videos by general location
CREATE OR REPLACE FUNCTION get_videos_by_general_location(general_loc TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  general_locations JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  location_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.general_locations,
    v.created_at,
    COUNT(l.id) as location_count
  FROM videos v
  LEFT JOIN locations l ON v.id = l.video_id
  WHERE v.is_public = true 
    AND v.processing_status = 'completed'
    AND v.general_locations @> to_jsonb(general_loc)
  GROUP BY v.id, v.title, v.description, v.general_locations, v.created_at
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find videos within coordinate bounds
CREATE OR REPLACE FUNCTION get_videos_by_coordinates(
  min_lat DECIMAL,
  max_lat DECIMAL,
  min_lng DECIMAL,
  max_lng DECIMAL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  general_locations JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  matching_locations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.general_locations,
    v.created_at,
    json_agg(
      json_build_object(
        'name', l.name,
        'coordinates', l.coordinates,
        'time_start_sec', l.time_start_sec
      )
    ) as matching_locations
  FROM videos v
  JOIN locations l ON v.id = l.video_id
  WHERE v.is_public = true 
    AND v.processing_status = 'completed'
    AND (l.coordinates->>'lat')::DECIMAL BETWEEN min_lat AND max_lat
    AND (l.coordinates->>'lng')::DECIMAL BETWEEN min_lng AND max_lng
  GROUP BY v.id, v.title, v.description, v.general_locations, v.created_at
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search videos by location name
CREATE OR REPLACE FUNCTION search_videos_by_location(search_term TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  general_locations JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  matching_locations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.general_locations,
    v.created_at,
    json_agg(
      json_build_object(
        'name', l.name,
        'coordinates', l.coordinates,
        'time_start_sec', l.time_start_sec,
        'mention', l.mention
      )
    ) as matching_locations
  FROM videos v
  JOIN locations l ON v.id = l.video_id
  WHERE v.is_public = true 
    AND v.processing_status = 'completed'
    AND (
      l.name ILIKE '%' || search_term || '%' 
      OR l.location_name ILIKE '%' || search_term || '%'
      OR l.mention ILIKE '%' || search_term || '%'
    )
  GROUP BY v.id, v.title, v.description, v.general_locations, v.created_at
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

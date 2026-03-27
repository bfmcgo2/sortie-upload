-- Guide Pins Schema
-- Non-video pins for guides (businesses, landmarks, etc.)

-- Create guide_pins table
CREATE TABLE IF NOT EXISTS guide_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                      -- Pin name (e.g., "Reading Terminal Market")
  address TEXT,                            -- Full address (e.g., "51 N 12th St, Philadelphia, PA 19107")
  coordinates JSONB NOT NULL,              -- { lat, lng } from geocoding
  place_id TEXT,                           -- Google Places ID (optional)
  description TEXT,                        -- Optional description
  pin_link_url TEXT,                       -- Optional external link opened when pin is tapped
  pin_image_url TEXT,                      -- URL to uploaded pin image (stored in R2/Supabase)
  pin_image_filename TEXT,                 -- Filename for uploaded image
  display_order INTEGER DEFAULT 0,         -- Order pins appear in guide
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guide_id, id)
);

-- Create index for guide_id lookups
CREATE INDEX IF NOT EXISTS idx_guide_pins_guide_id ON guide_pins(guide_id);

-- Create index for display_order sorting
CREATE INDEX IF NOT EXISTS idx_guide_pins_display_order ON guide_pins(guide_id, display_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guide_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guide_pins_updated_at
  BEFORE UPDATE ON guide_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_pins_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE guide_pins ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public reads for public guides
CREATE POLICY "Public guides pins are viewable by everyone"
  ON guide_pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = guide_pins.guide_id
      AND guides.is_public = true
      AND guides.is_active = true
    )
  );

-- Policy: Guide owners can manage their guide pins
CREATE POLICY "Guide owners can manage their guide pins"
  ON guide_pins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = guide_pins.guide_id
      AND guides.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Note: Since we're using custom auth (Google OAuth), RLS policies above are placeholders
-- Actual authorization is handled in API routes using user_id/user_email matching


-- Fix guide_pins table schema to match other tables
-- Run this if you get errors creating guide pins

-- First, check if table exists and drop if needed to recreate
DROP TABLE IF EXISTS guide_pins CASCADE;

-- Create guide_pins table with correct UUID function
CREATE TABLE guide_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  coordinates JSONB NOT NULL,
  place_id TEXT,
  description TEXT,
  pin_link_url TEXT,
  pin_image_url TEXT,
  pin_image_filename TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_guide_pins_guide_id ON guide_pins(guide_id);
CREATE INDEX idx_guide_pins_display_order ON guide_pins(guide_id, display_order);

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

-- Disable RLS for now (since we're using service role in API)
-- Or create policies that work with your auth setup
ALTER TABLE guide_pins DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later, uncomment and adjust:
-- ALTER TABLE guide_pins ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public guides pins are viewable by everyone"
--   ON guide_pins FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM guides
--       WHERE guides.id = guide_pins.guide_id
--       AND guides.is_public = true
--       AND guides.is_active = true
--     )
--   );

-- Guides table for curating locations from videos
CREATE TABLE IF NOT EXISTS guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id TEXT, -- Optional: link to company/brand
  logo_url TEXT, -- Company logo URL
  coordinates JSONB, -- { lat, lng } for map center
  user_id TEXT NOT NULL, -- Google user ID (matches videos.user_id)
  user_email TEXT NOT NULL, -- User email (matches videos.user_email)
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Whether guide is publicly accessible
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table linking guides to locations
CREATE TABLE IF NOT EXISTS guide_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0, -- Order locations appear in guide
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guide_id, location_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guide_locations_guide ON guide_locations(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_locations_location ON guide_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_guides_user_id ON guides(user_id);
CREATE INDEX IF NOT EXISTS idx_guides_is_active ON guides(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_guides_is_public ON guides(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_guides_company_id ON guides(company_id) WHERE company_id IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON guides
    FOR EACH ROW EXECUTE FUNCTION update_guides_updated_at();

-- Row Level Security Policies
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own guides
CREATE POLICY "Users can view own guides" ON guides
  FOR SELECT USING (
    user_email = auth.jwt() ->> 'email' OR is_public = true
  );

-- Users can insert their own guides
CREATE POLICY "Users can insert own guides" ON guides
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Users can update their own guides
CREATE POLICY "Users can update own guides" ON guides
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

-- Users can delete their own guides
CREATE POLICY "Users can delete own guides" ON guides
  FOR DELETE USING (user_email = auth.jwt() ->> 'email');

-- Public guides are visible to everyone
CREATE POLICY "Public guides are viewable by everyone" ON guides
  FOR SELECT USING (is_public = true);

-- Guide locations inherit permissions from their guide
CREATE POLICY "Users can view locations of own guides" ON guide_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guides 
      WHERE guides.id = guide_locations.guide_id 
      AND (guides.user_email = auth.jwt() ->> 'email' OR guides.is_public = true)
    )
  );

-- Users can insert locations for their own guides
CREATE POLICY "Users can insert locations for own guides" ON guide_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guides 
      WHERE guides.id = guide_locations.guide_id 
      AND guides.user_email = auth.jwt() ->> 'email'
    )
  );

-- Users can update locations for their own guides
CREATE POLICY "Users can update locations for own guides" ON guide_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM guides 
      WHERE guides.id = guide_locations.guide_id 
      AND guides.user_email = auth.jwt() ->> 'email'
    )
  );

-- Users can delete locations for their own guides
CREATE POLICY "Users can delete locations for own guides" ON guide_locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM guides 
      WHERE guides.id = guide_locations.guide_id 
      AND guides.user_email = auth.jwt() ->> 'email'
    )
  );


-- Create videos storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

-- Create simple policies that allow uploads (for development)
CREATE POLICY "Allow all authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos'
);

CREATE POLICY "Allow all public reads" ON storage.objects
FOR SELECT USING (
  bucket_id = 'videos'
);

CREATE POLICY "Allow all authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'videos'
);

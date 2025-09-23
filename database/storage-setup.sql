-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Create storage policies for videos bucket

-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' 
  AND (
    auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'  -- Allow service role for server-side uploads
  )
);

-- Allow users to view their own videos
CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'videos' 
  AND (
    auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'  -- Allow service role for server-side access
  )
);

-- Allow public access to videos (for mobile app)
CREATE POLICY "Public videos are viewable by everyone" ON storage.objects
FOR SELECT USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.video_url LIKE '%' || name || '%'
    AND videos.is_public = true
  )
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'videos' 
  AND (
    auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'  -- Allow service role for server-side operations
  )
);

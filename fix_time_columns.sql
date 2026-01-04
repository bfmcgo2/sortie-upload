-- Fix time columns to accept decimal values
ALTER TABLE video_locations 
ALTER COLUMN time_start_sec TYPE DECIMAL(10,2),
ALTER COLUMN time_end_sec TYPE DECIMAL(10,2);







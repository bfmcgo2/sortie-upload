-- Add company pin fields to guides table
ALTER TABLE guides 
ADD COLUMN IF NOT EXISTS company_pin_name TEXT,
ADD COLUMN IF NOT EXISTS company_pin_address TEXT,
ADD COLUMN IF NOT EXISTS company_pin_coordinates JSONB,
ADD COLUMN IF NOT EXISTS company_pin_place_id TEXT;

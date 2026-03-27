-- Add optional external link field for custom guide pins
ALTER TABLE guide_pins
ADD COLUMN IF NOT EXISTS pin_link_url TEXT;

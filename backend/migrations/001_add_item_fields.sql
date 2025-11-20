-- Migration: Add additional fields to items table
-- Date: 2025-11-20
-- Description: Adds manufacturer, manufacture_date, and custom_fields to support enhanced item tracking

-- Add new fields to items table
ALTER TABLE items 
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB;

-- Migrate existing brand data to manufacturer field (if brand column exists)
-- Note: This assumes you may have an older schema with 'brand' instead of 'manufacturer'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'brand'
  ) THEN
    UPDATE items SET manufacturer = brand WHERE manufacturer IS NULL AND brand IS NOT NULL;
    ALTER TABLE items DROP COLUMN brand;
  END IF;
END $$;

-- Add comments to new columns for documentation
COMMENT ON COLUMN items.manufacturer IS 'Name of the item manufacturer/brand';
COMMENT ON COLUMN items.manufacture_date IS 'Date the item was manufactured';
COMMENT ON COLUMN items.custom_fields IS 'User-defined custom fields stored as JSON';

-- Create index on custom_fields for better query performance
CREATE INDEX IF NOT EXISTS idx_items_custom_fields ON items USING GIN (custom_fields);

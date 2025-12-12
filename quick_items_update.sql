-- Add serving_size column to quick_items table
ALTER TABLE quick_items 
ADD COLUMN serving_size DECIMAL(10, 2) NOT NULL DEFAULT 1.0 CHECK (serving_size > 0);

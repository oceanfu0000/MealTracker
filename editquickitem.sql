-- 1. Add image_url column to quick_items table
ALTER TABLE quick_items 
ADD COLUMN image_url text NULL;

-- 2. Add quick_item_id column to meal_logs table with a foreign key relationship
ALTER TABLE meal_logs 
ADD COLUMN quick_item_id uuid NULL REFERENCES quick_items(id) ON DELETE SET NULL;
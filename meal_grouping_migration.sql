-- Migration: Add meal grouping feature
-- This allows users to group multiple food items together as part of one meal
-- For example: Cai Png + Teh C can be grouped as "Lunch"

-- Add meal_group_id column to meal_logs table
-- Meals with the same meal_group_id belong to the same meal group
ALTER TABLE meal_logs
ADD COLUMN IF NOT EXISTS meal_group_id UUID DEFAULT NULL;

-- Add meal_group_name column to store a custom name for the grouped meal (e.g., "Lunch", "Breakfast")
ALTER TABLE meal_logs
ADD COLUMN IF NOT EXISTS meal_group_name TEXT DEFAULT NULL;

-- Create an index for faster queries on meal_group_id
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_group_id ON meal_logs(meal_group_id);

-- Create an index for faster queries on meal_group_id with user_id
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_meal_group ON meal_logs(user_id, meal_group_id);

-- Note: When inserting grouped meals:
-- 1. Generate a UUID for meal_group_id (use uuid_generate_v4() or client-side UUID)
-- 2. All items in the same meal group should share the same meal_group_id
-- 3. The meal_group_name can be set on the first item or all items in the group
-- 4. Meals without a meal_group_id are standalone meals (not grouped)

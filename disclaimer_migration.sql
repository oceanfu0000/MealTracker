-- Migration: Add has_seen_disclaimer column to profiles
-- Run this in your Supabase SQL Editor

-- Add the column (default to false so new users see the disclaimer)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_seen_disclaimer BOOLEAN DEFAULT FALSE;

-- Set ALL existing users to false so they see the disclaimer popup
UPDATE profiles SET has_seen_disclaimer = FALSE;

-- (Optional) If you want to verify the change:
-- SELECT id, has_seen_disclaimer FROM profiles;

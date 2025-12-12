-- Meal Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  weight_kg DECIMAL(5, 2) NOT NULL CHECK (weight_kg > 0),
  height_cm DECIMAL(5, 2) NOT NULL CHECK (height_cm > 0),
  body_fat_percentage DECIMAL(4, 2) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
  training_frequency INTEGER NOT NULL CHECK (training_frequency >= 0 AND training_frequency <= 14),
  goal TEXT NOT NULL CHECK (goal IN ('cut', 'bulk', 'maintain')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_id ON profiles(id);

-- ============================================
-- NUTRITION TARGETS TABLE
-- ============================================
CREATE TABLE nutrition_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_target INTEGER NOT NULL CHECK (calories_target > 0),
  protein_target INTEGER NOT NULL CHECK (protein_target > 0),
  carbs_target INTEGER NOT NULL CHECK (carbs_target > 0),
  fat_target INTEGER NOT NULL CHECK (fat_target > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_nutrition_targets_user_id ON nutrition_targets(user_id);

-- ============================================
-- MEAL LOGS TABLE
-- ============================================
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('camera', 'manual', 'quick')),
  description TEXT NOT NULL,
  image_url TEXT,
  quantity DECIMAL(10, 2) DEFAULT 1.0,
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein DECIMAL(10, 2) NOT NULL CHECK (protein >= 0),
  carbs DECIMAL(10, 2) NOT NULL CHECK (carbs >= 0),
  fat DECIMAL(10, 2) NOT NULL CHECK (fat >= 0),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX idx_meal_logs_logged_at ON meal_logs(logged_at);
CREATE INDEX idx_meal_logs_user_logged ON meal_logs(user_id, logged_at DESC);

-- ============================================
-- QUICK ITEMS TABLE
-- ============================================
CREATE TABLE quick_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_unit TEXT NOT NULL DEFAULT 'serving',
  calories_per_unit INTEGER NOT NULL CHECK (calories_per_unit >= 0),
  protein_per_unit DECIMAL(10, 2) NOT NULL CHECK (protein_per_unit >= 0),
  carbs_per_unit DECIMAL(10, 2) DEFAULT 0 CHECK (carbs_per_unit >= 0),
  fat_per_unit DECIMAL(10, 2) DEFAULT 0 CHECK (fat_per_unit >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_quick_items_user_id ON quick_items(user_id);
CREATE INDEX idx_quick_items_name ON quick_items(user_id, name);

-- ============================================
-- MANUAL ACTIVITY TABLE
-- ============================================
CREATE TABLE manual_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steps INTEGER DEFAULT 0 CHECK (steps >= 0),
  active_energy INTEGER DEFAULT 0 CHECK (active_energy >= 0),
  workout_description TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- Indexes for faster queries
CREATE INDEX idx_manual_activity_user_id ON manual_activity(user_id);
CREATE INDEX idx_manual_activity_date ON manual_activity(user_id, activity_date DESC);

-- ============================================
-- APP SETTINGS TABLE
-- ============================================
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  last_opened TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_app_settings_user_id ON app_settings(user_id);

-- ============================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Nutrition targets policies
CREATE POLICY "Users can view own nutrition targets"
  ON nutrition_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition targets"
  ON nutrition_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition targets"
  ON nutrition_targets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition targets"
  ON nutrition_targets FOR DELETE
  USING (auth.uid() = user_id);

-- Meal logs policies
CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs"
  ON meal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Quick items policies
CREATE POLICY "Users can view own quick items"
  ON quick_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quick items"
  ON quick_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quick items"
  ON quick_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quick items"
  ON quick_items FOR DELETE
  USING (auth.uid() = user_id);

-- Manual activity policies
CREATE POLICY "Users can view own manual activity"
  ON manual_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual activity"
  ON manual_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual activity"
  ON manual_activity FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual activity"
  ON manual_activity FOR DELETE
  USING (auth.uid() = user_id);

-- App settings policies
CREATE POLICY "Users can view own app settings"
  ON app_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app settings"
  ON app_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own app settings"
  ON app_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_targets_updated_at
  BEFORE UPDATE ON nutrition_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_logs_updated_at
  BEFORE UPDATE ON meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_items_updated_at
  BEFORE UPDATE ON quick_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_activity_updated_at
  BEFORE UPDATE ON manual_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

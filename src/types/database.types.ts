// Database Types - Auto-generated from Supabase schema

export type UserGoal = 'cut' | 'bulk' | 'maintain';
export type MealType = 'camera' | 'manual' | 'quick';
export type Theme = 'light' | 'dark' | 'system';
export type Units = 'metric' | 'imperial';

export interface Profile {
    id: string;
    age: number;
    weight_kg: number;
    height_cm: number;
    body_fat_percentage: number | null;
    training_frequency: number;
    goal: UserGoal;
    created_at: string;
    updated_at: string;
}

export interface NutritionTargets {
    id: string;
    user_id: string;
    calories_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
    created_at: string;
    updated_at: string;
}

export interface MealLog {
    id: string;
    user_id: string;
    meal_type: MealType;
    description: string;
    image_url: string | null;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    logged_at: string;
    created_at: string;
    updated_at: string;
}

export interface QuickItem {
    id: string;
    user_id: string;
    name: string;
    default_unit: string;
    serving_size: number;
    calories_per_unit: number;
    protein_per_unit: number;
    carbs_per_unit: number;
    fat_per_unit: number;
    created_at: string;
    updated_at: string;
}

export interface ManualActivity {
    id: string;
    user_id: string;
    steps: number;
    active_energy: number;
    workout_description: string | null;
    activity_date: string;
    created_at: string;
    updated_at: string;
}

export interface AppSettings {
    id: string;
    user_id: string;
    theme: Theme;
    units: Units;
    last_opened: string;
    created_at: string;
    updated_at: string;
}

// Insert types (without auto-generated fields)
export type InsertProfile = Omit<Profile, 'id' | 'created_at' | 'updated_at'> & { id: string };
export type InsertNutritionTargets = Omit<NutritionTargets, 'id' | 'created_at' | 'updated_at'>;
export type InsertMealLog = Omit<MealLog, 'id' | 'created_at' | 'updated_at' | 'logged_at'>;
export type InsertQuickItem = Omit<QuickItem, 'id' | 'created_at' | 'updated_at'>;
export type InsertManualActivity = Omit<ManualActivity, 'id' | 'created_at' | 'updated_at'>;
export type InsertAppSettings = Omit<AppSettings, 'id' | 'created_at' | 'updated_at' | 'last_opened'>;

// Update types (all fields optional except id)
export type UpdateProfile = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
export type UpdateNutritionTargets = Partial<Omit<NutritionTargets, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateMealLog = Partial<Omit<MealLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateQuickItem = Partial<Omit<QuickItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateManualActivity = Partial<Omit<ManualActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// Database schema type
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: InsertProfile;
                Update: UpdateProfile;
            };
            nutrition_targets: {
                Row: NutritionTargets;
                Insert: InsertNutritionTargets;
                Update: UpdateNutritionTargets;
            };
            meal_logs: {
                Row: MealLog;
                Insert: InsertMealLog;
                Update: UpdateMealLog;
            };
            quick_items: {
                Row: QuickItem;
                Insert: InsertQuickItem;
                Update: UpdateQuickItem;
            };
            manual_activity: {
                Row: ManualActivity;
                Insert: InsertManualActivity;
                Update: UpdateManualActivity;
            };
            app_settings: {
                Row: AppSettings;
                Insert: InsertAppSettings;
                Update: Partial<AppSettings>;
            };
        };
    };
}

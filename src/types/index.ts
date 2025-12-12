// Application-specific types

export * from './database.types';

// Daily totals type
export interface DailyTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
}

// Nutrition calculation request
export interface NutritionCalculationRequest {
    age: number;
    weight_kg: number;
    height_cm: number;
    body_fat_percentage: number | null;
    training_frequency: number;
    goal: 'cut' | 'bulk' | 'maintain';
}

// Meal analysis response from AI
export interface MealAnalysis {
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence?: number;
}

// Quick add with quantity
export interface QuickAddWithQuantity {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

// Activity adjustment response
export interface ActivityAdjustment {
    base_calories: number;
    activity_bonus: number;
    adjusted_calories: number;
}

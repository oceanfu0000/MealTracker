import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

export type MealLog = Database['public']['Tables']['meal_logs']['Row'];
export type NewMealLog = Database['public']['Tables']['meal_logs']['Insert'];

export const MealService = {
    async getTodayMeals(userId: string) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching meals:', error);
            return [];
        }
        return data || [];
    },

    async addMeal(meal: NewMealLog) {
        const { data, error } = await supabase
            .from('meal_logs')
            .insert(meal)
            .select()
            .single();

        if (error) {
            console.error('Error adding meal:', error);
            throw error;
        }
        return data;
    },

    async calculateDailyTotals(meals: MealLog[]) {
        return meals.reduce(
            (acc, meal) => ({
                calories: acc.calories + meal.calories,
                protein: acc.protein + meal.protein,
                carbs: acc.carbs + (meal.carbs || 0),
                fat: acc.fat + (meal.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }
};

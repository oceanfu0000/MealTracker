import { supabase } from './supabase';
import type {
    InsertMealLog,
    MealLog,
    UpdateMealLog,
    QuickItem,
    InsertQuickItem,
    UpdateQuickItem,
    DailyTotals,
    NutritionCalculationRequest,
    NutritionTargets,
    MealAnalysis,
    ManualActivity,
    InsertManualActivity,
    Profile,
    InsertProfile,
} from '../types';
import { format } from 'date-fns';

// ============================================
// PROFILE & NUTRITION TARGETS
// ============================================

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

export async function upsertProfile(profile: InsertProfile): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }

    return data;
}

export async function getNutritionTargets(userId: string): Promise<NutritionTargets | null> {
    const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // No targets found
        return null;
    }

    if (error) {
        console.error('Error fetching nutrition targets:', error);
        return null;
    }

    return data;
}

export async function calculateNutritionTargets(
    request: NutritionCalculationRequest
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    // Mifflin-St Jeor Equation for BMR
    // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
    // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
    // We'll use the male formula as default (user can adjust manually)

    const bmr = 10 * request.weight_kg + 6.25 * request.height_cm - 5 * request.age + 5;

    // Activity multiplier based on training frequency
    let activityMultiplier = 1.2; // Sedentary
    if (request.training_frequency >= 6) activityMultiplier = 1.725; // Very active
    else if (request.training_frequency >= 4) activityMultiplier = 1.55; // Moderately active
    else if (request.training_frequency >= 2) activityMultiplier = 1.375; // Lightly active

    const tdee = bmr * activityMultiplier;

    // Adjust for goal
    let calories = tdee;
    if (request.goal === 'cut') calories = tdee - 500; // 500 cal deficit
    else if (request.goal === 'bulk') calories = tdee + 300; // 300 cal surplus

    // Protein: 2.2g per kg for active individuals
    const protein = Math.round(request.weight_kg * 2.2);

    // Fat: 25% of calories
    const fatCalories = calories * 0.25;
    const fat = Math.round(fatCalories / 9); // 9 cal per gram of fat

    // Carbs: remaining calories
    const carbCalories = calories - (protein * 4) - (fat * 9);
    const carbs = Math.round(carbCalories / 4); // 4 cal per gram of carbs

    return {
        calories: Math.round(calories),
        protein,
        carbs,
        fat,
    };
}

export async function upsertNutritionTargets(
    userId: string,
    targets: { calories: number; protein: number; carbs: number; fat: number }
): Promise<NutritionTargets | null> {
    const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert({
            user_id: userId,
            calories_target: targets.calories,
            protein_target: targets.protein,
            carbs_target: targets.carbs,
            fat_target: targets.fat,
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting nutrition targets:', error);
        return null;
    }

    return data;
}

// ============================================
// MEAL LOGS
// ============================================

export async function fetchMealsForDate(userId: string, date: Date): Promise<MealLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('logged_at', { ascending: false });

    if (error) {
        console.error('Error fetching meals:', error);
        return [];
    }

    return data || [];
}

export async function insertMeal(meal: InsertMealLog & { user_id: string }): Promise<MealLog | null> {
    const { data, error } = await supabase
        .from('meal_logs')
        .insert({
            ...meal,
            logged_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error inserting meal:', error);
        return null;
    }

    return data;
}

export async function updateMeal(id: string, updates: UpdateMealLog): Promise<MealLog | null> {
    const { data, error } = await supabase
        .from('meal_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating meal:', error);
        return null;
    }

    return data;
}

export async function deleteMeal(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting meal:', error);
        return false;
    }

    return true;
}

export async function calculateDailyTotals(userId: string, date: Date): Promise<DailyTotals> {
    const meals = await fetchMealsForDate(userId, date);

    return meals.reduce(
        (totals, meal) => ({
            calories: totals.calories + meal.calories,
            protein: totals.protein + meal.protein,
            carbs: totals.carbs + meal.carbs,
            fat: totals.fat + meal.fat,
            mealCount: totals.mealCount + 1,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 }
    );
}

// ============================================
// QUICK ITEMS
// ============================================

export async function fetchQuickItems(userId: string): Promise<QuickItem[]> {
    const { data, error } = await supabase
        .from('quick_items')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching quick items:', error);
        return [];
    }

    return data || [];
}

export async function insertQuickItem(item: InsertQuickItem & { user_id: string }): Promise<QuickItem | null> {
    const { data, error } = await supabase
        .from('quick_items')
        .insert(item)
        .select()
        .single();

    if (error) {
        console.error('Error inserting quick item:', error);
        return null;
    }

    return data;
}

export async function updateQuickItem(id: string, updates: UpdateQuickItem): Promise<QuickItem | null> {
    const { data, error } = await supabase
        .from('quick_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating quick item:', error);
        return null;
    }

    return data;
}

export async function deleteQuickItem(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('quick_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting quick item:', error);
        return false;
    }

    return true;
}

// ============================================
// MANUAL ACTIVITY
// ============================================

export async function getActivityForDate(userId: string, date: Date): Promise<ManualActivity | null> {
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
        .from('manual_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', dateStr)
        .single();

    if (error && error.code === 'PGRST116') {
        // No activity found
        return null;
    }

    if (error) {
        console.error('Error fetching activity:', error);
        return null;
    }

    return data;
}

export async function upsertActivity(activity: InsertManualActivity & { user_id: string }): Promise<ManualActivity | null> {
    const { data, error } = await supabase
        .from('manual_activity')
        .upsert(activity)
        .select()
        .single();

    if (error) {
        console.error('Error upserting activity:', error);
        return null;
    }

    return data;
}

// ============================================
// AI MEAL ANALYSIS (Placeholder for Edge Function)
// ============================================

export async function analyzeMealImage(imageBase64: string): Promise<MealAnalysis | null> {
    try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!openaiKey) {
            console.error('OpenAI API key not configured');
            return null;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this meal and provide nutrition estimates. Return ONLY a JSON object with this exact format: {"description": "meal description", "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": number}. All macro values should be in grams.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Parse JSON from response
        const analysis = JSON.parse(content);

        return {
            description: analysis.description || 'Unknown meal',
            calories: Math.round(analysis.calories || 0),
            protein: Math.round(analysis.protein || 0),
            carbs: Math.round(analysis.carbs || 0),
            fat: Math.round(analysis.fat || 0),
            confidence: analysis.confidence || 0.5,
        };
    } catch (error) {
        console.error('Error analyzing meal:', error);
        return null;
    }
}

// Helper function to compress image before sending to API
export function compressImage(file: File, maxWidth: number = 800): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                resolve(compressed);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

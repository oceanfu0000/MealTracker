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
    GroupedMeal,
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
        .upsert(profile as any)
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }

    return data;
}

export async function markDisclaimerSeen(userId: string): Promise<boolean> {
    const { error } = await (supabase
        .from('profiles') as any)
        .update({ has_seen_disclaimer: true })
        .eq('id', userId);

    if (error) {
        console.error('Error marking disclaimer as seen:', error);
        return false;
    }

    return true;
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
        } as any)
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
        .select(`
            *,
            quick_items (
                image_url
            )
        `)
        .eq('user_id', userId)
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('logged_at', { ascending: false });

    if (error) {
        console.error('Error fetching meals:', error);
        return [];
    }

    // Map the result to flatten the quick item image into the main object if needed
    // or just rely on the UI to look for it. Ideally we normalize it here so UI doesn't change.
    const normalizedData = (data || []).map((meal: any) => ({
        ...meal,
        image_url: meal.image_url || meal.quick_items?.image_url || null
    }));

    return normalizedData as MealLog[];
}

export async function insertMeal(meal: InsertMealLog & { user_id: string; logged_at?: string }): Promise<MealLog | null> {
    const { data, error } = await supabase
        .from('meal_logs')
        .insert({
            ...meal,
            logged_at: meal.logged_at || new Date().toISOString(),
        } as any)
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
        // @ts-expect-error - Supabase type inference issue with partial updates
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating meal:', error);
        return null;
    }

    return data;
}

// Predefined meal group names
export const MEAL_GROUP_OPTIONS = [
    { value: 'Breakfast', label: '🌅 Breakfast', emoji: '🌅' },
    { value: 'Brunch', label: '🥐 Brunch', emoji: '🥐' },
    { value: 'Lunch', label: '☀️ Lunch', emoji: '☀️' },
    { value: 'Tea Time', label: '🍵 Tea Time', emoji: '🍵' },
    { value: 'Dinner', label: '🌙 Dinner', emoji: '🌙' },
    { value: 'Supper', label: '🌃 Supper', emoji: '🌃' },
    { value: 'Snack', label: '🍿 Snack', emoji: '🍿' },
    { value: 'Pre-Workout', label: '💪 Pre-Workout', emoji: '💪' },
    { value: 'Post-Workout', label: '🏋️ Post-Workout', emoji: '🏋️' },
    { value: 'Others', label: '📦 Others', emoji: '📦' },
];

// Add a single meal to an existing or new group
export async function addMealToGroup(
    mealId: string, 
    groupName: string, 
    existingGroupId?: string
): Promise<boolean> {
    const groupId = existingGroupId || generateMealGroupId();
    
    const { error } = await supabase
        .from('meal_logs')
        // @ts-expect-error - Supabase type inference issue
        .update({ 
            meal_group_id: groupId, 
            meal_group_name: groupName 
        })
        .eq('id', mealId);

    if (error) {
        console.error('Error adding meal to group:', error);
        return false;
    }

    return true;
}

// Find existing meal group by name for a given day
export async function findExistingGroupByName(
    userId: string,
    groupName: string,
    date: Date
): Promise<{ groupId: string; mealCount: number } | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('findExistingGroupByName query:', {
        userId,
        groupName,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
    });

    const { data, error } = await supabase
        .from('meal_logs')
        .select('meal_group_id')
        .eq('user_id', userId)
        .eq('meal_group_name', groupName)
        .not('meal_group_id', 'is', null)
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .limit(1);

    console.log('findExistingGroupByName result:', { data, error });

    if (error || !data || data.length === 0) {
        return null;
    }

    const groupId = (data[0] as any).meal_group_id;

    // Count meals in this group
    const { count } = await supabase
        .from('meal_logs')
        .select('*', { count: 'exact', head: true })
        .eq('meal_group_id', groupId);

    return {
        groupId: groupId,
        mealCount: count || 0
    };
}

// Add multiple meals to a group (creates new or adds to existing)
export async function addMealsToGroup(
    mealIds: string[], 
    groupName: string,
    existingGroupId?: string
): Promise<{ success: boolean; isNewGroup: boolean; totalItems: number }> {
    const groupId = existingGroupId || generateMealGroupId();
    
    const { error } = await supabase
        .from('meal_logs')
        // @ts-expect-error - Supabase type inference issue
        .update({ 
            meal_group_id: groupId, 
            meal_group_name: groupName 
        })
        .in('id', mealIds);

    if (error) {
        console.error('Error adding meals to group:', error);
        return { success: false, isNewGroup: !existingGroupId, totalItems: 0 };
    }

    // Count total items in the group now
    const { count } = await supabase
        .from('meal_logs')
        .select('*', { count: 'exact', head: true })
        .eq('meal_group_id', groupId);

    return { 
        success: true, 
        isNewGroup: !existingGroupId,
        totalItems: count || mealIds.length
    };
}

// Remove a meal from its group (ungroup)
export async function removeMealFromGroup(mealId: string): Promise<boolean> {
    const { error } = await supabase
        .from('meal_logs')
        // @ts-expect-error - Supabase type inference issue
        .update({ 
            meal_group_id: null, 
            meal_group_name: null 
        })
        .eq('id', mealId);

    if (error) {
        console.error('Error removing meal from group:', error);
        return false;
    }

    return true;
}

// Ungroup all meals in a group (removes group association but keeps the meals)
export async function ungroupAllMeals(groupId: string): Promise<boolean> {
    const { error } = await supabase
        .from('meal_logs')
        // @ts-expect-error - Supabase type inference issue
        .update({ 
            meal_group_id: null, 
            meal_group_name: null 
        })
        .eq('meal_group_id', groupId);

    if (error) {
        console.error('Error ungrouping meals:', error);
        return false;
    }

    return true;
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

// Calculate daily totals from pre-fetched meals (synchronous, no API call)
export function calculateDailyTotalsFromMeals(meals: MealLog[]): DailyTotals {
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

// Combined fetch - returns both meals and totals in a single API call
export async function fetchMealsAndTotals(userId: string, date: Date): Promise<{ meals: MealLog[]; totals: DailyTotals }> {
    const meals = await fetchMealsForDate(userId, date);
    const totals = calculateDailyTotalsFromMeals(meals);
    return { meals, totals };
}

export async function calculateDailyTotals(userId: string, date: Date): Promise<DailyTotals> {
    const meals = await fetchMealsForDate(userId, date);
    return calculateDailyTotalsFromMeals(meals);
}

// Group meals by meal_group_id for display
export function groupMealsForDisplay(meals: MealLog[]): GroupedMeal[] {
    const groupMap = new Map<string, MealLog[]>();
    const ungroupedMeals: MealLog[] = [];

    // Separate grouped and ungrouped meals
    meals.forEach(meal => {
        if (meal.meal_group_id) {
            const existing = groupMap.get(meal.meal_group_id) || [];
            existing.push(meal);
            groupMap.set(meal.meal_group_id, existing);
        } else {
            ungroupedMeals.push(meal);
        }
    });

    const result: GroupedMeal[] = [];

    // Add grouped meals
    groupMap.forEach((groupMeals, groupId) => {
        const totals = groupMeals.reduce(
            (acc, meal) => ({
                calories: acc.calories + meal.calories,
                protein: acc.protein + meal.protein,
                carbs: acc.carbs + meal.carbs,
                fat: acc.fat + meal.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        // Get the group name from any meal in the group (they should all have the same)
        const groupName = groupMeals[0].meal_group_name;
        
        // Find the latest logged_at time
        const latestLoggedAt = groupMeals.reduce((latest, meal) => 
            meal.logged_at > latest ? meal.logged_at : latest, groupMeals[0].logged_at);

        result.push({
            groupId,
            groupName,
            meals: groupMeals.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()),
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            latestLoggedAt,
        });
    });

    // Add ungrouped meals as individual "groups"
    ungroupedMeals.forEach(meal => {
        result.push({
            groupId: null,
            groupName: null,
            meals: [meal],
            totalCalories: meal.calories,
            totalProtein: meal.protein,
            totalCarbs: meal.carbs,
            totalFat: meal.fat,
            latestLoggedAt: meal.logged_at,
        });
    });

    // Sort by latest logged_at (most recent first)
    return result.sort((a, b) => new Date(b.latestLoggedAt).getTime() - new Date(a.latestLoggedAt).getTime());
}

// Generate a UUID for meal grouping
export function generateMealGroupId(): string {
    return crypto.randomUUID();
}

// Delete all meals in a group
export async function deleteMealGroup(groupId: string): Promise<boolean> {
    const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('meal_group_id', groupId);

    if (error) {
        console.error('Error deleting meal group:', error);
        return false;
    }

    return true;
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
        .insert(item as any)
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
        // @ts-expect-error - Supabase type inference issue with partial updates
        .update(updates as any)
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
        .eq('activity_date', dateStr)
        .maybeSingle();

    if (error) {
        console.error('Error fetching activity:', error);
        return null;
    }

    return data;
}

export async function upsertActivity(activity: InsertManualActivity & { user_id: string }): Promise<ManualActivity | null> {
    const { data, error } = await supabase
        .from('manual_activity')
        .upsert(activity as any)
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

export async function analyzeMealImage(
    imageBase64: string, 
    hint?: string, 
    exclusions?: string[]
): Promise<MealAnalysis | null> {
    try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            console.error('OpenAI API key not configured');
            return null;
        }

        // Build the prompt with optional hint and exclusions
        let promptText = 'Analyze this meal and provide nutrition estimates.';
        
        if (hint) {
            promptText += ` Hint from user: "${hint}".`;
        }
        
        if (exclusions && exclusions.length > 0) {
            promptText += ` IMPORTANT: This meal is definitely NOT any of the following: ${exclusions.join(', ')}. Please identify something else.`;
        }
        
        promptText += ' Return ONLY a JSON object with this exact format: {"description": "meal description", "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": number}. All macro values should be in grams.';

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                max_output_tokens: 300,
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: promptText
                            },
                            {
                                type: 'input_image',
                                image_url: `data:image/jpeg;base64,${imageBase64}`,
                            }
                        ]
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json();



        // Try multiple ways to extract content from the response
        let content = '';

        // Try result.output_text first
        if (result.output_text) {
            content = result.output_text.trim();
        }

        // Try result.output array
        if (!content && Array.isArray(result.output) && result.output.length > 0) {
            // Check first item in output array
            const firstOutput = result.output[0];


            // Try different possible structures
            if (firstOutput.text) {
                content = firstOutput.text;
            } else if (firstOutput.content) {
                // Check if content is an array (new API structure)
                if (Array.isArray(firstOutput.content) && firstOutput.content.length > 0) {
                    const firstContent = firstOutput.content[0];
                    if (firstContent.text) {
                        content = firstContent.text;
                    } else if (typeof firstContent === 'string') {
                        content = firstContent;
                    }
                } else if (typeof firstOutput.content === 'string') {
                    content = firstOutput.content;
                }
            } else if (firstOutput.type === 'output_text' && firstOutput.text) {
                content = firstOutput.text;
            }

            // If still no content, try concatenating all output items
            if (!content) {
                content = result.output
                    .map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item.text) return item.text;
                        // Handle nested content array
                        if (Array.isArray(item.content)) {
                            return item.content
                                .map((c: any) => c.text || c)
                                .join('\n');
                        }
                        if (item.content) return item.content;
                        return '';
                    })
                    .join('\n')
                    .trim();
            }
        }



        // Ensure content is a string before using .match()
        // If content is an object, it might already be the parsed JSON we need
        let contentStr: string;
        if (typeof content === 'string') {
            contentStr = content;
        } else if (typeof content === 'object' && content !== null) {
            // If it's already an object, try to use it directly
            const analysis = content as any;
            return {
                description: analysis.description || 'Unknown meal',
                calories: Math.round(analysis.calories || 0),
                protein: Math.round(analysis.protein || 0),
                carbs: Math.round(analysis.carbs || 0),
                fat: Math.round(analysis.fat || 0),
                confidence: analysis.confidence || 0.5,
            };
        } else {
            console.warn('OpenAI returned empty or invalid output. Full response:', result);
            throw new Error('No valid response from OpenAI');
        }

        // Extract JSON safely (remove extra text if needed)
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('Could not find JSON in model output:', content);
            throw new Error('OpenAI returned invalid JSON');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return {
            description: analysis.description || 'Unknown meal',
            calories: Math.round(analysis.calories || 0),
            protein: Math.round(analysis.protein || 0),
            carbs: Math.round(analysis.carbs || 0),
            fat: Math.round(analysis.fat || 0),
            confidence: analysis.confidence || 0.5,
        };
    } catch (error: any) {
        console.error('Error analyzing meal:', error);
        throw new Error(error.message || 'Error analyzing meal');
    }
}

// Re-analyze with accumulated exclusions (for "it's not X" corrections)
export async function reanalyzeMealImage(
    imageBase64: string,
    exclusions: string[],
    hint?: string
): Promise<MealAnalysis | null> {
    try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            console.error('OpenAI API key not configured');
            return null;
        }

        // Build a more emphatic prompt for re-analysis
        let promptText = 'Analyze this meal and provide nutrition estimates.';
        
        if (hint) {
            promptText += ` User hint: "${hint}".`;
        }
        
        // Emphasize the exclusions strongly
        if (exclusions.length > 0) {
            const exclusionList = exclusions.map(e => `"${e}"`).join(', ');
            promptText += ` CRITICAL: The user has confirmed this meal is DEFINITELY NOT: ${exclusionList}. You MUST identify a DIFFERENT dish. Think of other similar-looking dishes that are NOT in this exclusion list.`;
        }
        
        promptText += ' Return ONLY a JSON object with this exact format: {"description": "meal description", "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": number}. All macro values should be in grams. For Asian/Malaysian foods, use typical serving sizes.';

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                max_output_tokens: 300,
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: promptText
                            },
                            {
                                type: 'input_image',
                                image_url: `data:image/jpeg;base64,${imageBase64}`,
                            }
                        ]
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json();

        // Extract content (same logic as analyzeMealImage)
        let content = '';

        if (result.output_text) {
            content = result.output_text.trim();
        }

        if (!content && Array.isArray(result.output) && result.output.length > 0) {
            const firstOutput = result.output[0];

            if (firstOutput.text) {
                content = firstOutput.text;
            } else if (firstOutput.content) {
                if (Array.isArray(firstOutput.content) && firstOutput.content.length > 0) {
                    const firstContent = firstOutput.content[0];
                    if (firstContent.text) {
                        content = firstContent.text;
                    } else if (typeof firstContent === 'string') {
                        content = firstContent;
                    }
                } else if (typeof firstOutput.content === 'string') {
                    content = firstOutput.content;
                }
            } else if (firstOutput.type === 'output_text' && firstOutput.text) {
                content = firstOutput.text;
            }

            if (!content) {
                content = result.output
                    .map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item.text) return item.text;
                        if (Array.isArray(item.content)) {
                            return item.content
                                .map((c: any) => c.text || c)
                                .join('\n');
                        }
                        if (item.content) return item.content;
                        return '';
                    })
                    .join('\n')
                    .trim();
            }
        }

        let contentStr: string;
        if (typeof content === 'string') {
            contentStr = content;
        } else if (typeof content === 'object' && content !== null) {
            const analysis = content as any;
            return {
                description: analysis.description || 'Unknown meal',
                calories: Math.round(analysis.calories || 0),
                protein: Math.round(analysis.protein || 0),
                carbs: Math.round(analysis.carbs || 0),
                fat: Math.round(analysis.fat || 0),
                confidence: analysis.confidence || 0.5,
            };
        } else {
            console.warn('OpenAI returned empty or invalid output. Full response:', result);
            throw new Error('No valid response from OpenAI');
        }

        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('Could not find JSON in model output:', content);
            throw new Error('OpenAI returned invalid JSON');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return {
            description: analysis.description || 'Unknown meal',
            calories: Math.round(analysis.calories || 0),
            protein: Math.round(analysis.protein || 0),
            carbs: Math.round(analysis.carbs || 0),
            fat: Math.round(analysis.fat || 0),
            confidence: analysis.confidence || 0.5,
        };
    } catch (error: any) {
        console.error('Error re-analyzing meal:', error);
        throw new Error(error.message || 'Error re-analyzing meal');
    }
}

export async function analyzeMealByText(mealDescription: string): Promise<MealAnalysis | null> {
    try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            console.error('OpenAI API key not configured');
            return null;
        }

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                max_output_tokens: 300,
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: `Analyze this meal/food item and provide nutrition estimates: "${mealDescription}". Return ONLY a JSON object with this exact format: {"description": "meal description", "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": number}. All macro values should be in grams. For Malaysian/Asian foods, use typical serving sizes.`
                            }
                        ]
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json();


        // Extract content using the same logic as analyzeMealImage
        let content = '';

        if (result.output_text) {
            content = result.output_text.trim();
        }

        if (!content && Array.isArray(result.output) && result.output.length > 0) {
            const firstOutput = result.output[0];

            if (firstOutput.text) {
                content = firstOutput.text;
            } else if (firstOutput.content) {
                if (Array.isArray(firstOutput.content) && firstOutput.content.length > 0) {
                    const firstContent = firstOutput.content[0];
                    if (firstContent.text) {
                        content = firstContent.text;
                    } else if (typeof firstContent === 'string') {
                        content = firstContent;
                    }
                } else if (typeof firstOutput.content === 'string') {
                    content = firstOutput.content;
                }
            }

            if (!content) {
                content = result.output
                    .map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item.text) return item.text;
                        if (Array.isArray(item.content)) {
                            return item.content
                                .map((c: any) => c.text || c)
                                .join('\n');
                        }
                        if (item.content) return item.content;
                        return '';
                    })
                    .join('\n')
                    .trim();
            }
        }



        let contentStr: string;
        if (typeof content === 'string') {
            contentStr = content;
        } else if (typeof content === 'object' && content !== null) {
            const analysis = content as any;
            return {
                description: analysis.description || mealDescription,
                calories: Math.round(analysis.calories || 0),
                protein: Math.round(analysis.protein || 0),
                carbs: Math.round(analysis.carbs || 0),
                fat: Math.round(analysis.fat || 0),
                confidence: analysis.confidence || 0.5,
            };
        } else {
            console.warn('OpenAI returned empty or invalid output. Full response:', result);
            throw new Error('No valid response from OpenAI');
        }

        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('Could not find JSON in model output:', content);
            throw new Error('OpenAI returned invalid JSON');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return {
            description: analysis.description || mealDescription,
            calories: Math.round(analysis.calories || 0),
            protein: Math.round(analysis.protein || 0),
            carbs: Math.round(analysis.carbs || 0),
            fat: Math.round(analysis.fat || 0),
            confidence: analysis.confidence || 0.5,
        };
    } catch (error: any) {
        console.error('Error analyzing meal by text:', error);
        throw new Error(error.message || 'Error analyzing meal');
    }
}

// Helper function to compress image before sending to API
export function compressImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
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
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// ============================================
// ACCESS CODES (SECURITY)
// ============================================

export async function verifyAccessCode(code: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('access_codes')
        .select('id')
        .eq('code', code)
        .single();

    if (error || !data) {
        return false;
    }

    return true;
}

// ============================================
// HISTORY & REPORTING
// ============================================

export interface DailySummary {
    date: Date;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
}

export async function fetchDailyHistory(userId: string, days: number = 7): Promise<DailySummary[]> {
    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    return fetchDailyHistoryByRange(userId, startDate, endDate);
}

// Helper to get local date string (YYYY-MM-DD) from a Date object
function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Optimized version with date range for faster loading
export async function fetchDailyHistoryByRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
): Promise<DailySummary[]> {
    // Normalize dates to start/end of day in local time
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch only aggregated data we need (calories, protein, carbs, fat)
    const { data, error } = await supabase
        .from('meal_logs')
        .select('logged_at, calories, protein, carbs, fat')
        .eq('user_id', userId)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: false });

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    const meals = data as Pick<MealLog, 'logged_at' | 'calories' | 'protein' | 'carbs' | 'fat'>[];

    // Calculate number of days in range (add 1 to include both start and end dates)
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Group by date using local dates consistently
    const historyMap = new Map<string, DailySummary>();

    // Initialize all days in range with 0
    for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = getLocalDateString(d);
        historyMap.set(dateStr, {
            date: new Date(d),
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            mealCount: 0
        });
    }

    // Aggregate meals using local date for grouping
    meals?.forEach(meal => {
        const mealDate = new Date(meal.logged_at);
        const dateStr = getLocalDateString(mealDate);
        const daySummary = historyMap.get(dateStr);
        if (daySummary) {
            daySummary.calories += meal.calories;
            daySummary.protein += meal.protein;
            daySummary.carbs += meal.carbs;
            daySummary.fat += meal.fat;
            daySummary.mealCount += 1;
        }
    });

    // Convert map to array and sort by date descending (newest first)
    return Array.from(historyMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}


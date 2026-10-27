import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl } from './supabase';
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
): Promise<{ calories: number; protein: number; carbs: number; fat: number; sugar: number }> {
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

    // Sugar: limit of 10% of calories (WHO guideline), 4 cal per gram
    const sugar = sugarTargetForCalories(calories);

    return {
        calories: Math.round(calories),
        protein,
        carbs,
        fat,
        sugar,
    };
}

export function sugarTargetForCalories(calories: number): number {
    return Math.round((calories * 0.1) / 4);
}

export async function upsertNutritionTargets(
    userId: string,
    targets: { calories: number; protein: number; carbs: number; fat: number; sugar: number }
): Promise<NutritionTargets | null> {
    const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert({
            user_id: userId,
            calories_target: targets.calories,
            protein_target: targets.protein,
            carbs_target: targets.carbs,
            fat_target: targets.fat,
            sugar_target: targets.sugar,
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
            sugar: totals.sugar + (meal.sugar || 0),
            mealCount: totals.mealCount + 1,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, mealCount: 0 }
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
                sugar: acc.sugar + (meal.sugar || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }
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
            totalSugar: totals.sugar,
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
            totalSugar: meal.sugar || 0,
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
// AI MEAL ANALYSIS
// ============================================

// OpenAI is called through the server's /ai/v1 proxy, which holds the API key and only
// accepts logged-in users, so the key never ships in the browser bundle.
async function callOpenAI(body: unknown): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('Your session has expired. Please log in again.');
    }

    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/ai/v1/responses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
    });

    // Anything other than JSON means the request never reached the proxy (wrong URL, server down)
    if (!response.headers.get('Content-Type')?.includes('application/json')) {
        throw new Error(`AI server returned an unexpected response (${response.status}). Please try again later.`);
    }

    return response;
}

// Shared by photo and text analysis. Strict JSON schema, so the model can only answer with
// these fields (no prose, no malformed JSON).
const MEAL_ANALYSIS_FORMAT = {
    type: 'json_schema',
    name: 'meal_analysis',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            description: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            sugar: { type: 'number' },
            confidence: { type: 'number' },
        },
        required: ['description', 'calories', 'protein', 'carbs', 'fat', 'sugar', 'confidence'],
        additionalProperties: false,
    },
};

const MEAL_ANALYSIS_INSTRUCTIONS = `You are a nutritionist estimating the nutrition of a single meal for a food diary app used mainly in Malaysia and Southeast Asia.
- Identify the dish(es) and estimate the portion actually shown or described. In a photo, use the plate, bowl, cutlery or packaging for scale. If the portion is unclear, assume a typical local serving.
- Include hidden calories: cooking oil, coconut milk, butter, sauces, gravy, sambal, and sugar in drinks, desserts and sauces.
- protein, carbs, fat and sugar are grams for the whole portion. sugar is total sugars and is part of carbs, so sugar must not exceed carbs.
- Keep the numbers consistent: calories should be close to 4 x protein + 4 x carbs + 9 x fat.
- description: a short dish name with the portion, e.g. "Nasi lemak with fried chicken (1 plate)".
- confidence: 0 to 1, how sure you are about both the dish and the portion size.`;

function toMealAnalysis(raw: any, fallbackDescription: string): MealAnalysis {
    const carbs = Math.max(0, Math.round(raw.carbs || 0));
    return {
        description: raw.description || fallbackDescription,
        calories: Math.max(0, Math.round(raw.calories || 0)),
        protein: Math.max(0, Math.round(raw.protein || 0)),
        carbs,
        fat: Math.max(0, Math.round(raw.fat || 0)),
        sugar: Math.min(carbs, Math.max(0, Math.round(raw.sugar || 0))),
        confidence: raw.confidence || 0.5,
    };
}

async function requestMealAnalysis(
    model: 'gpt-4.1' | 'gpt-5-nano',
    content: unknown[],
    fallbackDescription: string,
): Promise<MealAnalysis> {
    const response = await callOpenAI({
        model,
        // gpt-5-nano is a reasoning model; its reasoning tokens count toward max_output_tokens
        ...(model === 'gpt-5-nano'
            ? { max_output_tokens: 800, reasoning: { effort: 'minimal' } }
            : { max_output_tokens: 400, temperature: 0.2 }),
        instructions: MEAL_ANALYSIS_INSTRUCTIONS,
        text: { format: MEAL_ANALYSIS_FORMAT },
        input: [{ role: 'user', content }],
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || response.statusText;
        console.error('OpenAI API Error:', errorData);
        throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();

    // gpt-5 models put a "reasoning" item before the message, so look through all output items
    const parts = (Array.isArray(result.output) ? result.output : [])
        .filter((item: any) => item.type === 'message' && Array.isArray(item.content))
        .flatMap((item: any) => item.content);

    const refusal = parts.find((part: any) => part.type === 'refusal');
    if (refusal) {
        throw new Error(`The AI couldn't analyze this meal: ${refusal.refusal}`);
    }

    const text = (typeof result.output_text === 'string' && result.output_text) || parts
        .filter((part: any) => part.type === 'output_text' && part.text)
        .map((part: any) => part.text)
        .join('');

    if (!text) {
        if (result.status === 'incomplete') {
            const reason = result.incomplete_details?.reason || 'unknown reason';
            throw new Error(`OpenAI returned an incomplete response (${reason})`);
        }
        console.warn('OpenAI returned empty output. Full response:', result);
        throw new Error('No valid response from OpenAI');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.warn('Could not find JSON in model output:', text);
        throw new Error('OpenAI returned invalid JSON');
    }

    return toMealAnalysis(JSON.parse(jsonMatch[0]), fallbackDescription);
}

function mealImageInput(imageBase64: string, promptText: string): unknown[] {
    return [
        { type: 'input_text', text: promptText },
        { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}` },
    ];
}

export async function analyzeMealImage(
    imageBase64: string,
    hint?: string,
    exclusions?: string[]
): Promise<MealAnalysis | null> {
    try {
        let promptText = 'Estimate the nutrition of the meal in this photo.';

        if (hint) {
            promptText += ` The user says: "${hint}". Trust this for what the food is and how much was eaten.`;
        }

        if (exclusions && exclusions.length > 0) {
            promptText += ` This meal is definitely NOT any of the following: ${exclusions.join(', ')}. Identify something else.`;
        }

        return await requestMealAnalysis('gpt-4.1', mealImageInput(imageBase64, promptText), 'Unknown meal');
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
        let promptText = 'Estimate the nutrition of the meal in this photo.';

        if (hint) {
            promptText += ` The user says: "${hint}". Trust this for what the food is and how much was eaten.`;
        }

        // Emphasize the exclusions strongly
        if (exclusions.length > 0) {
            const exclusionList = exclusions.map(e => `"${e}"`).join(', ');
            promptText += ` CRITICAL: The user has confirmed this meal is DEFINITELY NOT: ${exclusionList}. You MUST identify a DIFFERENT dish. Consider other similar-looking dishes that are NOT in this list, then estimate its nutrition.`;
        }

        return await requestMealAnalysis('gpt-4.1', mealImageInput(imageBase64, promptText), 'Unknown meal');
    } catch (error: any) {
        console.error('Error re-analyzing meal:', error);
        throw new Error(error.message || 'Error re-analyzing meal');
    }
}

export async function analyzeMealByText(mealDescription: string): Promise<MealAnalysis | null> {
    try {
        return await requestMealAnalysis(
            'gpt-5-nano',
            [{ type: 'input_text', text: `Estimate the nutrition of this meal: "${mealDescription}"` }],
            mealDescription,
        );
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

// The access_codes table isn't readable from the browser; this database function only
// answers whether a code is valid.
export async function verifyAccessCode(code: string): Promise<boolean> {
    // The hand-written Database type has no Functions section, so call rpc on the untyped client
    const { data, error } = await (supabase as unknown as SupabaseClient).rpc('check_access_code', { p_code: code });

    if (error) {
        return false;
    }

    return data === true;
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
    sugar: number;
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

    // Fetch only aggregated data we need (calories, protein, carbs, fat, sugar)
    const { data, error } = await supabase
        .from('meal_logs')
        .select('logged_at, calories, protein, carbs, fat, sugar')
        .eq('user_id', userId)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: false });

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    const meals = data as Pick<MealLog, 'logged_at' | 'calories' | 'protein' | 'carbs' | 'fat' | 'sugar'>[];

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
            sugar: 0,
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
            daySummary.sugar += meal.sugar || 0;
            daySummary.mealCount += 1;
        }
    });

    // Convert map to array and sort by date descending (newest first)
    return Array.from(historyMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ============================================
// FAQ AI ASSISTANT
// ============================================

export interface FAQContext {
    caloriesTarget: number;
    caloriesConsumed: number;
    proteinTarget: number;
    proteinConsumed: number;
    carbsTarget: number;
    carbsConsumed: number;
    fatTarget: number;
    fatConsumed: number;
    sugarTarget: number;
    sugarConsumed: number;
    location?: string;
    goal?: string;
    mealsLeft?: number;
}

export async function askFAQQuestion(
    question: string,
    context: FAQContext
): Promise<string> {
    try {
        const remainingCalories = context.caloriesTarget - context.caloriesConsumed;
        const remainingProtein = context.proteinTarget - context.proteinConsumed;
        const remainingCarbs = context.carbsTarget - context.carbsConsumed;
        const remainingFat = context.fatTarget - context.fatConsumed;
        const remainingSugar = context.sugarTarget - context.sugarConsumed;
        const round = (n: number) => Math.round(n);

        const systemPrompt = `You are a practical nutrition coach inside a meal tracking app.

Today's numbers for the user (negative "remaining" means they are already over):
- Calories: target ${round(context.caloriesTarget)} kcal, eaten ${round(context.caloriesConsumed)} kcal, remaining ${round(remainingCalories)} kcal
- Protein: target ${round(context.proteinTarget)}g, eaten ${round(context.proteinConsumed)}g, remaining ${round(remainingProtein)}g
- Carbs: target ${round(context.carbsTarget)}g, eaten ${round(context.carbsConsumed)}g, remaining ${round(remainingCarbs)}g
- Fat: target ${round(context.fatTarget)}g, eaten ${round(context.fatConsumed)}g, remaining ${round(remainingFat)}g
- Sugar: limit ${round(context.sugarTarget)}g, eaten ${round(context.sugarConsumed)}g, remaining ${round(remainingSugar)}g
${context.location ? `- Location: ${context.location}` : ''}
${context.goal ? `- Goal: ${context.goal}` : ''}
${context.mealsLeft ? `- Meals left today: ${context.mealsLeft}` : ''}

How to answer:
- Answer the user's question directly first, then give the reasoning briefly.
- Protein is the priority to reach; calories and fat are budgets; sugar is a limit to stay under, not a goal to hit.
- Suggest specific dishes or foods that are easy to get${context.location ? ` in ${context.location}` : ''}, each with approximate calories, protein, carbs, fat and sugar.
${context.mealsLeft ? `- Split the remaining budget across ${context.mealsLeft} meal${context.mealsLeft > 1 ? 's' : ''} and give per-meal numbers.` : ''}
- If the user is already over a budget, say so plainly and suggest lighter options, without lecturing.
- Keep it short: plain text with simple "-" bullet points, no tables, no markdown headings, under 200 words.`;

        // Same Responses API as the meal photo analysis. gpt-5-nano is a reasoning model: it
        // rejects temperature, and reasoning tokens count toward max_output_tokens, so keep
        // reasoning minimal and leave headroom for the answer.
        const response = await callOpenAI({
            model: 'gpt-5-nano',
            max_output_tokens: 2000,
            reasoning: {
                effort: 'minimal',
            },
            instructions: systemPrompt,
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: question
                        }
                    ]
                }
            ]
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json();

        if (result.status === 'incomplete') {
            console.warn('FAQ answer incomplete:', result.incomplete_details);
        }

        // The REST API has no output_text shortcut; collect the text parts of the message output
        // (gpt-5 models put a "reasoning" item before the message)
        const answer = typeof result.output_text === 'string' && result.output_text
            ? result.output_text
            : (Array.isArray(result.output) ? result.output : [])
                .filter((item: any) => item.type === 'message' && Array.isArray(item.content))
                .flatMap((item: any) => item.content)
                .filter((part: any) => part.type === 'output_text' && part.text)
                .map((part: any) => part.text)
                .join('\n');

        return answer.trim() || 'Sorry, I could not generate a response.';
    } catch (error: any) {
        console.error('Error asking FAQ question:', error);
        throw new Error(error.message || 'Error getting AI response');
    }
}

// ============================================
// BARCODE FOOD LOOKUP (Open Food Facts API)
// ============================================

export interface BarcodeProduct {
    barcode: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    servingSize?: string;
    imageUrl?: string;
    found: boolean;
}

export async function lookupFoodByBarcode(barcode: string): Promise<BarcodeProduct> {
    try {
        // Use Open Food Facts API (free, no API key required)
        // Note: No custom headers to avoid CORS preflight issues
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
        );

        if (!response.ok) {
            console.error('Open Food Facts API error:', response.status, response.statusText);
            return {
                barcode,
                name: 'Product not found',
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                sugar: 0,
                found: false,
            };
        }

        const data = await response.json();
        console.log('Open Food Facts response:', data);

        if (data.status !== 1 || !data.product) {
            return {
                barcode,
                name: 'Product not found',
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                sugar: 0,
                found: false,
            };
        }

        const product = data.product;
        const nutriments = product.nutriments || {};

        // Get values per 100g (standard) or per serving
        const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
        const protein = Math.round(nutriments.proteins_100g || nutriments.proteins || 0);
        const carbs = Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
        const fat = Math.round(nutriments.fat_100g || nutriments.fat || 0);
        const sugar = Math.round(nutriments.sugars_100g || nutriments.sugars || 0);

        return {
            barcode,
            name: product.product_name || product.product_name_en || 'Unknown Product',
            brand: product.brands || undefined,
            calories,
            protein,
            carbs,
            fat,
            sugar,
            servingSize: product.serving_size || '100g',
            imageUrl: product.image_front_small_url || product.image_url || undefined,
            found: true,
        };
    } catch (error) {
        console.error('Error looking up barcode:', error);
        return {
            barcode,
            name: 'Error looking up product',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            sugar: 0,
            found: false,
        };
    }
}

// ============================================
// WEEKLY & MONTHLY AVERAGES
// ============================================

export interface NutritionAverages {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    avgSugar: number;
    totalDays: number;
    daysWithMeals: number;
    totalMeals: number;
}

export async function getWeeklyAverages(userId: string, date: Date): Promise<NutritionAverages> {
    // Get the start of the week (Monday) containing the given date
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // End of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const history = await fetchDailyHistoryByRange(userId, startOfWeek, endOfWeek);

    const daysWithMeals = history.filter(day => day.mealCount > 0);
    const totalMeals = history.reduce((sum, day) => sum + day.mealCount, 0);

    if (daysWithMeals.length === 0) {
        return {
            avgCalories: 0,
            avgProtein: 0,
            avgCarbs: 0,
            avgFat: 0,
            avgSugar: 0,
            totalDays: 7,
            daysWithMeals: 0,
            totalMeals: 0,
        };
    }

    const totals = daysWithMeals.reduce(
        (acc, day) => ({
            calories: acc.calories + day.calories,
            protein: acc.protein + day.protein,
            carbs: acc.carbs + day.carbs,
            fat: acc.fat + day.fat,
            sugar: acc.sugar + day.sugar,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }
    );

    return {
        avgCalories: Math.round(totals.calories / daysWithMeals.length),
        avgProtein: Math.round(totals.protein / daysWithMeals.length),
        avgCarbs: Math.round(totals.carbs / daysWithMeals.length),
        avgFat: Math.round(totals.fat / daysWithMeals.length),
        avgSugar: Math.round(totals.sugar / daysWithMeals.length),
        totalDays: 7,
        daysWithMeals: daysWithMeals.length,
        totalMeals,
    };
}

export async function getMonthlyAverages(userId: string, month: number, year: number): Promise<NutritionAverages> {
    // month is 1-indexed (1 = January, 12 = December)
    const startOfMonth = new Date(year, month - 1, 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Last day of the month
    const endOfMonth = new Date(year, month, 0); // Day 0 of next month = last day of current month
    endOfMonth.setHours(23, 59, 59, 999);

    const totalDaysInMonth = endOfMonth.getDate();

    const history = await fetchDailyHistoryByRange(userId, startOfMonth, endOfMonth);

    const daysWithMeals = history.filter(day => day.mealCount > 0);
    const totalMeals = history.reduce((sum, day) => sum + day.mealCount, 0);

    if (daysWithMeals.length === 0) {
        return {
            avgCalories: 0,
            avgProtein: 0,
            avgCarbs: 0,
            avgFat: 0,
            avgSugar: 0,
            totalDays: totalDaysInMonth,
            daysWithMeals: 0,
            totalMeals: 0,
        };
    }

    const totals = daysWithMeals.reduce(
        (acc, day) => ({
            calories: acc.calories + day.calories,
            protein: acc.protein + day.protein,
            carbs: acc.carbs + day.carbs,
            fat: acc.fat + day.fat,
            sugar: acc.sugar + day.sugar,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }
    );

    return {
        avgCalories: Math.round(totals.calories / daysWithMeals.length),
        avgProtein: Math.round(totals.protein / daysWithMeals.length),
        avgCarbs: Math.round(totals.carbs / daysWithMeals.length),
        avgFat: Math.round(totals.fat / daysWithMeals.length),
        avgSugar: Math.round(totals.sugar / daysWithMeals.length),
        totalDays: totalDaysInMonth,
        daysWithMeals: daysWithMeals.length,
        totalMeals,
    };
}

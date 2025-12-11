import { useState, useEffect, useCallback } from 'react';
import { MealService, MealLog } from '../services/meals';
import { QuickItemService, QuickItem } from '../services/quickItems';

const USER_ID = 'user_123'; // Mock User ID

export function useDashboardData() {
    const [meals, setMeals] = useState<MealLog[]>([]);
    const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
    const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Mock targets
    const targets = { calories: 2500, protein: 180 };

    const loadData = useCallback(async () => {
        const [fetchedMeals, fetchedQuickItems] = await Promise.all([
            MealService.getTodayMeals(USER_ID),
            QuickItemService.getQuickItems(USER_ID)
        ]);

        setMeals(fetchedMeals);
        setQuickItems(fetchedQuickItems);

        // Calculate totals
        const dailyTotals = await MealService.calculateDailyTotals(fetchedMeals);
        setTotals(dailyTotals);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        meals,
        quickItems,
        totals,
        targets,
        userId: USER_ID,
        refreshMeals: loadData
    };
}

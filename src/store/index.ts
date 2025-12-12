import { create } from 'zustand';
import type { Profile, NutritionTargets, DailyTotals } from '../types';

interface AppState {
    profile: Profile | null;
    nutritionTargets: NutritionTargets | null;
    dailyTotals: DailyTotals;
    selectedDate: Date;

    setProfile: (profile: Profile | null) => void;
    setNutritionTargets: (targets: NutritionTargets | null) => void;
    setDailyTotals: (totals: DailyTotals) => void;
    setSelectedDate: (date: Date) => void;
}

export const useStore = create<AppState>((set) => ({
    profile: null,
    nutritionTargets: null,
    dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
    selectedDate: new Date(),

    setProfile: (profile) => set({ profile }),
    setNutritionTargets: (nutritionTargets) => set({ nutritionTargets }),
    setDailyTotals: (dailyTotals) => set({ dailyTotals }),
    setSelectedDate: (selectedDate) => set({ selectedDate }),
}));

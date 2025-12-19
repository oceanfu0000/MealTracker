import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDailyHistoryByRange, fetchMealsForDate, groupMealsForDisplay, DailySummary } from '../lib/api';
import type { MealLog, GroupedMeal } from '../types';
import { useStore } from '../store';

// Lazy load heavy card component
const GroupedMealCard = lazy(() => import('../components/GroupedMealCard'));

interface HistoryPageProps {
    userId: string;
}

// Helper to format date for input
const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Helper to get default date range (last 7 days)
const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // 7 days including today
    return { startDate, endDate };
};

export default function HistoryPage({ userId }: HistoryPageProps) {
    const navigate = useNavigate();
    const { nutritionTargets } = useStore();
    const [history, setHistory] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Date range state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const defaultRange = useMemo(() => getDefaultDateRange(), []);
    const [startDate, setStartDate] = useState<string>(formatDateForInput(defaultRange.startDate));
    const [endDate, setEndDate] = useState<string>(formatDateForInput(defaultRange.endDate));
    const [appliedRange, setAppliedRange] = useState({ start: startDate, end: endDate });

    // Expansion state
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [groupedDayMeals, setGroupedDayMeals] = useState<GroupedMeal[]>([]);
    const [loadingMeals, setLoadingMeals] = useState(false);

    // Cache for loaded meals to avoid re-fetching
    const [mealsCache, setMealsCache] = useState<Map<string, MealLog[]>>(new Map());

    const loadHistory = useCallback(async (start: string, end: string) => {
        setLoading(true);
        setExpandedDate(null);
        setGroupedDayMeals([]);
        try {
            const data = await fetchDailyHistoryByRange(userId, new Date(start), new Date(end));
            setHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadHistory(appliedRange.start, appliedRange.end);
    }, [loadHistory, appliedRange]);

    // Validate and apply date range
    const applyDateRange = useCallback(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays > 7) {
            alert('Please select a range of 7 days or less for optimal performance.');
            return;
        }
        if (start > end) {
            alert('Start date must be before end date.');
            return;
        }
        
        setAppliedRange({ start: startDate, end: endDate });
        setMealsCache(new Map()); // Clear cache when range changes
        setShowDatePicker(false);
    }, [startDate, endDate]);

    // Quick preset buttons
    const setPreset = useCallback((days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days + 1);
        setStartDate(formatDateForInput(start));
        setEndDate(formatDateForInput(end));
    }, []);

    // Auto-fill end date when start date changes (7 days from start, capped at today)
    const handleStartDateChange = useCallback((newStart: string) => {
        setStartDate(newStart);
        const start = new Date(newStart);
        const autoEnd = new Date(start);
        autoEnd.setDate(start.getDate() + 6); // 7 days including start
        
        // Cap at today's date
        const today = new Date();
        if (autoEnd > today) {
            setEndDate(formatDateForInput(today));
        } else {
            setEndDate(formatDateForInput(autoEnd));
        }
    }, []);

    const toggleDate = async (date: Date) => {
        const dateStr = date.toISOString();
        if (expandedDate === dateStr) {
            setExpandedDate(null);
            setGroupedDayMeals([]);
            return;
        }

        setExpandedDate(dateStr);
        
        // Check cache first
        const cacheKey = date.toISOString().split('T')[0];
        const cachedMeals = mealsCache.get(cacheKey);
        if (cachedMeals) {
            setGroupedDayMeals(groupMealsForDisplay(cachedMeals));
            return;
        }

        setLoadingMeals(true);
        try {
            const meals = await fetchMealsForDate(userId, date);
            setGroupedDayMeals(groupMealsForDisplay(meals));
            // Store in cache
            setMealsCache(prev => new Map(prev).set(cacheKey, meals));
        } catch (error) {
            console.error('Failed to load meals', error);
        } finally {
            setLoadingMeals(false);
        }
    };

    const refreshDay = useCallback(async (date: Date) => {
        const cacheKey = date.toISOString().split('T')[0];
        // Clear cache for this day
        setMealsCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(cacheKey);
            return newCache;
        });
        // Reload meals and history
        try {
            const meals = await fetchMealsForDate(userId, date);
            setGroupedDayMeals(groupMealsForDisplay(meals));
            setMealsCache(prev => new Map(prev).set(cacheKey, meals));
            loadHistory(appliedRange.start, appliedRange.end);
        } catch (error) {
            console.error('Error refreshing day:', error);
        }
    }, [userId, appliedRange.start, appliedRange.end, loadHistory]);

    // Memoize the computed meal card data to avoid recalculating on each render
    const mealCardData = useMemo(() => {
        return groupedDayMeals.map((group) => {
            const otherUngroupedMeals = groupedDayMeals.filter(
                g => g.groupId === null && g.meals[0].id !== group.meals[0]?.id
            );
            const existingGroups = groupedDayMeals.filter(
                g => g.groupId !== null && g.groupId !== group.groupId
            );
            return { group, otherUngroupedMeals, existingGroups };
        });
    }, [groupedDayMeals]);

    const getBarWidth = (current: number, target: number) => {
        if (target <= 0) return 0;
        return Math.min((current / target) * 100, 100);
    };

    const getStatusColor = (current: number, target: number) => {
        const percentage = (current / target) * 100;
        if (percentage > 110) return 'bg-red-500'; // Over limit
        if (percentage < 50) return 'bg-yellow-500'; // Too low
        return 'bg-green-500'; // Good
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-24">
            <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-neutral-900">History</h1>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Date Range</span>
                    </button>
                </div>

                {/* Date Range Picker */}
                {showDatePicker && (
                    <div className="max-w-4xl mx-auto px-4 pb-4 animate-fade-in">
                        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    onClick={() => setPreset(3)}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-full hover:bg-neutral-100 transition-colors"
                                >
                                    Last 3 days
                                </button>
                                <button
                                    onClick={() => setPreset(7)}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-full hover:bg-neutral-100 transition-colors"
                                >
                                    Last 7 days
                                </button>
                            </div>
                            
                            {/* Custom Range */}
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        max={formatDateForInput(new Date())}
                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        min={startDate}
                                        max={formatDateForInput(new Date())}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    onClick={applyDateRange}
                                    className="px-4 py-2 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                            <p className="text-xs text-neutral-400 mt-2">
                                * Maximum range: 7 days for optimal loading speed
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Current Range Display */}
                <div className="text-sm text-neutral-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                        Showing: {new Date(appliedRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                        {' - '}
                        {new Date(appliedRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner" />
                    </div>
                ) : (
                    <>
                        {history.map((day) => {
                            const isExpanded = expandedDate === day.date.toISOString();
                            return (
                                <div key={day.date.toISOString()} className="card overflow-hidden animate-fade-in">
                                    <button
                                        onClick={() => toggleDate(day.date)}
                                        className="w-full p-4 text-left hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-neutral-400" />
                                                <span className="font-semibold text-neutral-900">
                                                    {day.date.toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-neutral-500">
                                                    {day.mealCount} meals
                                                </span>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Calories */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-neutral-600">Calories</span>
                                                    <div className="text-right">
                                                        <span className="font-medium">
                                                            {Math.round(day.calories)} / {nutritionTargets?.calories_target}
                                                        </span>
                                                        <span className={`text-xs ml-1 ${day.calories > (nutritionTargets?.calories_target || 2000) ? 'text-red-500' : 'text-neutral-500'}`}>
                                                            ({day.calories > (nutritionTargets?.calories_target || 2000) ? '+' : ''}{Math.abs(Math.round((nutritionTargets?.calories_target || 2000) - day.calories))} {day.calories > (nutritionTargets?.calories_target || 2000) ? 'over' : 'left'})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${getStatusColor(day.calories, nutritionTargets?.calories_target || 2000)}`}
                                                        style={{ width: `${getBarWidth(day.calories, nutritionTargets?.calories_target || 2000)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Macros Grid */}
                                            <div className="grid grid-cols-3 gap-3 pt-2">
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Protein</div>
                                                    <div className="text-sm font-medium">
                                                        {Math.round(day.protein)}g
                                                        <span className={`text-xs ml-1 ${day.protein > (nutritionTargets?.protein_target || 150) ? 'text-red-500' : 'text-neutral-400'}`}>
                                                            ({day.protein > (nutritionTargets?.protein_target || 150) ? '+' : ''}{Math.abs(Math.round((nutritionTargets?.protein_target || 150) - day.protein))}g {day.protein > (nutritionTargets?.protein_target || 150) ? 'over' : 'left'})
                                                        </span>
                                                    </div>
                                                    <div className="h-1 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-accent-500"
                                                            style={{ width: `${getBarWidth(day.protein, nutritionTargets?.protein_target || 150)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Carbs</div>
                                                    <div className="text-sm font-medium">
                                                        {Math.round(day.carbs)}g
                                                        <span className={`text-xs ml-1 ${day.carbs > (nutritionTargets?.carbs_target || 200) ? 'text-red-500' : 'text-neutral-400'}`}>
                                                            ({day.carbs > (nutritionTargets?.carbs_target || 200) ? '+' : ''}{Math.abs(Math.round((nutritionTargets?.carbs_target || 200) - day.carbs))}g {day.carbs > (nutritionTargets?.carbs_target || 200) ? 'over' : 'left'})
                                                        </span>
                                                    </div>
                                                    <div className="h-1 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${getBarWidth(day.carbs, nutritionTargets?.carbs_target || 200)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Fat</div>
                                                    <div className="text-sm font-medium">
                                                        {Math.round(day.fat)}g
                                                        <span className={`text-xs ml-1 ${day.fat > (nutritionTargets?.fat_target || 60) ? 'text-red-500' : 'text-neutral-400'}`}>
                                                            ({day.fat > (nutritionTargets?.fat_target || 60) ? '+' : ''}{Math.abs(Math.round((nutritionTargets?.fat_target || 60) - day.fat))}g {day.fat > (nutritionTargets?.fat_target || 60) ? 'over' : 'left'})
                                                        </span>
                                                    </div>
                                                    <div className="h-1 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-purple-500"
                                                            style={{ width: `${getBarWidth(day.fat, nutritionTargets?.fat_target || 60)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Content: Daily Meals */}
                                    {isExpanded && (
                                        <div className="border-t border-neutral-100 bg-neutral-50/50 p-4 animate-slide-down">
                                            <h3 className="text-sm font-semibold text-neutral-500 mb-3 uppercase tracking-wider">
                                                Meals Logged
                                            </h3>

                                            {loadingMeals ? (
                                                <div className="flex justify-center py-8">
                                                    <div className="spinner" />
                                                </div>
                                            ) : groupedDayMeals.length === 0 ? (
                                                <div className="text-center py-6 text-neutral-500 italic">
                                                    No meals found for this day.
                                                </div>
                                            ) : (
                                                <Suspense fallback={
                                                    <div className="flex justify-center py-8">
                                                        <div className="spinner" />
                                                    </div>
                                                }>
                                                    <div className="space-y-3">
                                                        {mealCardData.map(({ group, otherUngroupedMeals, existingGroups }) => (
                                                            <GroupedMealCard
                                                                key={group.groupId || group.meals[0].id}
                                                                group={group}
                                                                onDelete={() => refreshDay(day.date)}
                                                                otherUngroupedMeals={otherUngroupedMeals}
                                                                existingGroups={existingGroups}
                                                            />
                                                        ))}
                                                    </div>
                                                </Suspense>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

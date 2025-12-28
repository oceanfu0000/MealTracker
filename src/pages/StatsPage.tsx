import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, TrendingUp, Calendar, ChevronLeft, ChevronRight, Target, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWeeklyAverages, getMonthlyAverages, NutritionAverages } from '../lib/api';
import { useStore } from '../store';

interface StatsPageProps {
    userId: string;
}

type ViewMode = 'weekly' | 'monthly';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StatsPage({ userId }: StatsPageProps) {
    const navigate = useNavigate();
    const { nutritionTargets } = useStore();
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<NutritionAverages | null>(null);

    // Weekly navigation
    const [weekDate, setWeekDate] = useState(new Date());

    // Monthly navigation
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-indexed
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Load stats based on view mode
    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            if (viewMode === 'weekly') {
                const data = await getWeeklyAverages(userId, weekDate);
                setStats(data);
            } else {
                const data = await getMonthlyAverages(userId, selectedMonth, selectedYear);
                setStats(data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, viewMode, weekDate, selectedMonth, selectedYear]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Week navigation helpers
    const getWeekRange = (date: Date) => {
        const start = new Date(date);
        const dayOfWeek = start.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start.setDate(start.getDate() - diff);
        
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        return {
            start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };
    };

    const goToPreviousWeek = () => {
        const newDate = new Date(weekDate);
        newDate.setDate(newDate.getDate() - 7);
        setWeekDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(weekDate);
        newDate.setDate(newDate.getDate() + 7);
        // Don't go beyond current week
        if (newDate <= new Date()) {
            setWeekDate(newDate);
        }
    };

    // Month navigation helpers
    const goToPreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const goToNextMonth = () => {
        const now = new Date();
        const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
        if (isCurrentMonth) return; // Don't go beyond current month

        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const weekRange = getWeekRange(weekDate);
    const isCurrentWeek = (() => {
        const now = new Date();
        const weekStart = new Date(weekDate);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        
        const currentWeekStart = new Date(now);
        const currentDayOfWeek = currentWeekStart.getDay();
        const currentDiff = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        currentWeekStart.setDate(currentWeekStart.getDate() - currentDiff);
        
        return weekStart.toDateString() === currentWeekStart.toDateString();
    })();

    const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

    // Calculate percentage of target
    const getPercentage = (current: number, target: number) => {
        if (target <= 0) return 0;
        return Math.round((current / target) * 100);
    };

    const getStatusColor = (percentage: number) => {
        if (percentage >= 90 && percentage <= 110) return 'text-green-600';
        if (percentage >= 70 && percentage <= 130) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getBarColor = (percentage: number) => {
        if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
        if (percentage >= 70 && percentage <= 130) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-neutral-900">Statistics</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* View Mode Toggle */}
                <div className="flex bg-neutral-100 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all ${
                            viewMode === 'weekly'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        Weekly
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all ${
                            viewMode === 'monthly'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        Monthly
                    </button>
                </div>

                {/* Date Navigation */}
                <div className="card p-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={viewMode === 'weekly' ? goToPreviousWeek : goToPreviousMonth}
                            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm mb-1">
                                <Calendar className="w-4 h-4" />
                                {viewMode === 'weekly' ? 'Week of' : 'Month'}
                            </div>
                            <div className="font-semibold text-neutral-900">
                                {viewMode === 'weekly' 
                                    ? `${weekRange.start} - ${weekRange.end}`
                                    : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                                }
                            </div>
                        </div>

                        <button
                            onClick={viewMode === 'weekly' ? goToNextWeek : goToNextMonth}
                            disabled={viewMode === 'weekly' ? isCurrentWeek : isCurrentMonth}
                            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Stats Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner" />
                    </div>
                ) : stats ? (
                    <div className="space-y-4">
                        {/* Summary Card */}
                        <div className="card p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-primary-600" />
                                <h2 className="font-semibold text-neutral-900">Average Daily Intake</h2>
                            </div>

                            {stats.daysWithMeals === 0 ? (
                                <div className="text-center py-8 text-neutral-500">
                                    <Utensils className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                                    <p>No meals logged in this period</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Calories */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <span className="text-sm text-neutral-500">Calories</span>
                                                <div className="text-2xl font-bold text-neutral-900">
                                                    {stats.avgCalories.toLocaleString()}
                                                    <span className="text-sm font-normal text-neutral-500 ml-1">kcal/day</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-medium ${getStatusColor(getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000))}`}>
                                                    {getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000)}%
                                                </span>
                                                <div className="text-xs text-neutral-500">
                                                    of {nutritionTargets?.calories_target || 2000} target
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000))}`}
                                                style={{ width: `${Math.min(getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000), 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Macros Grid */}
                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                                        {/* Protein */}
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-accent-600">{stats.avgProtein}g</div>
                                            <div className="text-xs text-neutral-500 mb-2">protein/day</div>
                                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent-500 rounded-full"
                                                    style={{ width: `${Math.min(getPercentage(stats.avgProtein, nutritionTargets?.protein_target || 150), 100)}%` }}
                                                />
                                            </div>
                                            <div className={`text-xs mt-1 ${getStatusColor(getPercentage(stats.avgProtein, nutritionTargets?.protein_target || 150))}`}>
                                                {getPercentage(stats.avgProtein, nutritionTargets?.protein_target || 150)}% of target
                                            </div>
                                        </div>

                                        {/* Carbs */}
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{stats.avgCarbs}g</div>
                                            <div className="text-xs text-neutral-500 mb-2">carbs/day</div>
                                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${Math.min(getPercentage(stats.avgCarbs, nutritionTargets?.carbs_target || 250), 100)}%` }}
                                                />
                                            </div>
                                            <div className={`text-xs mt-1 ${getStatusColor(getPercentage(stats.avgCarbs, nutritionTargets?.carbs_target || 250))}`}>
                                                {getPercentage(stats.avgCarbs, nutritionTargets?.carbs_target || 250)}% of target
                                            </div>
                                        </div>

                                        {/* Fat */}
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">{stats.avgFat}g</div>
                                            <div className="text-xs text-neutral-500 mb-2">fat/day</div>
                                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${Math.min(getPercentage(stats.avgFat, nutritionTargets?.fat_target || 65), 100)}%` }}
                                                />
                                            </div>
                                            <div className={`text-xs mt-1 ${getStatusColor(getPercentage(stats.avgFat, nutritionTargets?.fat_target || 65))}`}>
                                                {getPercentage(stats.avgFat, nutritionTargets?.fat_target || 65)}% of target
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Activity Summary */}
                        <div className="card p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-5 h-5 text-primary-600" />
                                <h2 className="font-semibold text-neutral-900">Tracking Summary</h2>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-neutral-50 rounded-xl">
                                    <div className="text-3xl font-bold text-neutral-900">{stats.daysWithMeals}</div>
                                    <div className="text-xs text-neutral-500">
                                        of {stats.totalDays} days tracked
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-primary-600">
                                        {Math.round((stats.daysWithMeals / stats.totalDays) * 100)}% adherence
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-neutral-50 rounded-xl">
                                    <div className="text-3xl font-bold text-neutral-900">{stats.totalMeals}</div>
                                    <div className="text-xs text-neutral-500">total meals</div>
                                    <div className="mt-2 text-sm font-medium text-primary-600">
                                        {stats.daysWithMeals > 0 
                                            ? `${(stats.totalMeals / stats.daysWithMeals).toFixed(1)} meals/day`
                                            : '0 meals/day'
                                        }
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-neutral-50 rounded-xl">
                                    <div className="text-3xl font-bold text-neutral-900">
                                        {stats.daysWithMeals > 0 
                                            ? Math.round(stats.avgCalories * stats.daysWithMeals).toLocaleString()
                                            : 0
                                        }
                                    </div>
                                    <div className="text-xs text-neutral-500">total kcal</div>
                                    <div className="mt-2 text-sm font-medium text-primary-600">
                                        this {viewMode === 'weekly' ? 'week' : 'month'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tips Card */}
                        {stats.daysWithMeals > 0 && (
                            <div className="card p-5 bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100">
                                <h3 className="font-semibold text-neutral-900 mb-2">💡 Insight</h3>
                                <p className="text-sm text-neutral-700">
                                    {getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000) >= 90 &&
                                     getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000) <= 110
                                        ? "Great job! Your average calorie intake is right on target. Keep up the consistent eating habits!"
                                        : getPercentage(stats.avgCalories, nutritionTargets?.calories_target || 2000) < 90
                                        ? `You're averaging ${(nutritionTargets?.calories_target || 2000) - stats.avgCalories} fewer calories than your target. Consider adding nutrient-dense snacks to reach your goals.`
                                        : `You're averaging ${stats.avgCalories - (nutritionTargets?.calories_target || 2000)} calories over target. Try being more mindful of portion sizes or choosing lighter alternatives.`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card p-8 text-center text-neutral-500">
                        Failed to load statistics. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDailyHistory, fetchMealsForDate, DailySummary } from '../lib/api';
import type { MealLog } from '../types';
import { useStore } from '../store';
import MealCard from '../components/MealCard';

interface HistoryPageProps {
    userId: string;
}

export default function HistoryPage({ userId }: HistoryPageProps) {
    const navigate = useNavigate();
    const { nutritionTargets } = useStore();
    const [history, setHistory] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Expansion state
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [dayMeals, setDayMeals] = useState<MealLog[]>([]);
    const [loadingMeals, setLoadingMeals] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [userId]);

    const loadHistory = async () => {
        setLoading(true);
        const data = await fetchDailyHistory(userId, 14); // Fetch last 14 days
        setHistory(data);
        setLoading(false);
    };

    const toggleDate = async (date: Date) => {
        const dateStr = date.toISOString();
        if (expandedDate === dateStr) {
            setExpandedDate(null);
            setDayMeals([]);
            return;
        }

        setExpandedDate(dateStr);
        setLoadingMeals(true);
        try {
            const meals = await fetchMealsForDate(userId, date);
            setDayMeals(meals);
        } catch (error) {
            console.error('Failed to load meals', error);
        } finally {
            setLoadingMeals(false);
        }
    };

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
                <div className="max-w-4xl mx-auto p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-neutral-900">History</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
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
                                                    <span className="font-medium">
                                                        {Math.round(day.calories)} / {nutritionTargets?.calories_target}
                                                    </span>
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
                                                    <div className="text-sm font-medium">{Math.round(day.protein)}g</div>
                                                    <div className="h-1 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-accent-500"
                                                            style={{ width: `${getBarWidth(day.protein, nutritionTargets?.protein_target || 150)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Carbs</div>
                                                    <div className="text-sm font-medium">{Math.round(day.carbs)}g</div>
                                                    <div className="h-1 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${getBarWidth(day.carbs, nutritionTargets?.carbs_target || 200)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Fat</div>
                                                    <div className="text-sm font-medium">{Math.round(day.fat)}g</div>
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
                                            ) : dayMeals.length === 0 ? (
                                                <div className="text-center py-6 text-neutral-500 italic">
                                                    No meals found for this day.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {dayMeals.map((meal) => (
                                                        <MealCard
                                                            key={meal.id}
                                                            meal={meal}
                                                            onDelete={() => {
                                                                // Refresh both current meals and history stats
                                                                toggleDate(day.date);
                                                                loadHistory();
                                                            }}
                                                        />
                                                    ))}
                                                </div>
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

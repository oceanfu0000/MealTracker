import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Plus } from 'lucide-react';
import DailyHeader from '../components/DailyHeader';
import GroupedMealCard from '../components/GroupedMealCard';
import { useStore } from '../store';
import { fetchMealsAndTotals, groupMealsForDisplay } from '../lib/api';
import type { GroupedMeal } from '../types';

// Lazy load heavy modal component
const LogMealModal = lazy(() => import('../components/LogMealModal'));

interface HomePageProps {
    userId: string;
    onModalChange?: (isOpen: boolean) => void;
}

export default function HomePage({ userId, onModalChange }: HomePageProps) {
    const [groupedMeals, setGroupedMeals] = useState<GroupedMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);

    const handleModalChange = (isOpen: boolean) => {
        setShowLogModal(isOpen);
        onModalChange?.(isOpen);
    };

    const { selectedDate, setDailyTotals } = useStore();

    const loadMeals = useCallback(async () => {
        setLoading(true);
        try {
            // Single combined fetch - avoids duplicate API calls
            const { meals, totals } = await fetchMealsAndTotals(userId, selectedDate);
            const grouped = groupMealsForDisplay(meals);
            setGroupedMeals(grouped);
            setDailyTotals(totals);
        } catch (error) {
            console.error('Error loading meals:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, selectedDate, setDailyTotals]);

    useEffect(() => {
        loadMeals();
    }, [loadMeals]);

    // Memoize derived data for meal cards
    const mealCardData = useMemo(() => {
        return groupedMeals.map((group) => {
            const otherUngroupedMeals = groupedMeals.filter(
                g => g.groupId === null && g.meals[0].id !== group.meals[0]?.id
            );
            const existingGroups = groupedMeals.filter(
                g => g.groupId !== null && g.groupId !== group.groupId
            );
            return { group, otherUngroupedMeals, existingGroups };
        });
    }, [groupedMeals]);

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            <DailyHeader />

            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="spinner" style={{ width: '32px', height: '32px' }} />
                    </div>
                ) : (
                    <>
                        {groupedMeals.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="inline-block p-4 bg-neutral-100 rounded-2xl mb-4">
                                    <svg
                                        className="w-12 h-12 text-neutral-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    No meals logged yet
                                </h3>
                                <p className="text-neutral-600 mb-6">
                                    Start tracking your nutrition by logging your first meal
                                </p>
                                <button
                                    onClick={() => handleModalChange(true)}
                                    className="btn btn-primary"
                                >
                                    Log Your First Meal
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mealCardData.map(({ group, otherUngroupedMeals, existingGroups }) => (
                                    <GroupedMealCard
                                        key={group.groupId || group.meals[0].id}
                                        group={group}
                                        onDelete={loadMeals}
                                        otherUngroupedMeals={otherUngroupedMeals}
                                        existingGroups={existingGroups}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Floating Action Button */}
            {!showLogModal && (
                <button
                    onClick={() => handleModalChange(true)}
                    className="fixed bottom-20 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-primary-700 active:scale-95 transition-all duration-200 flex items-center justify-center z-40"
                    aria-label="Log meal"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Log Meal Modal - Lazy loaded with Suspense */}
            {showLogModal && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="spinner" style={{ width: '32px', height: '32px' }} />
                    </div>
                }>
                    <LogMealModal
                        userId={userId}
                        onClose={() => handleModalChange(false)}
                        onMealLogged={loadMeals}
                    />
                </Suspense>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DailyHeader from '../components/DailyHeader';
import GroupedMealCard from '../components/GroupedMealCard';
import LogMealModal from '../components/LogMealModal';
import { useStore } from '../store';
import { fetchMealsForDate, calculateDailyTotals, groupMealsForDisplay } from '../lib/api';
import type { GroupedMeal } from '../types';

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

    const loadMeals = async () => {
        setLoading(true);
        const fetchedMeals = await fetchMealsForDate(userId, selectedDate);
        const grouped = groupMealsForDisplay(fetchedMeals);
        setGroupedMeals(grouped);

        const totals = await calculateDailyTotals(userId, selectedDate);
        setDailyTotals(totals);

        setLoading(false);
    };

    useEffect(() => {
        loadMeals();
    }, [userId, selectedDate]);

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
                                {groupedMeals.map((group) => {
                                    // Get other ungrouped meals for grouping feature (exclude current meal)
                                    const otherUngroupedMeals = groupedMeals.filter(
                                        g => g.groupId === null && g.meals[0].id !== group.meals[0]?.id
                                    );
                                    
                                    // Get existing groups (exclude current group if it's a group)
                                    const existingGroups = groupedMeals.filter(
                                        g => g.groupId !== null && g.groupId !== group.groupId
                                    );
                                    
                                    return (
                                        <GroupedMealCard
                                            key={group.groupId || group.meals[0].id}
                                            group={group}
                                            onDelete={loadMeals}
                                            otherUngroupedMeals={otherUngroupedMeals}
                                            existingGroups={existingGroups}
                                        />
                                    );
                                })}
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

            {/* Log Meal Modal */}
            {showLogModal && (
                <LogMealModal
                    userId={userId}
                    onClose={() => handleModalChange(false)}
                    onMealLogged={loadMeals}
                />
            )}
        </div>
    );
}

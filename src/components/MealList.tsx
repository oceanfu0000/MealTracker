import { useMemo, lazy, Suspense } from 'react';
import type { GroupedMeal } from '../types';

// Lazy load heavy card component
const GroupedMealCard = lazy(() => import('./GroupedMealCard'));

interface MealListProps {
    groupedMeals: GroupedMeal[];
    loading: boolean;
    onDelete: () => void;
    emptyState?: React.ReactNode;
}

export default function MealList({ groupedMeals, loading, onDelete, emptyState }: MealListProps) {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="spinner" style={{ width: '32px', height: '32px' }} />
            </div>
        );
    }

    if (groupedMeals.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-8">
                <div className="spinner" style={{ width: '32px', height: '32px' }} />
            </div>
        }>
            <div className="space-y-3">
                {mealCardData.map(({ group, otherUngroupedMeals, existingGroups }) => (
                    <GroupedMealCard
                        key={group.groupId || group.meals[0].id}
                        group={group}
                        onDelete={onDelete}
                        otherUngroupedMeals={otherUngroupedMeals}
                        existingGroups={existingGroups}
                    />
                ))}
            </div>
        </Suspense>
    );
}

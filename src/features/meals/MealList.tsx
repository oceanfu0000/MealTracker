import React from 'react';
import { Card } from '../../components/ui/Card';
import { MealLog } from '../../services/meals';
import { Clock } from 'lucide-react';

interface MealListProps {
    meals: MealLog[];
}

export const MealList: React.FC<MealListProps> = ({ meals }) => {
    if (meals.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>No meals logged today</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {meals.map((meal) => (
                <Card key={meal.id} className="flex gap-4 items-center">
                    {/* Image Placeholder */}
                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
                        {meal.image_url ? (
                            <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-700/50" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{meal.name}</h3>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                            <span>{meal.calories} kcal</span>
                            <span className="text-emerald-400 font-medium">{meal.protein}g P</span>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-col items-end">
                        <Clock size={12} className="mb-1" />
                        {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </Card>
            ))}
        </div>
    );
};

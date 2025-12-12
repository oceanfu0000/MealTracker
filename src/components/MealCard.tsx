import { useState } from 'react';
import { Trash2, ImageIcon } from 'lucide-react';
import type { MealLog } from '../types';
import { deleteMeal } from '../lib/api';

interface MealCardProps {
    meal: MealLog;
    onDelete: () => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Delete this meal?')) return;

        setDeleting(true);
        const success = await deleteMeal(meal.id);

        if (success) {
            onDelete();
        } else {
            alert('Failed to delete meal');
        }
        setDeleting(false);
    };

    const timeSince = new Date(meal.logged_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <div className="card animate-fade-in">
            <div className="flex gap-4">
                {meal.image_url ? (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                        <img
                            src={meal.image_url}
                            alt={meal.description}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-neutral-400" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-neutral-900 text-sm break-words">{meal.description}</h3>
                            <p className="text-xs text-neutral-500">{timeSince}</p>
                        </div>

                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            aria-label="Delete meal"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center py-1.5 px-2 bg-primary-50 rounded-lg">
                            <div className="text-sm font-bold text-primary-700">{meal.calories}</div>
                            <div className="text-xs text-neutral-600">cal</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-accent-50 rounded-lg">
                            <div className="text-sm font-bold text-accent-700">{Math.round(meal.protein)}g</div>
                            <div className="text-xs text-neutral-600">protein</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-blue-50 rounded-lg">
                            <div className="text-sm font-bold text-blue-700">{Math.round(meal.carbs)}g</div>
                            <div className="text-xs text-neutral-600">carbs</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-purple-50 rounded-lg">
                            <div className="text-sm font-bold text-purple-700">{Math.round(meal.fat)}g</div>
                            <div className="text-xs text-neutral-600">fat</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

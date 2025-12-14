import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { MealLog } from '../types';
import { updateMeal } from '../lib/api';

interface EditMealModalProps {
    meal: MealLog;
    onClose: () => void;
    onSave: () => void;
}

export default function EditMealModal({ meal, onClose, onSave }: EditMealModalProps) {
    const [description, setDescription] = useState(meal.description);
    const [calories, setCalories] = useState(meal.calories.toString());
    const [protein, setProtein] = useState(meal.protein.toString());
    const [carbs, setCarbs] = useState(meal.carbs.toString());
    const [fat, setFat] = useState(meal.fat.toString());
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!description.trim()) {
            toast.error('Please enter a description');
            return;
        }

        const cal = parseInt(calories) || 0;
        const prot = parseFloat(protein) || 0;
        const carb = parseFloat(carbs) || 0;
        const fatVal = parseFloat(fat) || 0;

        if (cal < 0 || prot < 0 || carb < 0 || fatVal < 0) {
            toast.error('Values cannot be negative');
            return;
        }

        setSaving(true);
        try {
            const updated = await updateMeal(meal.id, {
                description: description.trim(),
                calories: cal,
                protein: prot,
                carbs: carb,
                fat: fatVal,
            });

            if (updated) {
                toast.success('Meal updated successfully');
                onSave();
                onClose();
            } else {
                toast.error('Failed to update meal');
            }
        } catch (error) {
            console.error('Error updating meal:', error);
            toast.error('Failed to update meal');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neutral-900">Edit Meal</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., Chicken salad with rice"
                        />
                    </div>

                    {/* Calories */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Calories
                        </label>
                        <input
                            type="number"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Protein (g)
                            </label>
                            <input
                                type="number"
                                value={protein}
                                onChange={(e) => setProtein(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0"
                                min="0"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Carbs (g)
                            </label>
                            <input
                                type="number"
                                value={carbs}
                                onChange={(e) => setCarbs(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0"
                                min="0"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Fat (g)
                            </label>
                            <input
                                type="number"
                                value={fat}
                                onChange={(e) => setFat(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0"
                                min="0"
                                step="0.1"
                            />
                        </div>
                    </div>

                    {/* Logged time (read-only) */}
                    <div className="text-xs text-neutral-500">
                        Logged at: {new Date(meal.logged_at).toLocaleString()}
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-200 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 btn btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="spinner w-4 h-4" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

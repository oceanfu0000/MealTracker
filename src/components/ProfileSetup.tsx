import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { UserGoal } from '../types';
import {
    calculateNutritionTargets,
    upsertProfile,
    upsertNutritionTargets,
} from '../lib/api';
import { useStore } from '../store';

interface ProfileSetupProps {
    userId: string;
    onComplete: () => void;
}

export default function ProfileSetup({ userId, onComplete }: ProfileSetupProps) {
    const [formData, setFormData] = useState({
        age: '',
        weight: '',
        height: '',
        bodyFat: '',
        trainingFrequency: '3',
        goal: 'maintain' as UserGoal,
    });
    const [loading, setLoading] = useState(false);
    const [targets, setTargets] = useState<{
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    } | null>(null);

    const { setProfile, setNutritionTargets } = useStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Calculate nutrition targets
            const calculated = await calculateNutritionTargets({
                age: parseInt(formData.age),
                weight_kg: parseFloat(formData.weight),
                height_cm: parseFloat(formData.height),
                body_fat_percentage: formData.bodyFat ? parseFloat(formData.bodyFat) : null,
                training_frequency: parseInt(formData.trainingFrequency),
                goal: formData.goal,
            });

            setTargets(calculated);
        } catch (error) {
            console.error('Error calculating targets:', error);
            toast.error('Failed to calculate nutrition targets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!targets) return;

        setLoading(true);

        try {
            // Save profile
            const profile = await upsertProfile({
                id: userId,
                age: parseInt(formData.age),
                weight_kg: parseFloat(formData.weight),
                height_cm: parseFloat(formData.height),
                body_fat_percentage: formData.bodyFat ? parseFloat(formData.bodyFat) : null,
                training_frequency: parseInt(formData.trainingFrequency),
                goal: formData.goal,
                has_seen_disclaimer: true,
            });

            // Save nutrition targets
            const nutritionTargets = await upsertNutritionTargets(userId, targets);

            if (profile && nutritionTargets) {
                setProfile(profile);
                setNutritionTargets(nutritionTargets);
                onComplete();
            } else {
                throw new Error('Failed to save profile or targets');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900 mb-2">Set Up Your Profile</h1>
                    <p className="text-neutral-600">
                        Tell us about yourself so we can calculate your personalized nutrition targets
                    </p>
                </div>

                {!targets ? (
                    <form onSubmit={handleSubmit} className="card space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Age (years)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    required
                                    min="10"
                                    max="120"
                                    placeholder="25"
                                />
                            </div>

                            <div>
                                <label className="label">Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    required
                                    min="30"
                                    max="300"
                                    placeholder="70"
                                />
                            </div>

                            <div>
                                <label className="label">Height (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input"
                                    value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                    required
                                    min="100"
                                    max="250"
                                    placeholder="175"
                                />
                            </div>

                            <div>
                                <label className="label">Body Fat % (optional)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input"
                                    value={formData.bodyFat}
                                    onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                                    min="3"
                                    max="50"
                                    placeholder="15"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Training Frequency (times per week)</label>
                            <select
                                className="input"
                                value={formData.trainingFrequency}
                                onChange={(e) => setFormData({ ...formData, trainingFrequency: e.target.value })}
                                required
                            >
                                <option value="0">Sedentary (no exercise)</option>
                                <option value="1">1 time per week</option>
                                <option value="2">2 times per week</option>
                                <option value="3">3 times per week</option>
                                <option value="4">4 times per week</option>
                                <option value="5">5 times per week</option>
                                <option value="6">6+ times per week</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Goal</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['cut', 'maintain', 'bulk'] as const).map((goal) => (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, goal })}
                                        className={`py-3 rounded-lg font-medium transition-all duration-200 ${formData.goal === goal
                                            ? 'bg-primary-600 text-white shadow-md scale-105'
                                            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                                            }`}
                                    >
                                        {goal.charAt(0).toUpperCase() + goal.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner" />
                                    Calculating...
                                </span>
                            ) : (
                                'Calculate My Targets'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="card">
                            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                                Your Daily Nutrition Targets
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-primary-50 rounded-xl">
                                    <div className="text-3xl font-bold text-primary-700">
                                        {targets.calories}
                                    </div>
                                    <div className="text-sm text-neutral-600 mt-1">Calories</div>
                                </div>

                                <div className="text-center p-4 bg-accent-50 rounded-xl">
                                    <div className="text-3xl font-bold text-accent-700">
                                        {targets.protein}g
                                    </div>
                                    <div className="text-sm text-neutral-600 mt-1">Protein</div>
                                </div>

                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <div className="text-3xl font-bold text-blue-700">
                                        {targets.carbs}g
                                    </div>
                                    <div className="text-sm text-neutral-600 mt-1">Carbs</div>
                                </div>

                                <div className="text-center p-4 bg-purple-50 rounded-xl">
                                    <div className="text-3xl font-bold text-purple-700">
                                        {targets.fat}g
                                    </div>
                                    <div className="text-sm text-neutral-600 mt-1">Fat</div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-neutral-100 rounded-lg">
                                <p className="text-sm text-neutral-600">
                                    These targets are calculated based on your profile and {formData.goal} goal.
                                    You can adjust them later in your profile settings.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setTargets(null)}
                                className="btn btn-secondary py-3"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 btn btn-primary py-3"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="spinner" />
                                        Saving...
                                    </span>
                                ) : (
                                    'Save & Continue'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

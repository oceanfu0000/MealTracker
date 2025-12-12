import { useState, useEffect } from 'react';
import { User, LogOut, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store';
import {
    fetchQuickItems,
    insertQuickItem,
    deleteQuickItem,
    getActivityForDate,
    upsertActivity,
} from '../lib/api';
import type { QuickItem } from '../types';
import { format } from 'date-fns';

interface ProfilePageProps {
    userId: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
    const { signOut } = useAuth();
    const { profile, nutritionTargets } = useStore();

    const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
    const [showAddQuickItem, setShowAddQuickItem] = useState(false);
    const [newQuickItem, setNewQuickItem] = useState({
        name: '',
        unit: 'serving',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
    });

    const [activityForm, setActivityForm] = useState({
        steps: '',
        activeEnergy: '',
        workout: '',
    });
    const [loadingActivity, setLoadingActivity] = useState(false);

    useEffect(() => {
        loadQuickItems();
        loadTodayActivity();
    }, [userId]);

    const loadQuickItems = async () => {
        const items = await fetchQuickItems(userId);
        setQuickItems(items);
    };

    const loadTodayActivity = async () => {
        const todayActivity = await getActivityForDate(userId, new Date());
        if (todayActivity) {
            setActivityForm({
                steps: todayActivity.steps.toString(),
                activeEnergy: todayActivity.active_energy.toString(),
                workout: todayActivity.workout_description || '',
            });
        }
    };

    const handleAddQuickItem = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await insertQuickItem({
            user_id: userId,
            name: newQuickItem.name,
            default_unit: newQuickItem.unit,
            calories_per_unit: parseInt(newQuickItem.calories),
            protein_per_unit: parseFloat(newQuickItem.protein),
            carbs_per_unit: parseFloat(newQuickItem.carbs || '0'),
            fat_per_unit: parseFloat(newQuickItem.fat || '0'),
        });

        if (result) {
            loadQuickItems();
            setShowAddQuickItem(false);
            setNewQuickItem({ name: '', unit: 'serving', calories: '', protein: '', carbs: '', fat: '' });
        }
    };

    const handleDeleteQuickItem = async (id: string) => {
        if (confirm('Delete this quick item?')) {
            await deleteQuickItem(id);
            loadQuickItems();
        }
    };

    const handleSaveActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingActivity(true);

        try {
            const result = await upsertActivity({
                user_id: userId,
                steps: parseInt(activityForm.steps || '0'),
                active_energy: parseInt(activityForm.activeEnergy || '0'),
                workout_description: activityForm.workout || null,
                activity_date: format(new Date(), 'yyyy-MM-dd'),
            });

            if (result) {
                alert('Activity saved!');
            }
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Failed to save activity');
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleSignOut = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Profile</h1>
                            <p className="text-primary-100 text-sm">Manage your settings</p>
                        </div>
                    </div>

                    {profile && nutritionTargets && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                                <div className="text-2xl font-bold">{nutritionTargets.calories_target}</div>
                                <div className="text-xs text-primary-100">Calories/day</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                                <div className="text-2xl font-bold">{nutritionTargets.protein_target}g</div>
                                <div className="text-xs text-primary-100">Protein/day</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                                <div className="text-2xl font-bold">{profile.weight_kg}kg</div>
                                <div className="text-xs text-primary-100">Weight</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                                <div className="text-2xl font-bold capitalize">{profile.goal}</div>
                                <div className="text-xs text-primary-100">Goal</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Manual Activity Input */}
                <div className="card">
                    <h2 className="text-lg font-bold text-neutral-900 mb-4">Today's Activity (Optional)</h2>
                    <form onSubmit={handleSaveActivity} className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">Steps</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={activityForm.steps}
                                    onChange={(e) => setActivityForm({ ...activityForm, steps: e.target.value })}
                                    placeholder="10000"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="label">Active Calories</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={activityForm.activeEnergy}
                                    onChange={(e) => setActivityForm({ ...activityForm, activeEnergy: e.target.value })}
                                    placeholder="500"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="label">Workout Description</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={activityForm.workout}
                                    onChange={(e) => setActivityForm({ ...activityForm, workout: e.target.value })}
                                    placeholder="e.g., 30 min run"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loadingActivity}
                            className="btn btn-primary"
                        >
                            {loadingActivity ? 'Saving...' : 'Save Activity'}
                        </button>
                    </form>
                </div>

                {/* Quick Items */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-neutral-900">Quick Add Items</h2>
                        <button
                            onClick={() => setShowAddQuickItem(!showAddQuickItem)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>

                    {showAddQuickItem && (
                        <form onSubmit={handleAddQuickItem} className="mb-6 p-4 bg-neutral-50 rounded-xl space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newQuickItem.name}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, name: e.target.value })}
                                        required
                                        placeholder="Protein Shake"
                                    />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newQuickItem.unit}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, unit: e.target.value })}
                                        required
                                        placeholder="scoop"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="label">Calories</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={newQuickItem.calories}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, calories: e.target.value })}
                                        required
                                        min="0"
                                        placeholder="120"
                                    />
                                </div>
                                <div>
                                    <label className="label">Protein (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={newQuickItem.protein}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, protein: e.target.value })}
                                        required
                                        min="0"
                                        placeholder="24"
                                    />
                                </div>
                                <div>
                                    <label className="label">Carbs (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={newQuickItem.carbs}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, carbs: e.target.value })}
                                        min="0"
                                        placeholder="5"
                                    />
                                </div>
                                <div>
                                    <label className="label">Fat (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={newQuickItem.fat}
                                        onChange={(e) => setNewQuickItem({ ...newQuickItem, fat: e.target.value })}
                                        min="0"
                                        placeholder="2"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddQuickItem(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Quick Item
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-2">
                        {quickItems.length === 0 ? (
                            <p className="text-neutral-500 text-center py-4">
                                No quick items yet. Add your frequently eaten items for faster logging.
                            </p>
                        ) : (
                            quickItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-neutral-900">{item.name}</div>
                                        <div className="text-xs text-neutral-600 flex gap-3">
                                            <span>{item.calories_per_unit} cal</span>
                                            <span>{item.protein_per_unit}g protein</span>
                                            <span>per {item.default_unit}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteQuickItem(item.id)}
                                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sign Out */}
                <button
                    onClick={handleSignOut}
                    className="w-full btn btn-danger flex items-center justify-center gap-2 py-3"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}

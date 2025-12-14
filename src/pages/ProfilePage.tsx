import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Plus, Trash2, Edit2, X, Camera, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../components/ConfirmDialog';
import {
    fetchQuickItems,
    insertQuickItem,
    updateQuickItem,
    deleteQuickItem,
    getActivityForDate,
    upsertActivity,
    compressImage,
    upsertProfile,
    calculateNutritionTargets,
    upsertNutritionTargets
} from '../lib/api';
import type { QuickItem, UserGoal } from '../types';
import { format } from 'date-fns';

interface ProfilePageProps {
    userId: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
    const { signOut } = useAuth();
    const { profile, nutritionTargets } = useStore();
    const { confirm, ConfirmDialog } = useConfirm();

    const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
    const [showAddQuickItem, setShowAddQuickItem] = useState(false);
    const [editingQuickItem, setEditingQuickItem] = useState<QuickItem | null>(null);

    // Quick Item Form State
    const [newItemForm, setNewItemForm] = useState({
        name: '',
        unit: 'serving',
        servingSize: '1',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        image_url: '' as string | null
    });

    // Image handling
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);

    const [activityForm, setActivityForm] = useState({
        steps: '',
        activeEnergy: '',
        workout: '',
    });
    const [loadingActivity, setLoadingActivity] = useState(false);

    // Profile Editing
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editProfileForm, setEditProfileForm] = useState({
        weight: '',
        goal: 'maintain' as UserGoal,
        trainingFreq: '3'
    });
    const [calculatingtargets, setCalculatingTargets] = useState(false);

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

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressed = await compressImage(file, 400, 0.5); // 50% compression for storage efficiency
            setItemImagePreview(compressed);
            setNewItemForm(prev => ({ ...prev, image_url: compressed }));
        } catch (error) {
            console.error('Error processing image:', error);
            toast.error('Failed to process image');
        }
    };

    // ...

    const handleDeleteQuickItem = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Quick Item',
            message: 'Are you sure you want to delete this quick item? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });
        
        if (confirmed) {
            await deleteQuickItem(id);
            loadQuickItems();
            toast.success('Quick item deleted');
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
                toast.success('Activity saved!');
            }
        } catch (error) {
            console.error('Error saving activity:', error);
            toast.error('Failed to save activity');
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleSignOut = async () => {
        const confirmed = await confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out of your account?',
            confirmText: 'Sign Out',
            cancelText: 'Cancel',
            variant: 'warning',
        });
        
        if (confirmed) {
            await signOut();
        }
    };

    // ...

    const handleRecalculateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setCalculatingTargets(true);

        try {
            // 1. Update Profile
            await upsertProfile({
                id: userId,
                weight_kg: parseFloat(editProfileForm.weight),
                goal: editProfileForm.goal,
                training_frequency: parseInt(editProfileForm.trainingFreq),
                // Keep existing values
                age: profile.age,
                height_cm: profile.height_cm,
                body_fat_percentage: profile.body_fat_percentage,
                has_seen_disclaimer: profile.has_seen_disclaimer,
            });

            // 2. Recalculate Targets
            const newTargets = await calculateNutritionTargets({
                age: profile.age,
                weight_kg: parseFloat(editProfileForm.weight),
                height_cm: profile.height_cm,
                body_fat_percentage: profile.body_fat_percentage,
                training_frequency: parseInt(editProfileForm.trainingFreq),
                goal: editProfileForm.goal
            });

            // 3. Save Targets
            await upsertNutritionTargets(userId, newTargets);

            toast.success('Profile and targets updated!');
            setShowEditProfile(false);
            window.location.reload(); // Simple reload to refresh all data stores
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setCalculatingTargets(false);
        }
    };

    const handleEditProfile = () => {
        if (!profile) return;
        setEditProfileForm({
            weight: profile.weight_kg.toString(),
            goal: profile.goal,
            trainingFreq: profile.training_frequency.toString()
        });
        setShowEditProfile(true);
    };

    const resetQuickItemForm = () => {
        setNewItemForm({
            name: '',
            unit: 'serving',
            servingSize: '1',
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            image_url: null
        });
        setItemImagePreview(null);
        setEditingQuickItem(null);
        setShowAddQuickItem(false);
    };

    const handleEditQuickItem = (item: QuickItem) => {
        setEditingQuickItem(item);
        setNewItemForm({
            name: item.name,
            unit: item.default_unit,
            servingSize: item.serving_size.toString(),
            calories: item.calories_per_unit.toString(),
            protein: item.protein_per_unit.toString(),
            carbs: item.carbs_per_unit.toString(),
            fat: item.fat_per_unit.toString(),
            image_url: item.image_url
        });
        setItemImagePreview(item.image_url);
        setShowAddQuickItem(true);
    };

    const handleQuickItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const itemData = {
            name: newItemForm.name,
            default_unit: newItemForm.unit,
            serving_size: parseFloat(newItemForm.servingSize || '1'),
            calories_per_unit: parseInt(newItemForm.calories),
            protein_per_unit: parseFloat(newItemForm.protein),
            carbs_per_unit: parseFloat(newItemForm.carbs || '0'),
            fat_per_unit: parseFloat(newItemForm.fat || '0'),
            image_url: newItemForm.image_url
        };

        if (editingQuickItem) {
            await updateQuickItem(editingQuickItem.id, itemData);
            toast.success('Quick item updated');
        } else {
            await insertQuickItem({
                user_id: userId,
                ...itemData
            });
            toast.success('Quick item added');
        }

        loadQuickItems();
        resetQuickItemForm();
    };

    return (
        <>
            {ConfirmDialog}
            <div className="min-h-screen bg-neutral-50 pb-32">
                {/* Header */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold">Profile</h1>
                                    <button
                                    onClick={handleEditProfile}
                                    className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <p className="text-primary-100 text-sm">Manage your settings</p>
                        </div>
                    </div>

                    {/* Edit Profile Modal / Form Overlay */}
                    {showEditProfile && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in text-neutral-900">
                            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-slide-up">
                                <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-neutral-900">Edit Profile</h2>
                                    <button onClick={() => setShowEditProfile(false)}>
                                        <X className="w-5 h-5 text-neutral-500" />
                                    </button>
                                </div>
                                <form onSubmit={handleRecalculateProfile} className="p-4 space-y-4">
                                    <div>
                                        <label className="label">Weight (kg)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={editProfileForm.weight}
                                            onChange={(e) => setEditProfileForm({ ...editProfileForm, weight: e.target.value })}
                                            required
                                            min="30"
                                            max="300"
                                            step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Goal</label>
                                        <select
                                            className="input"
                                            value={editProfileForm.goal}
                                            onChange={(e) => setEditProfileForm({ ...editProfileForm, goal: e.target.value as UserGoal })}
                                        >
                                            <option value="cut">Lose Weight (Cut)</option>
                                            <option value="maintain">Maintain Weight</option>
                                            <option value="bulk">Gain Muscle (Bulk)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Training Frequency (days/week)</label>
                                        <select
                                            className="input"
                                            value={editProfileForm.trainingFreq}
                                            onChange={(e) => setEditProfileForm({ ...editProfileForm, trainingFreq: e.target.value })}
                                        >
                                            <option value="0">Sedentary (0-1 days)</option>
                                            <option value="2">Light (2-3 days)</option>
                                            <option value="4">Moderate (4-5 days)</option>
                                            <option value="6">Intense (6+ days)</option>
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={calculatingtargets}
                                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                                        >
                                            {calculatingtargets ? (
                                                'Calculating...'
                                            ) : (
                                                <>
                                                    <RefreshCw className="w-4 h-4" />
                                                    Save & Recalculate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

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
                            onClick={() => {
                                resetQuickItemForm();
                                setShowAddQuickItem(!showAddQuickItem);
                            }}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            {showAddQuickItem ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showAddQuickItem ? 'Cancel' : 'Add Item'}
                        </button>
                    </div>

                    {showAddQuickItem && (
                        <form onSubmit={handleQuickItemSubmit} className="mb-6 p-4 bg-neutral-50 rounded-xl space-y-4 border border-neutral-200 animate-slide-down">
                            <h3 className="font-semibold text-neutral-900">
                                {editingQuickItem ? 'Edit Quick Item' : 'New Quick Item'}
                            </h3>

                            {/* Image Upload */}
                            <div className="flex justify-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-24 h-24 rounded-xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1 hover:border-primary-500 hover:bg-primary-50 transition-colors overflow-hidden group"
                                >
                                    {itemImagePreview ? (
                                        <>
                                            <img
                                                src={itemImagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-6 h-6 text-neutral-400" />
                                            <span className="text-[10px] text-neutral-500">Add Photo</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newItemForm.name}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                                        required
                                        placeholder="Protein Shake"
                                    />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newItemForm.unit}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                                        required
                                        placeholder="ml"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="label">Base Amount</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={newItemForm.servingSize}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, servingSize: e.target.value })}
                                        required
                                        min="0.1"
                                        step="0.1"
                                        placeholder="100"
                                    />
                                    <p className="text-[10px] text-neutral-500 mt-1">
                                        Value for nutrition below
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="label">Calories</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={newItemForm.calories}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, calories: e.target.value })}
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
                                        value={newItemForm.protein}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, protein: e.target.value })}
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
                                        value={newItemForm.carbs}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, carbs: e.target.value })}
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
                                        value={newItemForm.fat}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, fat: e.target.value })}
                                        min="0"
                                        placeholder="2"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={resetQuickItemForm}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {editingQuickItem ? 'Update Item' : 'Add Quick Item'}
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
                                    <div className="flex-1 flex items-center gap-3">
                                        {item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-12 h-12 rounded-lg object-cover bg-white"
                                            />
                                        )}
                                        <div>
                                            <div className="font-medium text-neutral-900">{item.name}</div>
                                            <div className="text-xs text-neutral-600 flex gap-3">
                                                <span>{item.calories_per_unit} cal</span>
                                                <span>{item.protein_per_unit}g protein</span>
                                                <span>per {item.serving_size || 1} {item.default_unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEditQuickItem(item)}
                                            className="p-2 text-neutral-400 hover:text-primary-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuickItem(item.id)}
                                            className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
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
        </>
    );
}

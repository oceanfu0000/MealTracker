import { useState } from 'react';
import { Trash2, ImageIcon, ChevronDown, ChevronUp, Layers, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { GroupedMeal, MealLog } from '../types';
import { deleteMeal, deleteMealGroup, addMealsToGroup, MEAL_GROUP_OPTIONS } from '../lib/api';
import { useConfirm } from './ConfirmDialog';

interface GroupedMealCardProps {
    group: GroupedMeal;
    onDelete: () => void;
    otherUngroupedMeals?: GroupedMeal[]; // Other ungrouped meals that can be combined
}

// Single meal item within a group
function MealItem({ meal, onDelete, isGrouped }: { meal: MealLog; onDelete: () => void; isGrouped: boolean }) {
    const [deleting, setDeleting] = useState(false);
    const { confirm, ConfirmDialog } = useConfirm();

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Delete Item',
            message: 'Are you sure you want to delete this item from the meal?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });
        
        if (!confirmed) return;

        setDeleting(true);
        const success = await deleteMeal(meal.id);

        if (success) {
            onDelete();
            toast.success('Item deleted');
        } else {
            toast.error('Failed to delete item');
        }
        setDeleting(false);
    };

    const timeSince = new Date(meal.logged_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <>
            {ConfirmDialog}
            <div className={`flex gap-3 ${isGrouped ? 'py-2 px-3 bg-neutral-50 rounded-lg' : ''}`}>
                {meal.image_url ? (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                        <img
                            src={meal.image_url}
                            alt={meal.description}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-neutral-900 text-sm break-words">{meal.description}</h4>
                            <div className="flex gap-2 text-xs text-neutral-500">
                                <span>{meal.calories} cal</span>
                                <span>•</span>
                                <span>{Math.round(meal.protein)}g P</span>
                                {!isGrouped && <span className="ml-auto">{timeSince}</span>}
                            </div>
                        </div>

                        {isGrouped && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                aria-label="Delete item"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function GroupedMealCard({ group, onDelete, otherUngroupedMeals = [] }: GroupedMealCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedGroupName, setSelectedGroupName] = useState('');
    const [selectedMealsToGroup, setSelectedMealsToGroup] = useState<string[]>([]);
    const [grouping, setGrouping] = useState(false);
    const { confirm, ConfirmDialog } = useConfirm();

    const isGrouped = group.meals.length > 1 || group.groupId !== null;

    const handleDeleteGroup = async () => {
        const confirmed = await confirm({
            title: isGrouped ? 'Delete Meal Group' : 'Delete Meal',
            message: isGrouped 
                ? `Are you sure you want to delete "${group.groupName || 'this meal'}" and all ${group.meals.length} items in it?`
                : 'Are you sure you want to delete this meal? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });
        
        if (!confirmed) return;

        setDeleting(true);
        
        let success = false;
        if (group.groupId) {
            success = await deleteMealGroup(group.groupId);
        } else {
            success = await deleteMeal(group.meals[0].id);
        }

        if (success) {
            onDelete();
            toast.success(isGrouped ? 'Meal group deleted' : 'Meal deleted');
        } else {
            toast.error('Failed to delete');
        }
        setDeleting(false);
    };

    const timeSince = new Date(group.latestLoggedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    // Handle grouping meals together
    const handleGroupMeals = async () => {
        if (!selectedGroupName) {
            toast.error('Please select a meal type');
            return;
        }

        setGrouping(true);
        try {
            // Include current meal + selected meals
            const allMealIds = [group.meals[0].id, ...selectedMealsToGroup];
            const success = await addMealsToGroup(allMealIds, selectedGroupName);
            
            if (success) {
                toast.success(`Grouped ${allMealIds.length} items as ${selectedGroupName}`);
                setShowGroupModal(false);
                setSelectedGroupName('');
                setSelectedMealsToGroup([]);
                onDelete(); // Refresh the list
            } else {
                toast.error('Failed to group meals');
            }
        } catch (error) {
            console.error('Error grouping meals:', error);
            toast.error('Failed to group meals');
        } finally {
            setGrouping(false);
        }
    };

    // Toggle meal selection for grouping
    const toggleMealSelection = (mealId: string) => {
        setSelectedMealsToGroup(prev => 
            prev.includes(mealId) 
                ? prev.filter(id => id !== mealId)
                : [...prev, mealId]
        );
    };

    // Group Modal Component
    const GroupModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neutral-900">Group Meals Together</h2>
                    <button onClick={() => {
                        setShowGroupModal(false);
                        setSelectedMealsToGroup([]);
                        setSelectedGroupName('');
                    }}>
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Meal Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Meal Type</label>
                        <div className="relative">
                            <select
                                value={selectedGroupName}
                                onChange={(e) => setSelectedGroupName(e.target.value)}
                                className="w-full appearance-none bg-white border border-neutral-300 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="">Select meal type...</option>
                                {MEAL_GROUP_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Current Meal */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">This item:</label>
                        <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                            <div className="font-medium text-neutral-900 text-sm">{group.meals[0].description}</div>
                            <div className="text-xs text-neutral-500">{group.meals[0].calories} cal</div>
                        </div>
                    </div>

                    {/* Other Meals to Combine */}
                    {otherUngroupedMeals.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Combine with (optional):
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {otherUngroupedMeals.map((otherGroup) => {
                                    const otherMeal = otherGroup.meals[0];
                                    const isSelected = selectedMealsToGroup.includes(otherMeal.id);
                                    return (
                                        <button
                                            key={otherMeal.id}
                                            onClick={() => toggleMealSelection(otherMeal.id)}
                                            className={`w-full p-3 rounded-lg text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-primary-50 border-2 border-primary-500' 
                                                    : 'bg-neutral-50 border-2 border-transparent hover:bg-neutral-100'
                                            }`}
                                        >
                                            <div className="font-medium text-neutral-900 text-sm">{otherMeal.description}</div>
                                            <div className="text-xs text-neutral-500">{otherMeal.calories} cal</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {selectedMealsToGroup.length > 0 && (
                        <div className="p-3 bg-neutral-100 rounded-lg">
                            <div className="text-xs text-neutral-600">
                                Grouping <strong>{1 + selectedMealsToGroup.length}</strong> items together
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-neutral-200 flex gap-2">
                    <button
                        onClick={() => {
                            setShowGroupModal(false);
                            setSelectedMealsToGroup([]);
                            setSelectedGroupName('');
                        }}
                        className="flex-1 btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGroupMeals}
                        disabled={grouping || !selectedGroupName}
                        className="flex-1 btn btn-primary disabled:opacity-50"
                    >
                        {grouping ? 'Grouping...' : 'Group Meals'}
                    </button>
                </div>
            </div>
        </div>
    );

    // If not a grouped meal, render the simple version
    if (!isGrouped) {
        const meal = group.meals[0];
        return (
            <>
                {ConfirmDialog}
                {showGroupModal && <GroupModal />}
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

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setShowGroupModal(true)}
                                        className="p-1.5 text-neutral-400 hover:text-primary-600 transition-colors"
                                        aria-label="Group meal"
                                        title="Add to meal group"
                                    >
                                        <Layers className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleDeleteGroup}
                                        disabled={deleting}
                                        className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                        aria-label="Delete meal"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
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
            </>
        );
    }

    // Grouped meal view
    return (
        <>
            {ConfirmDialog}
            <div className="card animate-fade-in">
                {/* Group Header - Clickable to expand */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full text-left"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🍽️</span>
                            <div>
                                <h3 className="font-semibold text-neutral-900">
                                    {group.groupName || 'Grouped Meal'}
                                </h3>
                                <p className="text-xs text-neutral-500">
                                    {group.meals.length} items • {timeSince}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {expanded ? (
                                <ChevronUp className="w-5 h-5 text-neutral-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-neutral-400" />
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center py-1.5 px-2 bg-primary-50 rounded-lg">
                            <div className="text-sm font-bold text-primary-700">{Math.round(group.totalCalories)}</div>
                            <div className="text-xs text-neutral-600">cal</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-accent-50 rounded-lg">
                            <div className="text-sm font-bold text-accent-700">{Math.round(group.totalProtein)}g</div>
                            <div className="text-xs text-neutral-600">protein</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-blue-50 rounded-lg">
                            <div className="text-sm font-bold text-blue-700">{Math.round(group.totalCarbs)}g</div>
                            <div className="text-xs text-neutral-600">carbs</div>
                        </div>
                        <div className="text-center py-1.5 px-2 bg-purple-50 rounded-lg">
                            <div className="text-sm font-bold text-purple-700">{Math.round(group.totalFat)}g</div>
                            <div className="text-xs text-neutral-600">fat</div>
                        </div>
                    </div>
                </button>

                {/* Expanded Items */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Items</span>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={deleting}
                                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete All
                            </button>
                        </div>
                        {group.meals.map((meal) => (
                            <MealItem
                                key={meal.id}
                                meal={meal}
                                onDelete={onDelete}
                                isGrouped={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

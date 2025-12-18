import { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2, Search, Calendar, Plus, Layers, ChevronDown } from 'lucide-react';
import { insertMeal, insertQuickItem, analyzeMealImage, analyzeMealByText, compressImage, fetchQuickItems, generateMealGroupId, MEAL_GROUP_OPTIONS, reanalyzeMealImage } from '../lib/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { QuickItem } from '../types';

// Interface for items added to current meal group
interface MealGroupItem {
    id: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url: string | null;
    meal_type: 'camera' | 'manual' | 'quick';
    quick_item_id?: string;
    quantity: number;
}

interface LogMealModalProps {
    userId: string;
    onClose: () => void;
    onMealLogged: () => void;
}

type Tab = 'camera' | 'search' | 'manual' | 'quick';

export default function LogMealModal({ userId, onClose, onMealLogged }: LogMealModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('camera');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [loggedDate, setLoggedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Camera/photo tab
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageHint, setImageHint] = useState(''); // Optional text hint for image analysis
    const [exclusions, setExclusions] = useState<string[]>([]); // "It's not X" corrections
    const [correctionInput, setCorrectionInput] = useState(''); // Current correction input
    const [showCorrectionInput, setShowCorrectionInput] = useState(false); // Show correction UI after analysis
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual tab
    const [manualForm, setManualForm] = useState({
        description: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
    });
    const [saveAsQuickAdd, setSaveAsQuickAdd] = useState(false);

    // Group meal sharing
    const [isGroupMeal, setIsGroupMeal] = useState(false);
    const [groupSize, setGroupSize] = useState('2');
    const [portionAte, setPortionAte] = useState('1');

    // Meal grouping (combine multiple items)
    const [isCombinedMeal, setIsCombinedMeal] = useState(false);
    const [mealGroupName, setMealGroupName] = useState('');
    const [mealGroupItems, setMealGroupItems] = useState<MealGroupItem[]>([]);

    // Search tab
    const [searchText, setSearchText] = useState('');

    // Quick items tab
    const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
    const [selectedQuickItem, setSelectedQuickItem] = useState<QuickItem | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [quickItemsLoaded, setQuickItemsLoaded] = useState(false);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;

        setAnalyzing(true);

        try {
            // Compress image before sending
            const compressed = await compressImage(imageFile);

            // Extract base64 from data URL (remove "data:image/jpeg;base64," prefix)
            const base64 = compressed.split(',')[1];

            // Call the meal analysis API with hint and exclusions
            const analysis = await analyzeMealImage(base64, imageHint || undefined, exclusions.length > 0 ? exclusions : undefined);

            if (analysis) {
                // Populate the manual form with the analysis
                setManualForm({
                    description: analysis.description,
                    calories: analysis.calories.toString(),
                    protein: analysis.protein.toString(),
                    carbs: analysis.carbs.toString(),
                    fat: analysis.fat.toString(),
                });
                setShowCorrectionInput(true); // Show correction option after analysis
                setActiveTab('manual');
            } else {
                // If API returns null
                console.warn('Meal analysis returned null. Falling back to manual input.');
                setActiveTab('manual');
            }
        } catch (error: any) {
            console.error('Error analyzing meal:', error);

            toast.error(
                error?.message
                    ? `Meal analysis failed: ${error.message}. Please enter manually.`
                    : 'Failed to analyze meal. Please enter manually.'
            );

            setActiveTab('manual');
        } finally {
            setAnalyzing(false);
        }
    };

    // Handle adding a correction ("it's not X")
    const handleAddCorrection = () => {
        if (!correctionInput.trim()) return;
        const newExclusion = correctionInput.trim();
        if (!exclusions.includes(newExclusion)) {
            setExclusions([...exclusions, newExclusion]);
        }
        setCorrectionInput('');
        toast.success(`Added correction: it's not ${newExclusion}`);
    };

    // Re-analyze with accumulated corrections
    const handleReanalyze = async () => {
        if (!imageFile || exclusions.length === 0) return;

        setAnalyzing(true);

        try {
            const compressed = await compressImage(imageFile);
            const base64 = compressed.split(',')[1];

            // Call reanalyze API with all accumulated exclusions
            const analysis = await reanalyzeMealImage(base64, exclusions, imageHint || undefined);

            if (analysis) {
                setManualForm({
                    description: analysis.description,
                    calories: analysis.calories.toString(),
                    protein: analysis.protein.toString(),
                    carbs: analysis.carbs.toString(),
                    fat: analysis.fat.toString(),
                });
                toast.success('Re-analyzed with corrections!');
            }
        } catch (error: any) {
            console.error('Error re-analyzing meal:', error);
            toast.error('Failed to re-analyze. Please enter manually.');
        } finally {
            setAnalyzing(false);
        }
    };

    // Clear corrections when changing image
    const handleClearImage = () => {
        setSelectedImage(null);
        setImageFile(null);
        setImageHint('');
        setExclusions([]);
        setCorrectionInput('');
        setShowCorrectionInput(false);
    };

    const handleSearchAnalyze = async () => {
        if (!searchText.trim()) return;

        setAnalyzing(true);

        try {
            const analysis = await analyzeMealByText(searchText);

            if (analysis) {
                // Populate the manual form with the analysis
                setManualForm({
                    description: analysis.description,
                    calories: analysis.calories.toString(),
                    protein: analysis.protein.toString(),
                    carbs: analysis.carbs.toString(),
                    fat: analysis.fat.toString(),
                });
                setActiveTab('manual');
            } else {
                console.warn('Meal analysis returned null. Falling back to manual input.');
                setActiveTab('manual');
            }
        } catch (error: any) {
            console.error('Error analyzing meal by text:', error);
            toast.error(
                error?.message
                    ? `Meal analysis failed: ${error.message}. Please enter manually.`
                    : 'Failed to analyze meal. Please enter manually.'
            );
            setActiveTab('manual');
        } finally {
            setAnalyzing(false);
        }
    };

    // Add item to meal group (for combined meals)
    const addToMealGroup = () => {
        if (!manualForm.description || !manualForm.calories) {
            toast.error('Please fill in description and calories');
            return;
        }

        // Calculate final values with group sharing if enabled
        let finalCalories = parseInt(manualForm.calories);
        let finalProtein = parseFloat(manualForm.protein || '0');
        let finalCarbs = parseFloat(manualForm.carbs || '0');
        let finalFat = parseFloat(manualForm.fat || '0');
        let finalDescription = manualForm.description;

        if (isGroupMeal) {
            const numPeople = parseFloat(groupSize || '2');
            const myPortion = parseFloat(portionAte || '1');
            const portionMultiplier = myPortion / numPeople;
            
            finalCalories = Math.round(finalCalories * portionMultiplier);
            finalProtein = Number((finalProtein * portionMultiplier).toFixed(1));
            finalCarbs = Number((finalCarbs * portionMultiplier).toFixed(1));
            finalFat = Number((finalFat * portionMultiplier).toFixed(1));
            finalDescription = `${manualForm.description} (${myPortion}/${numPeople} share)`;
        }

        const newItem: MealGroupItem = {
            id: crypto.randomUUID(),
            description: finalDescription,
            calories: finalCalories,
            protein: finalProtein,
            carbs: finalCarbs,
            fat: finalFat,
            image_url: selectedImage,
            meal_type: selectedImage ? 'camera' : 'manual',
            quantity: 1,
        };

        setMealGroupItems([...mealGroupItems, newItem]);
        
        // Reset form for next item
        setManualForm({ description: '', calories: '', protein: '', carbs: '', fat: '' });
        setSelectedImage(null);
        setImageFile(null);
        setIsGroupMeal(false);
        setGroupSize('2');
        setPortionAte('1');
        
        toast.success('Item added to meal!');
    };

    // Add quick item to meal group
    const addQuickItemToGroup = () => {
        if (!selectedQuickItem) return;

        const qty = parseFloat(quantity);
        const servingSize = selectedQuickItem.serving_size || 1;
        const ratio = qty / servingSize;

        const newItem: MealGroupItem = {
            id: crypto.randomUUID(),
            description: selectedQuickItem.name,
            calories: Math.round(selectedQuickItem.calories_per_unit * ratio),
            protein: Number((selectedQuickItem.protein_per_unit * ratio).toFixed(1)),
            carbs: Number((selectedQuickItem.carbs_per_unit * ratio).toFixed(1)),
            fat: Number((selectedQuickItem.fat_per_unit * ratio).toFixed(1)),
            image_url: null,
            meal_type: 'quick',
            quick_item_id: selectedQuickItem.id,
            quantity: qty,
        };

        setMealGroupItems([...mealGroupItems, newItem]);
        setSelectedQuickItem(null);
        setQuantity('1');
        
        toast.success('Item added to meal!');
    };

    // Remove item from meal group
    const removeFromMealGroup = (id: string) => {
        setMealGroupItems(mealGroupItems.filter(item => item.id !== id));
    };

    // Calculate totals for meal group
    const mealGroupTotals = mealGroupItems.reduce(
        (acc, item) => ({
            calories: acc.calories + item.calories,
            protein: acc.protein + item.protein,
            carbs: acc.carbs + item.carbs,
            fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Submit all items in meal group
    const handleMealGroupSubmit = async () => {
        if (mealGroupItems.length === 0) {
            toast.error('Add at least one item to the meal');
            return;
        }

        setLoading(true);

        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isToday = loggedDate === todayStr;
            const finalLoggedAt = isToday ? new Date().toISOString() : new Date(`${loggedDate}T12:00:00`).toISOString();

            const groupId = generateMealGroupId();
            const groupName = mealGroupName.trim() || 'Combined Meal';

            // Insert all items with the same group ID
            for (const item of mealGroupItems) {
                await insertMeal({
                    user_id: userId,
                    meal_type: item.meal_type,
                    description: item.description,
                    image_url: item.image_url,
                    quick_item_id: item.quick_item_id || null,
                    quantity: item.quantity,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    meal_group_id: groupId,
                    meal_group_name: groupName,
                    logged_at: finalLoggedAt,
                });
            }

            toast.success(`Logged ${mealGroupItems.length} items as "${groupName}"`);
            onMealLogged();
            onClose();
        } catch (error) {
            console.error('Error logging meal group:', error);
            toast.error('Failed to log meal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // If combined meal mode, add to group instead
        if (isCombinedMeal) {
            addToMealGroup();
            return;
        }
        
        setLoading(true);

        try {
            // Upload image if exists (placeholder for real upload)
            let imageUrl = selectedImage || null;

            // Determine logged_at time
            // If the selected date is today, use current time to preserve order
            // If it's a different date (past/future), set to noon to ensure it falls within the day regardless of timezone
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isToday = loggedDate === todayStr;
            const finalLoggedAt = isToday ? new Date().toISOString() : new Date(`${loggedDate}T12:00:00`).toISOString();

            // Calculate final nutrition values (accounting for group sharing if enabled)
            let finalCalories = parseInt(manualForm.calories);
            let finalProtein = parseFloat(manualForm.protein);
            let finalCarbs = parseFloat(manualForm.carbs);
            let finalFat = parseFloat(manualForm.fat);
            let finalDescription = manualForm.description;

            if (isGroupMeal) {
                const numPeople = parseFloat(groupSize || '2');
                const myPortion = parseFloat(portionAte || '1');
                const portionMultiplier = myPortion / numPeople;
                
                finalCalories = Math.round(finalCalories * portionMultiplier);
                finalProtein = Number((finalProtein * portionMultiplier).toFixed(1));
                finalCarbs = Number((finalCarbs * portionMultiplier).toFixed(1));
                finalFat = Number((finalFat * portionMultiplier).toFixed(1));
                finalDescription = `${manualForm.description} (${myPortion}/${numPeople} share)`;
            }

            const result = await insertMeal({
                user_id: userId,
                meal_type: selectedImage ? 'camera' : 'manual',
                description: finalDescription,
                image_url: imageUrl,
                quantity: 1,
                calories: finalCalories,
                protein: finalProtein,
                carbs: finalCarbs,
                fat: finalFat,
                meal_group_id: null,
                meal_group_name: null,
                logged_at: finalLoggedAt,
            });

            if (result) {
                // Save as quick add item if requested
                if (saveAsQuickAdd) {
                    await insertQuickItem({
                        user_id: userId,
                        name: manualForm.description,
                        default_unit: 'serving',
                        serving_size: 1,
                        calories_per_unit: parseInt(manualForm.calories),
                        protein_per_unit: parseFloat(manualForm.protein),
                        carbs_per_unit: parseFloat(manualForm.carbs),
                        fat_per_unit: parseFloat(manualForm.fat),
                        image_url: null
                    });
                }

                onMealLogged();
                onClose();
            } else {
                throw new Error('Failed to log meal');
            }
        } catch (error) {
            console.error('Error logging meal:', error);
            toast.error('Failed to log meal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuickItem) return;

        // If combined meal mode, add to group instead
        if (isCombinedMeal) {
            addQuickItemToGroup();
            return;
        }

        setLoading(true);
        const qty = parseFloat(quantity);

        try {
            const servingSize = selectedQuickItem.serving_size || 1;
            const ratio = qty / servingSize;

            // Date logic
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isToday = loggedDate === todayStr;
            const finalLoggedAt = isToday ? new Date().toISOString() : new Date(`${loggedDate}T12:00:00`).toISOString();

            const result = await insertMeal({
                user_id: userId,
                meal_type: 'quick',
                description: `${selectedQuickItem.name}`,
                image_url: null, // Don't duplicate image, use link
                quick_item_id: selectedQuickItem.id,
                quantity: qty,
                calories: Math.round(selectedQuickItem.calories_per_unit * ratio),
                protein: Number((selectedQuickItem.protein_per_unit * ratio).toFixed(1)),
                carbs: Number((selectedQuickItem.carbs_per_unit * ratio).toFixed(1)),
                fat: Number((selectedQuickItem.fat_per_unit * ratio).toFixed(1)),
                meal_group_id: null,
                meal_group_name: null,
                logged_at: finalLoggedAt,
            });

            if (result) {
                onMealLogged();
                onClose();
            } else {
                throw new Error('Failed to log meal');
            }
        } catch (error) {
            console.error('Error logging quick item:', error);
            toast.error('Failed to log meal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadQuickItems = async () => {
        if (quickItemsLoaded) return;
        const items = await fetchQuickItems(userId);
        setQuickItems(items);
        setQuickItemsLoaded(true);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-neutral-900">Log Meal</h2>
                        <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-2 py-1">
                            <Calendar className="w-4 h-4 text-neutral-500" />
                            <input
                                type="date"
                                value={loggedDate}
                                onChange={(e) => setLoggedDate(e.target.value)}
                                className="bg-transparent text-sm font-medium text-neutral-600 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Combined Meal Toggle */}
                        <button
                            onClick={() => setIsCombinedMeal(!isCombinedMeal)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                isCombinedMeal 
                                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500' 
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-2 border-transparent'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span className="hidden sm:inline">Combine</span>
                            {mealGroupItems.length > 0 && (
                                <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {mealGroupItems.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Combined Meal Panel */}
                {isCombinedMeal && (
                    <div className="bg-primary-50 border-b border-primary-200 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🍽️</span>
                                <div className="relative">
                                    <select
                                        value={mealGroupName}
                                        onChange={(e) => setMealGroupName(e.target.value)}
                                        className="appearance-none bg-white border border-primary-200 rounded-lg pl-3 pr-8 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
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
                            {mealGroupItems.length > 0 && (
                                <button
                                    onClick={handleMealGroupSubmit}
                                    disabled={loading || !mealGroupName}
                                    className="btn btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : `Log ${mealGroupItems.length} Items`}
                                </button>
                            )}
                        </div>
                        
                        {mealGroupItems.length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-xs text-primary-600 font-medium">Items in this meal:</div>
                                <div className="flex flex-wrap gap-2">
                                    {mealGroupItems.map((item) => (
                                        <div 
                                            key={item.id}
                                            className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 text-sm border border-primary-200"
                                        >
                                            <span className="text-neutral-700">{item.description}</span>
                                            <span className="text-neutral-400 text-xs">({item.calories} cal)</span>
                                            <button
                                                onClick={() => removeFromMealGroup(item.id)}
                                                className="text-neutral-400 hover:text-red-500 ml-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-4 text-xs text-primary-700 pt-1">
                                    <span><strong>{Math.round(mealGroupTotals.calories)}</strong> cal</span>
                                    <span><strong>{Math.round(mealGroupTotals.protein)}g</strong> protein</span>
                                    <span><strong>{Math.round(mealGroupTotals.carbs)}g</strong> carbs</span>
                                    <span><strong>{Math.round(mealGroupTotals.fat)}g</strong> fat</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-primary-600">
                                Add items using the tabs below. They'll be grouped together as one meal.
                            </p>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-neutral-200">
                    {[
                        { key: 'camera' as const, label: 'Photo', icon: Camera },
                        { key: 'search' as const, label: 'Search', icon: Search },
                        { key: 'manual' as const, label: 'Manual', icon: Upload },
                        { key: 'quick' as const, label: 'Quick Add', icon: null },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveTab(tab.key);
                                if (tab.key === 'quick') loadQuickItems();
                            }}
                            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === tab.key
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {tab.icon && <tab.icon className="w-4 h-4" />}
                                <span>{tab.label}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Camera Tab */}
                    {activeTab === 'camera' && (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />

                            {!selectedImage ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full aspect-[4/3] border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary-500 hover:bg-primary-50/50 transition-all duration-200"
                                >
                                    <Camera className="w-12 h-12 text-neutral-400" />
                                    <div className="text-center">
                                        <p className="font-medium text-neutral-900">Add Meal Photo</p>
                                        <p className="text-sm text-neutral-500">Take a photo or upload</p>
                                    </div>
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100">
                                        <img
                                            src={selectedImage}
                                            alt="Selected meal"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={handleClearImage}
                                            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-lg hover:bg-neutral-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Optional hint input for better analysis */}
                                    <div>
                                        <label className="label text-sm text-neutral-600">
                                            Hint (optional) - Help AI identify the meal
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={imageHint}
                                            onChange={(e) => setImageHint(e.target.value)}
                                            placeholder="e.g., Malaysian breakfast, bak kut teh, herbal soup"
                                        />
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Add context like cuisine type or dish name if you know it
                                        </p>
                                    </div>

                                    {/* Show accumulated exclusions if any */}
                                    {exclusions.length > 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-sm text-amber-800 font-medium mb-2">
                                                AI will avoid these guesses:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {exclusions.map((exc, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm"
                                                    >
                                                        Not {exc}
                                                        <button
                                                            onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}
                                                            className="text-amber-600 hover:text-amber-800"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="w-full btn btn-primary py-3"
                                    >
                                        {analyzing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Analyzing with AI...
                                            </span>
                                        ) : (
                                            exclusions.length > 0 ? 'Re-analyze Meal' : 'Analyze Meal'
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('manual')}
                                        className="w-full btn btn-secondary py-3"
                                    >
                                        Enter Manually
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search Tab */}
                    {activeTab === 'search' && (
                        <div className="space-y-4">
                            <div>
                                <label className="label">Food or Dish Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="e.g., teh c peng kosong, nasi lemak, chicken rice"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !analyzing) {
                                            handleSearchAnalyze();
                                        }
                                    }}
                                />
                                <p className="text-sm text-neutral-500 mt-2">
                                    Enter any food or dish name and we'll estimate the nutrition info using AI
                                </p>
                            </div>

                            <button
                                onClick={handleSearchAnalyze}
                                disabled={analyzing || !searchText.trim()}
                                className="w-full btn btn-primary py-3"
                            >
                                {analyzing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing with AI...
                                    </span>
                                ) : (
                                    'Analyze Meal'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Manual Tab */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            {/* Correction UI - Show when image was analyzed and user can provide corrections */}
                            {selectedImage && showCorrectionInput && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">🤔</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-blue-800 font-medium">
                                                Not quite right? Tell AI what it's NOT
                                            </p>
                                            <p className="text-xs text-blue-600 mt-0.5">
                                                Add corrections and re-analyze. All corrections will be remembered.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Show current exclusions */}
                                    {exclusions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {exclusions.map((exc, idx) => (
                                                <span 
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs"
                                                >
                                                    ❌ Not {exc}
                                                    <button
                                                        type="button"
                                                        onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}
                                                        className="text-amber-600 hover:text-amber-800"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add correction input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="input flex-1 text-sm py-1.5"
                                            value={correctionInput}
                                            onChange={(e) => setCorrectionInput(e.target.value)}
                                            placeholder="e.g., bak kut teh, herbal soup, tom yum"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddCorrection();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCorrection}
                                            disabled={!correctionInput.trim()}
                                            className="btn btn-secondary text-sm py-1.5 px-3 whitespace-nowrap disabled:opacity-50"
                                        >
                                            It's not this
                                        </button>
                                    </div>

                                    {/* Re-analyze button */}
                                    {exclusions.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleReanalyze}
                                            disabled={analyzing}
                                            className="w-full btn btn-primary text-sm py-2"
                                        >
                                            {analyzing ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Re-analyzing...
                                                </span>
                                            ) : (
                                                `Re-analyze (excluding ${exclusions.length} item${exclusions.length > 1 ? 's' : ''})`
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="label">Description</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={manualForm.description}
                                    onChange={(e) =>
                                        setManualForm({ ...manualForm, description: e.target.value })
                                    }
                                    required
                                    placeholder="e.g., Chicken breast with rice"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Calories</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={manualForm.calories}
                                        onChange={(e) =>
                                            setManualForm({ ...manualForm, calories: e.target.value })
                                        }
                                        required
                                        min="0"
                                        placeholder="500"
                                    />
                                </div>

                                <div>
                                    <label className="label">Protein (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={manualForm.protein}
                                        onChange={(e) =>
                                            setManualForm({ ...manualForm, protein: e.target.value })
                                        }
                                        required
                                        min="0"
                                        placeholder="30"
                                    />
                                </div>

                                <div>
                                    <label className="label">Carbs (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={manualForm.carbs}
                                        onChange={(e) =>
                                            setManualForm({ ...manualForm, carbs: e.target.value })
                                        }
                                        required
                                        min="0"
                                        placeholder="50"
                                    />
                                </div>

                                <div>
                                    <label className="label">Fat (g)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={manualForm.fat}
                                        onChange={(e) =>
                                            setManualForm({ ...manualForm, fat: e.target.value })
                                        }
                                        required
                                        min="0"
                                        placeholder="10"
                                    />
                                </div>
                            </div>

                            {/* Group Meal Sharing */}
                            <div className="border rounded-xl p-4 space-y-3 bg-neutral-50">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isGroupMeal"
                                        className="checkbox"
                                        checked={isGroupMeal}
                                        onChange={(e) => setIsGroupMeal(e.target.checked)}
                                    />
                                    <label htmlFor="isGroupMeal" className="text-sm font-medium text-neutral-700 cursor-pointer select-none">
                                        🍽️ Shared group meal
                                    </label>
                                </div>

                                {isGroupMeal && (
                                    <div className="space-y-3 pt-2">
                                        <p className="text-xs text-neutral-500">
                                            Enter the total meal's nutrition above, then specify how many people shared it and how much you ate.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label text-xs">Total people sharing</label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="2"
                                                    className="input"
                                                    value={groupSize}
                                                    onChange={(e) => setGroupSize(e.target.value)}
                                                    placeholder="2"
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-xs">Your portion (person equiv.)</label>
                                                <input
                                                    type="number"
                                                    step="0.25"
                                                    min="0.25"
                                                    className="input"
                                                    value={portionAte}
                                                    onChange={(e) => setPortionAte(e.target.value)}
                                                    placeholder="1"
                                                />
                                                <p className="text-xs text-neutral-400 mt-1">e.g., 1.5 = ate 1.5 person's share</p>
                                            </div>
                                        </div>

                                        {/* Preview of your portion */}
                                        {manualForm.calories && (
                                            <div className="p-3 bg-white rounded-lg border border-neutral-200">
                                                <p className="text-xs font-medium text-neutral-600 mb-2">Your portion:</p>
                                                <div className="grid grid-cols-4 gap-2 text-center">
                                                    <div>
                                                        <div className="text-sm font-bold text-primary-600">
                                                            {Math.round((parseInt(manualForm.calories || '0') / parseFloat(groupSize || '2')) * parseFloat(portionAte || '1'))}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">cal</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-primary-600">
                                                            {((parseFloat(manualForm.protein || '0') / parseFloat(groupSize || '2')) * parseFloat(portionAte || '1')).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-neutral-500">protein</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-primary-600">
                                                            {((parseFloat(manualForm.carbs || '0') / parseFloat(groupSize || '2')) * parseFloat(portionAte || '1')).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-neutral-500">carbs</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-primary-600">
                                                            {((parseFloat(manualForm.fat || '0') / parseFloat(groupSize || '2')) * parseFloat(portionAte || '1')).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-neutral-500">fat</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="saveAsQuickAdd"
                                    className="checkbox"
                                    checked={saveAsQuickAdd}
                                    onChange={(e) => setSaveAsQuickAdd(e.target.checked)}
                                />
                                <label htmlFor="saveAsQuickAdd" className="text-sm text-neutral-600 cursor-pointer select-none">
                                    Save as Quick Add item
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn btn-primary py-3"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="spinner" />
                                        {isCombinedMeal ? 'Adding...' : 'Saving...'}
                                    </span>
                                ) : isCombinedMeal ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add to Meal
                                    </span>
                                ) : (
                                    'Log Meal'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Quick Add Tab */}
                    {activeTab === 'quick' && (
                        <div className="space-y-4">
                            {quickItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-neutral-600 mb-4">No quick items yet</p>
                                    <p className="text-sm text-neutral-500">
                                        Add quick items in your profile to quickly log common foods
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {quickItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedQuickItem(item);
                                                    setQuantity((item.serving_size || 1).toString());
                                                }}
                                                className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${selectedQuickItem?.id === item.id
                                                    ? 'bg-primary-50 border-2 border-primary-600'
                                                    : 'bg-neutral-50 border-2 border-transparent hover:bg-neutral-100'
                                                    }`}
                                            >
                                                <div className="font-medium text-neutral-900 mb-1">{item.name}</div>
                                                <div className="flex gap-3 text-xs text-neutral-600">
                                                    <span>{item.calories_per_unit} cal</span>
                                                    <span>{item.protein_per_unit}g protein</span>
                                                    <span>per {item.serving_size || 1} {item.default_unit}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedQuickItem && (
                                        <form onSubmit={handleQuickItemSubmit} className="space-y-4 pt-4 border-t">
                                            <div>
                                                <label className="label">
                                                    Quantity ({selectedQuickItem.default_unit})
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="input"
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(e.target.value)}
                                                    required
                                                    min="0.1"
                                                    placeholder="1"
                                                />
                                            </div>

                                            <div className="p-4 bg-neutral-100 rounded-lg">
                                                <div className="grid grid-cols-4 gap-3 text-center">
                                                    <div>
                                                        <div className="text-sm font-bold text-neutral-900">
                                                            {Math.round(
                                                                selectedQuickItem.calories_per_unit * (parseFloat(quantity || '0') / (selectedQuickItem.serving_size || 1))
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-neutral-600">cal</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-neutral-900">
                                                            {Math.round(
                                                                selectedQuickItem.protein_per_unit * (parseFloat(quantity || '0') / (selectedQuickItem.serving_size || 1))
                                                            )}g
                                                        </div>
                                                        <div className="text-xs text-neutral-600">protein</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-neutral-900">
                                                            {Math.round(
                                                                selectedQuickItem.carbs_per_unit * (parseFloat(quantity || '0') / (selectedQuickItem.serving_size || 1))
                                                            )}g
                                                        </div>
                                                        <div className="text-xs text-neutral-600">carbs</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-neutral-900">
                                                            {Math.round(
                                                                selectedQuickItem.fat_per_unit * (parseFloat(quantity || '0') / (selectedQuickItem.serving_size || 1))
                                                            )}g
                                                        </div>
                                                        <div className="text-xs text-neutral-600">fat</div>
                                                    </div>
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
                                                        Adding...
                                                    </span>
                                                ) : isCombinedMeal ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <Plus className="w-4 h-4" />
                                                        Add to Meal
                                                    </span>
                                                ) : (
                                                    'Add to Log'
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2, Search, Calendar } from 'lucide-react';
import { insertMeal, insertQuickItem, analyzeMealImage, analyzeMealByText, compressImage, fetchQuickItems } from '../lib/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { QuickItem } from '../types';

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

            // Call the meal analysis API
            const analysis = await analyzeMealImage(base64);

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

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

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
                                            onClick={() => {
                                                setSelectedImage(null);
                                                setImageFile(null);
                                            }}
                                            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-lg hover:bg-neutral-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

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
                                            'Analyze Meal'
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
                                        Saving...
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

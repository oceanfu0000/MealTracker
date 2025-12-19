import { useState, useEffect } from 'react';
import { MessageCircle, MapPin, Loader2, ChevronDown, ChevronUp, Utensils, Zap, Navigation, CalendarDays, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { askFAQQuestion, FAQContext } from '../lib/api';

const FAQ_CACHE_KEY = 'faq_responses_cache';

interface CachedData {
    date: string;
    responses: Record<string, string>;
    location: string;
    mealsLeft: string;
}

const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
};

interface FAQItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    getQuestion: (mealsLeft?: number) => string;
    needsLocation: boolean;
    needsMealsLeft?: boolean;
}

const FAQ_QUESTIONS: FAQItem[] = [
    {
        id: 'next-meal',
        icon: <Utensils className="w-5 h-5" />,
        title: 'What should I eat for my next meal?',
        getQuestion: (mealsLeft?: number) => {
            const mealsInfo = mealsLeft ? ` I have ${mealsLeft} meal${mealsLeft > 1 ? 's' : ''} left for today.` : '';
            return `Based on my remaining calories and macros (protein, carbs, fat) for today, what should I eat for my next meal?${mealsInfo} Please suggest a specific dish or meal available in my location that fits my remaining calorie and macro budget. Include approximate nutrition values.`;
        },
        needsLocation: true,
    },
    {
        id: 'day-plan',
        icon: <CalendarDays className="w-5 h-5" />,
        title: 'Plan my meals for the rest of today',
        getQuestion: (mealsLeft?: number) => {
            const mealsInfo = mealsLeft ? ` I have ${mealsLeft} meal${mealsLeft > 1 ? 's' : ''} left for today.` : '';
            return `Based on my remaining calories and macros for today, plan out what I should eat for the rest of the day.${mealsInfo} Please suggest specific dishes or foods available in my location for each remaining meal, distributing my remaining calories and macros appropriately. Include approximate nutrition values for each suggestion.`;
        },
        needsLocation: true,
        needsMealsLeft: true,
    },
    {
        id: 'healthy-snacks',
        icon: <Zap className="w-5 h-5" />,
        title: 'Healthy snack ideas',
        getQuestion: () => 'What are some healthy snack options that fit my remaining calorie and macro budget for today? Please suggest snacks that are easy to prepare or find in my area. Include approximate nutrition values.',
        needsLocation: true,
    },
];

export default function FAQPage() {
    const { nutritionTargets, dailyTotals, profile } = useStore();
    const [location, setLocation] = useState('');
    const [mealsLeft, setMealsLeft] = useState<string>('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [cachedDate, setCachedDate] = useState<string | null>(null);

    // Load cached responses on mount
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem(FAQ_CACHE_KEY);
            if (cached) {
                const data: CachedData = JSON.parse(cached);
                const today = getTodayDateString();
                
                // Only restore if from last prompt
                if (data.date === today) {
                    setResponses(data.responses);
                    setLocation(data.location || '');
                    setMealsLeft(data.mealsLeft || '');
                    setCachedDate(data.date);
                } else {
                    // Clear old cache from previous day
                    sessionStorage.removeItem(FAQ_CACHE_KEY);
                }
            }
        } catch (err) {
            console.error('Error loading FAQ cache:', err);
        }
    }, []);

    // Save responses to cache whenever they change
    useEffect(() => {
        if (Object.keys(responses).length > 0) {
            const data: CachedData = {
                date: getTodayDateString(),
                responses,
                location,
                mealsLeft,
            };
            sessionStorage.setItem(FAQ_CACHE_KEY, JSON.stringify(data));
            setCachedDate(data.date);
        }
    }, [responses, location, mealsLeft]);

    const clearCache = () => {
        sessionStorage.removeItem(FAQ_CACHE_KEY);
        setResponses({});
        setCachedDate(null);
        setExpandedId(null);
    };

    const getCurrentLocation = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setGettingLocation(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Use reverse geocoding to get location name
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    const data = await response.json();
                    
                    // Extract city/town and country
                    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || '';
                    const country = data.address?.country || '';
                    const locationStr = [city, country].filter(Boolean).join(', ');
                    
                    setLocation(locationStr || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                } catch (err) {
                    setError('Could not determine your location name. Please enter manually.');
                } finally {
                    setGettingLocation(false);
                }
            },
            (err) => {
                setGettingLocation(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Location permission denied. Please enable location access or enter manually.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location information unavailable. Please enter manually.');
                        break;
                    case err.TIMEOUT:
                        setError('Location request timed out. Please try again or enter manually.');
                        break;
                    default:
                        setError('Could not get your location. Please enter manually.');
                }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    };

    const handleAskQuestion = async (faq: FAQItem) => {
        if (!nutritionTargets) {
            setError('Please set up your nutrition targets first.');
            return;
        }

        // Collect all missing required fields
        const missingFields: string[] = [];
        if (faq.needsLocation && !location.trim()) {
            missingFields.push('your location');
        }
        if (faq.needsMealsLeft && !mealsLeft.trim()) {
            missingFields.push('meals left today');
        }

        if (missingFields.length > 0) {
            setError(`Please enter ${missingFields.join(' and ')} for this question.`);
            return;
        }

        setError(null);
        setLoadingId(faq.id);
        setExpandedId(faq.id);

        try {
            const mealsLeftNum = mealsLeft ? parseInt(mealsLeft, 10) : undefined;
            const context: FAQContext = {
                caloriesTarget: nutritionTargets.calories_target,
                caloriesConsumed: dailyTotals.calories,
                proteinTarget: nutritionTargets.protein_target,
                proteinConsumed: dailyTotals.protein,
                carbsTarget: nutritionTargets.carbs_target,
                carbsConsumed: dailyTotals.carbs,
                fatTarget: nutritionTargets.fat_target,
                fatConsumed: dailyTotals.fat,
                location: location.trim() || undefined,
                goal: profile?.goal || undefined,
                mealsLeft: mealsLeftNum,
            };

            const question = faq.getQuestion(mealsLeftNum);
            const response = await askFAQQuestion(question, context);
            setResponses(prev => ({ ...prev, [faq.id]: response }));
        } catch (err: any) {
            setError(err.message || 'Failed to get response. Please try again.');
        } finally {
            setLoadingId(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 shadow-sm z-10">
                <div className="max-w-4xl mx-auto p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 rounded-xl">
                                <MessageCircle className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-neutral-900">Nutrition Assistant</h1>
                                <p className="text-sm text-neutral-600">Get AI-powered nutrition advice</p>
                            </div>
                        </div>
                        {Object.keys(responses).length > 0 && (
                            <button
                                onClick={clearCache}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
                                title="Clear cached answers and start fresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Start Fresh</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Cached responses notice */}
                {cachedDate && Object.keys(responses).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-sm text-blue-700">
                            💾 Showing cached answers from last prompt. Click "Start Fresh" to get new recommendations.
                        </p>
                    </div>
                )}

                {/* Location & Meals Left Input */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200 space-y-4">
                    {/* Location */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                            <MapPin className="w-4 h-4" />
                            Your Location (for food suggestions)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g., Kuala Lumpur, Malaysia"
                                className="input flex-1"
                            />
                            <button
                                onClick={getCurrentLocation}
                                disabled={gettingLocation}
                                className="btn btn-secondary flex items-center gap-2 whitespace-nowrap"
                                title="Use current location"
                            >
                                {gettingLocation ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Navigation className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {gettingLocation ? 'Getting...' : 'Use Current'}
                                </span>
                            </button>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Enter your city/country or use your current location
                        </p>
                    </div>

                    {/* Meals Left */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                            <Utensils className="w-4 h-4" />
                            Meals Left Today (optional)
                        </label>
                        <input
                            type="number"
                            value={mealsLeft}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 5)) {
                                    setMealsLeft(val);
                                }
                            }}
                            placeholder="e.g., 2"
                            min="1"
                            max="5"
                            className="input w-32"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            How many meals do you plan to eat for the rest of today?
                        </p>
                    </div>
                </div>

                {/* Current Stats Summary */}
                {nutritionTargets && (
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
                        <h3 className="font-semibold mb-3">Today's Progress</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="opacity-80">Calories:</span>
                                <span className="ml-2 font-medium">
                                    {Math.round(dailyTotals.calories)} / {nutritionTargets.calories_target}
                                </span>
                            </div>
                            <div>
                                <span className="opacity-80">Protein:</span>
                                <span className="ml-2 font-medium">
                                    {Math.round(dailyTotals.protein)}g / {nutritionTargets.protein_target}g
                                </span>
                            </div>
                            <div>
                                <span className="opacity-80">Carbs:</span>
                                <span className="ml-2 font-medium">
                                    {Math.round(dailyTotals.carbs)}g / {nutritionTargets.carbs_target}g
                                </span>
                            </div>
                            <div>
                                <span className="opacity-80">Fat:</span>
                                <span className="ml-2 font-medium">
                                    {Math.round(dailyTotals.fat)}g / {nutritionTargets.fat_target}g
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* FAQ Questions */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-700 px-1">Ask a Question</h3>
                    {FAQ_QUESTIONS.map((faq) => (
                        <div
                            key={faq.id}
                            className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
                        >
                            {/* Question Button */}
                            <button
                                onClick={() => responses[faq.id] ? toggleExpand(faq.id) : handleAskQuestion(faq)}
                                disabled={loadingId === faq.id}
                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 transition-colors disabled:opacity-70"
                            >
                                <div className={`p-2 rounded-xl ${
                                    loadingId === faq.id 
                                        ? 'bg-primary-100' 
                                        : responses[faq.id] 
                                            ? 'bg-green-100' 
                                            : 'bg-neutral-100'
                                }`}>
                                    {loadingId === faq.id ? (
                                        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                                    ) : (
                                        <span className={responses[faq.id] ? 'text-green-600' : 'text-neutral-600'}>
                                            {faq.icon}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <span className="font-medium text-neutral-900">{faq.title}</span>
                                    {(faq.needsLocation && !location.trim()) || (faq.needsMealsLeft && !mealsLeft.trim()) ? (
                                        <span className="ml-2 text-xs text-amber-600">
                                            ({[
                                                faq.needsLocation && !location.trim() ? 'location' : null,
                                                faq.needsMealsLeft && !mealsLeft.trim() ? 'meals left' : null
                                            ].filter(Boolean).join(' & ')} needed)
                                        </span>
                                    ) : null}
                                </div>
                                {responses[faq.id] && (
                                    expandedId === faq.id 
                                        ? <ChevronUp className="w-5 h-5 text-neutral-400" />
                                        : <ChevronDown className="w-5 h-5 text-neutral-400" />
                                )}
                            </button>

                            {/* Response */}
                            {expandedId === faq.id && responses[faq.id] && (
                                <div className="px-4 pb-4 border-t border-neutral-100">
                                    <div className="mt-3 p-3 bg-neutral-50 rounded-xl">
                                        <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
                                            {responses[faq.id]}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAskQuestion(faq)}
                                        disabled={loadingId === faq.id}
                                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        {loadingId === faq.id ? 'Refreshing...' : 'Refresh answer'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Tip</p>
                    <p>
                        The AI assistant uses your current nutrition data and location to provide 
                        personalized recommendations. Log your meals throughout the day for more 
                        accurate suggestions!
                    </p>
                </div>
            </div>
        </div>
    );
}

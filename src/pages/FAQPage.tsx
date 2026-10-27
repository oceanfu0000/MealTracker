import { useState, useEffect } from 'react';
import { MessageCircle, MapPin, Loader2, ChevronDown, ChevronUp, Utensils, Zap, Navigation, CalendarDays, RefreshCw, BookOpen } from 'lucide-react';
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
            return `Based on my remaining calories, macros (protein, carbs, fat) and sugar limit for today, what should I eat for my next meal?${mealsInfo} Suggest 2-3 specific dishes I can get near my location that fit my remaining budget, with approximate nutrition values for each.`;
        },
        needsLocation: true,
    },
    {
        id: 'day-plan',
        icon: <CalendarDays className="w-5 h-5" />,
        title: 'Plan my meals for the rest of today',
        getQuestion: (mealsLeft?: number) => {
            const mealsInfo = mealsLeft ? ` I have ${mealsLeft} meal${mealsLeft > 1 ? 's' : ''} left for today.` : '';
            return `Based on my remaining calories, macros and sugar limit for today, plan what I should eat for the rest of the day.${mealsInfo} For each remaining meal, suggest a specific dish or food I can get near my location, splitting my remaining budget sensibly, with approximate nutrition values.`;
        },
        needsLocation: true,
        needsMealsLeft: true,
    },
    {
        id: 'healthy-snacks',
        icon: <Zap className="w-5 h-5" />,
        title: 'Healthy snack ideas',
        getQuestion: () => 'What are some healthy, low-sugar snack options that fit my remaining calorie and macro budget for today? Suggest snacks that are easy to buy or prepare near my location, with approximate nutrition values.',
        needsLocation: true,
    },
];

// General nutrition knowledge, shown instantly without calling the AI
const NUTRITION_BASICS: { id: string; title: string; body: string[] }[] = [
    {
        id: 'calories',
        title: 'What actually makes you gain or lose fat?',
        body: [
            'Your body weight follows energy balance: eat more calories than you burn and the extra is stored (mostly as fat); eat fewer and your body uses its stores.',
            'Roughly 7,700 kcal is about 1 kg of body fat. A daily deficit of ~500 kcal leads to about 0.5 kg of fat loss per week.',
            'No single food or nutrient makes you fat on its own. What matters is the total over days and weeks, which is why tracking helps.',
        ],
    },
    {
        id: 'sugar',
        title: 'How does sugar lead to fat gain?',
        body: [
            'Sugar has 4 kcal per gram, the same as other carbs, but it is very easy to over-consume: it doesn\'t fill you up, and it hides in drinks, sauces and desserts.',
            'Sugary drinks are the biggest trap. A can of soft drink has about 35 g of sugar (~140 kcal), and a large bubble tea or sweet teh tarik/kopi can have 30-50 g, without making you any less hungry.',
            'Sugar itself isn\'t turned into fat by magic. It leads to fat gain when it pushes your total calories into a surplus, which it does easily.',
            'Lots of added sugar, especially fructose from drinks, is also linked to fat build-up in the liver, insulin resistance and tooth decay, even at normal body weight.',
            'The WHO recommends keeping added sugar under 10% of your calories (about 50 g on 2,000 kcal), ideally under 5%. That\'s the sugar limit used in this app.',
        ],
    },
    {
        id: 'fat',
        title: 'Does eating fat make you fat?',
        body: [
            'Not by itself. Dietary fat is only stored as body fat when your total calories are above what you burn, the same as carbs or protein.',
            'Fat is calorie-dense though: 9 kcal per gram vs 4 for protein and carbs. One tablespoon of cooking oil is ~120 kcal, so oily and deep-fried food adds up fast.',
            'You still need fat for hormones, brain health and absorbing vitamins A, D, E and K. Aim for roughly 20-35% of calories from fat.',
            'Prefer unsaturated fats (fish, nuts, olive or canola oil, avocado) and limit saturated fat (coconut milk, ghee, fatty meat) and trans fats (some fried snacks and pastries).',
        ],
    },
    {
        id: 'carbs',
        title: 'Are carbs or rice at night bad?',
        body: [
            'No. Carbs are your body\'s main fuel, especially for exercise. Timing (like eating rice at night) matters far less than your total intake for the day.',
            'Choose more fibre-rich carbs (brown rice, oats, wholemeal bread, fruit, vegetables, beans). They keep you full longer than white bread, sugary cereals or kuih.',
            'Low-carb diets work for some people mainly because they cut calories, not because carbs are fattening.',
        ],
    },
    {
        id: 'protein',
        title: 'Why is protein the priority?',
        body: [
            'Protein keeps you full the longest, helps you keep (or build) muscle while losing fat, and your body burns more calories digesting it than carbs or fat.',
            'A good target for active people is about 1.6-2.2 g per kg of body weight per day, spread across your meals.',
            'Easy sources: chicken, fish, eggs, tofu, tempeh, Greek yoghurt, milk, lean beef and protein shakes.',
        ],
    },
    {
        id: 'scale',
        title: 'Why does my weight jump up and down?',
        body: [
            'Daily weight can swing 0.5-2 kg from water alone: salty or high-carb meals, hormones, sleep, stress and how much food is still in your gut all play a part.',
            'Each gram of stored carbohydrate holds about 3 g of water, which is why weight drops fast at the start of a diet and bounces after a big meal.',
            'Weigh yourself at the same time each morning and look at the weekly average trend, not single days.',
        ],
    },
    {
        id: 'alcohol',
        title: 'What about alcohol?',
        body: [
            'Alcohol has 7 kcal per gram, almost as much as fat, and gives no nutrients. A pint of beer is roughly 200-250 kcal.',
            'Your body prioritises burning alcohol, so fat burning pauses while you drink, and it tends to increase appetite and late-night snacking.',
        ],
    },
];

// Builds "Street, Neighbourhood, Country" from a Nominatim address, skipping repeats
// (Singapore is both the city and the country, for example)
function formatLocation(address: Record<string, string> | undefined): string {
    if (!address) return '';
    const street = address.road || address.pedestrian || address.footway;
    const area = address.suburb || address.neighbourhood || address.quarter || address.city_district
        || address.town || address.village || address.hamlet;
    const city = address.city || address.municipality || address.county || address.state;
    const parts: string[] = [];
    for (const part of [street, area, city, address.country]) {
        if (part && !parts.some(p => p.toLowerCase() === part.toLowerCase())) {
            parts.push(part);
        }
    }
    return parts.join(', ');
}

export default function FAQPage() {
    const { nutritionTargets, dailyTotals, profile } = useStore();
    const [location, setLocation] = useState('');
    const [mealsLeft, setMealsLeft] = useState<string>('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedBasicId, setExpandedBasicId] = useState<string | null>(null);
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
                    // Reverse geocode at street level (zoom 18), in English
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`
                    );
                    const data = await response.json();

                    const locationStr = formatLocation(data.address);
                    setLocation(locationStr || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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
            // High accuracy (GPS) so the street name is right; fall back to the timeout message
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
                sugarTarget: nutritionTargets.sugar_target,
                sugarConsumed: dailyTotals.sugar,
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
                                placeholder="e.g., Bedok North Avenue 3, Bedok, Singapore"
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
                            Enter your street or area, or use your current location for nearby food suggestions
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
                            <div>
                                <span className="opacity-80">Sugar:</span>
                                <span className="ml-2 font-medium">
                                    {Math.round(dailyTotals.sugar)}g / {nutritionTargets.sugar_target}g
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

                {/* Nutrition Basics (static, no AI call) */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-700 px-1">Nutrition Basics</h3>
                    {NUTRITION_BASICS.map((topic) => (
                        <div
                            key={topic.id}
                            className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedBasicId(expandedBasicId === topic.id ? null : topic.id)}
                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 transition-colors"
                            >
                                <div className="p-2 rounded-xl bg-neutral-100">
                                    <BookOpen className="w-5 h-5 text-neutral-600" />
                                </div>
                                <span className="flex-1 font-medium text-neutral-900">{topic.title}</span>
                                {expandedBasicId === topic.id
                                    ? <ChevronUp className="w-5 h-5 text-neutral-400" />
                                    : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                            </button>
                            {expandedBasicId === topic.id && (
                                <div className="px-4 pb-4 border-t border-neutral-100">
                                    <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc pl-5">
                                        {topic.body.map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                    <p className="text-xs text-neutral-400 px-1">
                        General information, not medical advice. Talk to a doctor or dietitian about health conditions.
                    </p>
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

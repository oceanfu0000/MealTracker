import { useState } from 'react';
import { 
    Camera, 
    MessageSquare, 
    Zap, 
    Plus, 
    Target, 
    ChevronRight, 
    ChevronLeft,
    CheckCircle,
    Utensils,
    Sparkles
} from 'lucide-react';

interface UserGuideModalProps {
    onComplete: () => void;
}

interface GuideStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    example?: string;
    tip?: string;
    color: string;
}

const guideSteps: GuideStep[] = [
    {
        icon: <Camera className="w-12 h-12" />,
        title: "📸 Snap Your Meal",
        description: "Can't describe your food? No problem! Take a photo of complex meals like cai png (economy rice), mixed dishes, or anything that's hard to put into words.",
        example: "Perfect for: Cai png, nasi lemak, ban mian, or any hawker food with multiple items!",
        tip: "The AI powered by ChatGPT will analyze your photo and estimate the nutritional content automatically.",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: <MessageSquare className="w-12 h-12" />,
        title: "💬 Type It Out",
        description: "Prefer typing? Simply describe your meal in text and the AI will analyze it for you. Be as specific as you can for better accuracy!",
        example: "Try: \"Teh C peng kosong\" or \"Chicken rice, roasted, no skin\" or \"2 pcs prata with curry\"",
        tip: "Include portion sizes, cooking methods, and any modifications for more accurate results.",
        color: "from-purple-500 to-pink-500"
    },
    {
        icon: <Zap className="w-12 h-12" />,
        title: "⚡ Save to Quick Pick",
        description: "Eating the same meal often? After AI analysis, save it to Quick Pick! This saves your AI tokens and lets you log meals instantly next time.",
        example: "Great for: Daily kopi, regular lunch spots, protein shakes, or your go-to snacks!",
        tip: "The more you add to Quick Pick, the less AI tokens you'll use. Smart saving! 💡",
        color: "from-amber-500 to-orange-500"
    },
    {
        icon: <Plus className="w-12 h-12" />,
        title: "➕ Custom Quick Items",
        description: "Add your own items manually! Perfect for supplements, specific portions, or items you know the exact macros for.",
        example: "Ideas: \"Protein shake - 1 scoop\" or \"Milk - per 100ml\" or \"Boiled egg - 1 pc\"",
        tip: "You can edit quantity each time you log, so set the base portion and adjust as needed!",
        color: "from-green-500 to-emerald-500"
    },
    {
        icon: <Target className="w-12 h-12" />,
        title: "🎯 Set Your Goals",
        description: "Head to the Profile section to customize your nutrition targets. Whether you're cutting, bulking, or maintaining - set your own calorie and macro goals!",
        example: "Adjust: Daily calories, protein, carbs, and fat targets based on your fitness goals.",
        tip: "Your progress rings on the home page will show how close you are to hitting your daily targets.",
        color: "from-red-500 to-rose-500"
    }
];

export default function UserGuideModal({ onComplete }: UserGuideModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === guideSteps.length - 1;
    const step = guideSteps[currentStep];

    const handleNext = () => {
        if (isLastStep) {
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
            }, 300);
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        setIsExiting(true);
        setTimeout(() => {
            onComplete();
        }, 300);
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition-transform duration-300 ${isExiting ? 'scale-95' : 'scale-100'}`}>
                {/* Progress Bar */}
                <div className="h-1 bg-neutral-100">
                    <div 
                        className={`h-full bg-gradient-to-r ${step.color} transition-all duration-500 ease-out`}
                        style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
                    />
                </div>

                {/* Header with Icon */}
                <div className={`bg-gradient-to-br ${step.color} px-6 py-8 text-center text-white relative overflow-hidden`}>
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -translate-x-10 -translate-y-10" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-16 translate-y-16" />
                    
                    <div className="relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
                            {step.icon}
                        </div>
                        <h2 className="text-2xl font-bold">{step.title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                    <p className="text-neutral-700 text-center leading-relaxed">
                        {step.description}
                    </p>

                    {step.example && (
                        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                            <div className="flex items-start gap-2">
                                <Utensils className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-neutral-600">{step.example}</p>
                            </div>
                        </div>
                    )}

                    {step.tip && (
                        <div className={`bg-gradient-to-r ${step.color} bg-opacity-10 rounded-xl p-4`} style={{ background: `linear-gradient(to right, rgba(0,0,0,0.03), rgba(0,0,0,0.05))` }}>
                            <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-neutral-600 font-medium">{step.tip}</p>
                            </div>
                        </div>
                    )}

                    {/* Step Indicator Dots */}
                    <div className="flex justify-center gap-2 pt-2">
                        {guideSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    index === currentStep 
                                        ? 'w-6 bg-primary-500' 
                                        : index < currentStep 
                                            ? 'bg-primary-300' 
                                            : 'bg-neutral-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3">
                    {!isFirstStep ? (
                        <button
                            onClick={handlePrev}
                            className="flex items-center gap-1 px-4 py-2.5 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2.5 text-neutral-400 hover:text-neutral-600 text-sm font-medium transition-colors"
                        >
                            Skip Guide
                        </button>
                    )}

                    <button
                        onClick={handleNext}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r ${step.color} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    >
                        {isLastStep ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Get Started!</span>
                            </>
                        ) : (
                            <>
                                <span>Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>

                {/* Step Counter */}
                <div className="text-center pb-4">
                    <span className="text-xs text-neutral-400">
                        Step {currentStep + 1} of {guideSteps.length}
                    </span>
                </div>
            </div>
        </div>
    );
}

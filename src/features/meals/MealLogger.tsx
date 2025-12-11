import React, { useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AIService } from '../../services/ai';
import { MealService, NewMealLog } from '../../services/meals';
import { cn } from '../../lib/utils';

interface MealLoggerProps {
    userId: string;
    onLogComplete: () => void;
}

export const MealLogger: React.FC<MealLoggerProps> = ({ userId, onLogComplete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setPreview(url);
        setIsAnalyzing(true);

        try {
            const result = await AIService.analyzeImage(file);

            const newMeal: NewMealLog = {
                user_id: userId,
                name: result.name,
                calories: result.calories,
                protein: result.protein,
                carbs: result.carbs,
                fat: result.fat,
                image_url: null // In real app, upload to storage first
            };

            await MealService.addMeal(newMeal);
            onLogComplete();
            setPreview(null); // Reset after success
        } catch (err) {
            console.error(err);
            alert('Failed to analyze meal');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 border-slate-700 bg-opacity-30">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*"
            />

            {isAnalyzing ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden mb-2">
                        {preview && <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-50" />}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="animate-spin text-sky-400" size={32} />
                        </div>
                    </div>
                    <p className="text-sm text-sky-400 animate-pulse">Analyzing...</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-4 mb-4">
                        <Button
                            size="lg"
                            className="rounded-full w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-xl shadow-sky-900/20"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera size={28} className="text-white" />
                        </Button>
                    </div>
                    <p className="text-sm text-slate-400">Tap to log meal</p>
                </>
            )}
        </Card>
    );
};

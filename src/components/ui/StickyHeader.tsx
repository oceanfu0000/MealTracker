import React from 'react';
import { Card } from './Card';
import { motion } from 'framer-motion';

interface DailyTotalsProps {
    calories: number;
    protein: number;
    targets: {
        calories: number;
        protein: number;
    };
}

export const StickyHeader: React.FC<DailyTotalsProps> = ({ calories, protein, targets }) => {
    const calProgress = Math.min((calories / targets.calories) * 100, 100);
    const proProgress = Math.min((protein / targets.protein) * 100, 100);

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
        >
            <Card className="w-full max-w-[480px] pointer-events-auto bg-opacity-90 backdrop-blur-xl flex justify-between items-center py-3 px-5 shadow-lg border-b border-white/5 rounded-b-2xl rounded-t-none mt-[-1rem]">
                <div className="flex flex-col gap-1 items-start">
                    <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Calories</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{calories}</span>
                        <span className="text-xs text-slate-500">/ {targets.calories}</span>
                    </div>
                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <motion.div
                            className="h-full bg-sky-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${calProgress}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                    <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Protein</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-emerald-400">{protein}g</span>
                        <span className="text-xs text-slate-500">/ {targets.protein}g</span>
                    </div>
                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <motion.div
                            className="h-full bg-emerald-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${proProgress}%` }}
                        />
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

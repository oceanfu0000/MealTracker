import { useStore } from '../store';

interface MacroProgressProps {
    label: string;
    current: number;
    target: number;
    color: 'primary' | 'accent' | 'blue' | 'purple';
    unit?: string;
}

function MacroProgress({ label, current, target, color, unit = 'g' }: MacroProgressProps) {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const isOver = current > target;

    const colorClasses = {
        primary: 'bg-primary-600',
        accent: 'bg-accent-600',
        blue: 'bg-blue-600',
        purple: 'bg-purple-600',
    };

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-neutral-600">{label}</span>
                <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-neutral-900'}`}>
                    {Math.round(current)}/{target}{unit}
                </span>
            </div>
            <div className="progress-bar">
                <div
                    className={`progress-fill ${isOver ? 'bg-red-500' : colorClasses[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

export default function DailyHeader() {
    const { nutritionTargets, dailyTotals, selectedDate } = useStore();

    if (!nutritionTargets) return null;

    const today = new Date();
    const isToday =
        selectedDate.getDate() === today.getDate() &&
        selectedDate.getMonth() === today.getMonth() &&
        selectedDate.getFullYear() === today.getFullYear();

    return (
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 shadow-sm">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-neutral-900">
                        {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </h2>
                    <div className="text-sm text-neutral-600">
                        {dailyTotals.mealCount} meal{dailyTotals.mealCount !== 1 ? 's' : ''}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MacroProgress
                        label="Calories"
                        current={dailyTotals.calories}
                        target={nutritionTargets.calories_target}
                        color="primary"
                        unit=""
                    />
                    <MacroProgress
                        label="Protein"
                        current={dailyTotals.protein}
                        target={nutritionTargets.protein_target}
                        color="accent"
                    />
                    <MacroProgress
                        label="Carbs"
                        current={dailyTotals.carbs}
                        target={nutritionTargets.carbs_target}
                        color="blue"
                    />
                    <MacroProgress
                        label="Fat"
                        current={dailyTotals.fat}
                        target={nutritionTargets.fat_target}
                        color="purple"
                    />
                </div>
            </div>
        </div>
    );
}

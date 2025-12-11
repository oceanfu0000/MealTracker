import { useState } from 'react';
import { StickyHeader } from './components/ui/StickyHeader';
import { MealLogger } from './features/meals/MealLogger';
import { QuickItemsList } from './features/quick-add/QuickItemsList';
import { AddItemPopup } from './features/quick-add/AddItemPopup';
import { MealList } from './features/meals/MealList';
import { useDashboardData } from './hooks/useDashboardData';
import { QuickItem } from './services/quickItems';
import { MealService } from './services/meals';

import { ParticleBackground } from './components/ui/ParticleBackground';

function App() {
    const { meals, quickItems, totals, targets, userId, refreshMeals } = useDashboardData();
    const [selectedQuickItem, setSelectedQuickItem] = useState<QuickItem | null>(null);

    const handleQuickItemClick = (item: QuickItem) => {
        setSelectedQuickItem(item);
    };

    const handleQuickItemConfirm = async (item: QuickItem, quantity: number) => {
        try {
            await MealService.addMeal({
                user_id: userId,
                name: item.name,
                calories: Math.round(item.default_calories * quantity),
                protein: Math.round(item.default_protein * quantity),
                created_at: new Date().toISOString()
            });
            refreshMeals();
        } catch (err) {
            console.error(err);
            alert('Failed to add item');
        }
    };

    return (
        <div className="app-container pb-24">
            <ParticleBackground />
            <StickyHeader
                calories={totals.calories}
                protein={totals.protein}
                targets={targets}
            />

            <div className="space-y-8 animate-fade-in">

                {/* Quick Add Section */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 px-1 text-slate-200">Quick Add</h2>
                    <QuickItemsList items={quickItems} onAdd={handleQuickItemClick} />
                </section>

                {/* Meal Logging Section */}
                <section>
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-lg font-semibold text-slate-200">Log Meal</h2>
                        <span className="text-xs text-sky-400">AI Powered</span>
                    </div>
                    <MealLogger userId={userId} onLogComplete={refreshMeals} />
                </section>

                {/* Today's Log */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 px-1 text-slate-200">Today's Log</h2>
                    <MealList meals={meals} />
                </section>

            </div>

            <AddItemPopup
                item={selectedQuickItem}
                isOpen={!!selectedQuickItem}
                onClose={() => setSelectedQuickItem(null)}
                onConfirm={handleQuickItemConfirm}
            />
        </div>
    );
}

export default App;

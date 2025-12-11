import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { QuickItem } from '../../services/quickItems';

interface QuickItemsListProps {
    items: QuickItem[];
    onAdd: (item: QuickItem) => void;
}

export const QuickItemsList: React.FC<QuickItemsListProps> = ({ items, onAdd }) => {
    return (
        <div className="flex overflow-x-auto gap-4 py-4 px-2 no-scrollbar snap-x">
            {items.map((item) => (
                <Card
                    key={item.id}
                    className="min-w-[140px] flex flex-col justify-between snap-center bg-opacity-50"
                    hoverEffect={true}
                >
                    <div>
                        <h3 className="font-semibold text-white truncate">{item.name}</h3>
                        <p className="text-xs text-slate-400">
                            {item.default_calories} kcal • {item.default_protein}g P
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3 w-full flex items-center justify-center gap-1"
                        onClick={() => onAdd(item)}
                    >
                        <Plus size={14} /> Add
                    </Button>
                </Card>
            ))}

            {/* Add New Quick Item Placeholder */}
            <Card
                className="min-w-[140px] flex flex-col justify-center items-center snap-center bg-opacity-30 border-dashed border-slate-600 cursor-pointer hover:bg-opacity-50"
                hoverEffect={false}
                onClick={() => console.log('Create new item')}
            >
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center mb-2">
                    <Plus size={16} className="text-slate-300" />
                </div>
                <span className="text-xs text-slate-400">Create New</span>
            </Card>
        </div>
    );
};

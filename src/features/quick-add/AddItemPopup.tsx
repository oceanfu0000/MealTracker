import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Minus, Plus, X } from 'lucide-react';
import { QuickItem } from '../../services/quickItems';

interface AddItemPopupProps {
    item: QuickItem | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (item: QuickItem, quantity: number) => void;
}

export const AddItemPopup: React.FC<AddItemPopupProps> = ({ item, isOpen, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);

    if (!isOpen || !item) return null;

    const handleConfirm = () => {
        onConfirm(item, quantity);
        setQuantity(1);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <Card className="w-[90%] max-w-sm pointer-events-auto bg-slate-900 border-slate-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{item.name}</h2>
                                    <p className="text-sm text-slate-400">
                                        {Math.round(item.default_calories * quantity)} kcal • {Math.round(item.default_protein * quantity)}g Protein
                                    </p>
                                </div>
                                <button onClick={onClose} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-4 mb-6">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => setQuantity(Math.max(0.25, quantity - 0.25))}
                                >
                                    <Minus size={18} />
                                </Button>
                                <span className="text-2xl font-bold text-white w-16 text-center">{quantity}x</span>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => setQuantity(quantity + 0.25)}
                                >
                                    <Plus size={18} />
                                </Button>
                            </div>

                            <Button className="w-full" onClick={handleConfirm}>
                                Add to Log
                            </Button>
                        </Card>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

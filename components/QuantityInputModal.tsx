import React, { useState, useMemo } from 'react';
import { Product, Variant, StorageUom } from '../types';

interface QuantityInputModalProps {
    product: Product;
    variant: Variant;
    onClose: () => void;
    onSubmit: (product: Product, variant: Variant, quantity: number) => void;
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({ product, variant, onClose, onSubmit }) => {
    const [inputValue, setInputValue] = useState('');
    const [selectedUnit, setSelectedUnit] = useState<StorageUom>(variant.storageUom);
    
    // FIX: Explicitly type the return value of useMemo to ensure `unit` is of type `StorageUom`.
    const units = useMemo((): StorageUom[] => {
        if (variant.sellingMethod === 'Weight') return ['g', 'kg'];
        if (variant.sellingMethod === 'Volume') return ['ml', 'l'];
        return [];
    }, [variant.sellingMethod]);

    const handleKeyClick = (key: string) => {
        if (key === 'C') {
            setInputValue('');
        } else if (key === '←') {
            setInputValue(prev => prev.slice(0, -1));
        } else {
            setInputValue(prev => prev + key);
        }
    };

    const handleSubmit = () => {
        let quantity = parseFloat(inputValue);
        if (isNaN(quantity) || quantity <= 0) return;

        // Convert to base storage unit if necessary
        if (variant.sellingMethod === 'Weight' && selectedUnit === 'g') {
            quantity /= 1000; // Convert g to kg
        }
        if (variant.sellingMethod === 'Volume' && selectedUnit === 'ml') {
            quantity /= 1000; // Convert ml to l
        }

        onSubmit(product, variant, quantity);
    };

    const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Enter Quantity</h2>
                <p className="text-gray-400 mb-6">{product.name}</p>

                <div className="flex items-center gap-4 mb-4">
                    <input
                        type="text"
                        readOnly
                        value={inputValue}
                        className="w-full text-4xl text-right font-mono bg-gray-900 rounded-md p-2 border border-gray-700"
                    />
                    <div className="flex flex-col gap-2">
                        {units.map(unit => (
                            <button key={unit} onClick={() => setSelectedUnit(unit)} className={`px-4 py-2 rounded-md font-semibold text-sm ${selectedUnit === unit ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                {unit}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {keypadKeys.map(key => (
                        <button key={key} onClick={() => handleKeyClick(key)} className="py-4 text-2xl font-bold bg-gray-700 rounded-md hover:bg-gray-600">
                            {key}
                        </button>
                    ))}
                     <button onClick={handleKeyClick.bind(null, 'C')} className="py-4 text-xl font-bold bg-red-800/80 rounded-md hover:bg-red-700 col-span-1">CLEAR</button>
                     <button onClick={handleSubmit} className="py-4 text-xl font-bold bg-emerald-600 rounded-md hover:bg-emerald-700 col-span-2">ENTER</button>
                </div>
            </div>
        </div>
    );
};

export default QuantityInputModal;

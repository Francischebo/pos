import React, { useState } from 'react';
import { Transaction, CartItem } from '../types';

interface ReturnModalProps {
    transaction: Transaction;
    onClose: () => void;
    onSubmit: (transaction: Transaction, itemsToReturn: CartItem[]) => void;
}

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const ReturnModal: React.FC<ReturnModalProps> = ({ transaction, onClose, onSubmit }) => {
    const [itemsToReturn, setItemsToReturn] = useState<Record<string, number>>(
        transaction.items.reduce((acc, item) => ({ ...acc, [item.variantId]: 0 }), {})
    );

    const handleQuantityChange = (variantId: number, quantity: number) => {
        const originalItem = transaction.items.find(i => i.variantId === variantId);
        if (originalItem) {
            const newQuantity = Math.max(0, Math.min(originalItem.quantity, quantity));
            setItemsToReturn(prev => ({ ...prev, [variantId]: newQuantity }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const itemsList = Object.entries(itemsToReturn)
            .map(([variantId, quantity]) => {
                const originalItem = transaction.items.find(i => i.variantId === parseInt(variantId));
                return originalItem ? { ...originalItem, quantity } : null;
            })
            .filter((item): item is CartItem => item !== null && item.quantity > 0);

        if (itemsList.length > 0) {
            onSubmit(transaction, itemsList);
        }
        onClose();
    };

    const totalReturnAmount = transaction.items.reduce((total, item) => {
        const returnQuantity = itemsToReturn[item.variantId] || 0;
        return total + (item.price * returnQuantity);
    }, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
                 <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Process Return</h2>
                <p className="text-gray-400 mb-6">From Transaction: <span className="font-semibold text-red-400">{transaction.id}</span></p>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                        {transaction.items.map(item => (
                             <div key={item.variantId} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md">
                                <div>
                                    <p className="font-medium">{item.name} <span className="text-gray-400">{formatAttributes(item.variantAttributes)}</span></p>
                                    <p className="text-xs text-gray-400">Purchased: {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor={`return-qty-${item.variantId}`} className="text-sm">Return Qty:</label>
                                    <input 
                                        type="number"
                                        id={`return-qty-${item.variantId}`}
                                        value={itemsToReturn[item.variantId] || 0}
                                        onChange={(e) => handleQuantityChange(item.variantId, parseInt(e.target.value) || 0)}
                                        min="0"
                                        max={item.quantity}
                                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <div className="flex justify-between items-center text-xl font-bold mb-4">
                            <span className="text-gray-300">Total Refund:</span>
                            <span className="text-red-400">-KES {totalReturnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={totalReturnAmount <= 0}
                            className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Confirm Return
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReturnModal;
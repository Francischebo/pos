import React, { useState } from 'react';
import { PurchaseOrder } from '../types';

interface GoodsReceiptModalProps {
    purchaseOrder: PurchaseOrder;
    onClose: () => void;
    onSubmit: (poId: string, receivedItems: { variantId: number, quantityReceived: number }[]) => void;
}

const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({ purchaseOrder, onClose, onSubmit }) => {
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, string>>(
        // FIX: Type the accumulator in the callback and use string keys to ensure correct type inference.
        purchaseOrder.items.reduce((acc: Record<string, string>, item) => {
            const remaining = item.quantityOrdered - item.quantityReceived;
            // FIX: Using a number to index a Record<string, string> can cause type errors in strict mode.
            // Explicitly convert the numeric variantId to a string.
            acc[item.variantId.toString()] = remaining > 0 ? remaining.toString() : '0';
            return acc;
        }, {} as Record<string, string>)
    );

    const handleQuantityChange = (variantId: number, value: string) => {
        // FIX: Explicitly convert numeric variantId to string for object key access.
        setReceivedQuantities(prev => ({ ...prev, [variantId.toString()]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Replaced Object.entries with Object.keys to avoid type inference issues with destructured keys.
        // This ensures `variantId` is correctly inferred as a string.
        const receivedItems = Object.keys(receivedQuantities)
            .map((variantId) => ({
                variantId: parseInt(variantId),
                quantityReceived: parseFloat(receivedQuantities[variantId]) || 0,
            }))
            .filter(item => item.quantityReceived > 0);
        
        if (receivedItems.length > 0) {
            onSubmit(purchaseOrder.id, receivedItems);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-2xl relative flex flex-col h-full max-h-[80vh]">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Receive Stock</h2>
                <p className="text-gray-400 mb-6">Against Purchase Order: <span className="font-semibold text-emerald-400">{purchaseOrder.poNumber}</span></p>

                <div className="flex-grow overflow-y-auto border-t border-b border-gray-700 py-4">
                    <div className="space-y-3">
                        {purchaseOrder.items.map(item => {
                            const remaining = item.quantityOrdered - item.quantityReceived;
                            if (remaining <= 0) return null;
                            return (
                                <div key={item.variantId} className="grid grid-cols-3 items-center gap-4 p-2 bg-gray-700/50 rounded-md">
                                    <div className="col-span-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-gray-400">Ordered: {item.quantityOrdered}, Received: {item.quantityReceived}</p>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 justify-end">
                                        <label className="text-sm">Receiving Qty:</label>
                                        <input
                                            type="number"
                                            // FIX: Explicitly convert numeric variantId to string for object key access.
                                            value={receivedQuantities[item.variantId.toString()] || ''}
                                            onChange={(e) => handleQuantityChange(item.variantId, e.target.value)}
                                            min="0"
                                            max={remaining}
                                            step="0.001"
                                            className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-white"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="mt-6">
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700">
                        Confirm Goods Receipt
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GoodsReceiptModal;
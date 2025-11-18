import React, { useState } from 'react';
import { Variant, StockAdjustmentReason } from '../types';

interface StockAdjustmentModalProps {
    productName: string;
    variant: Variant & { stock: number };
    onClose: () => void;
    onSubmit: (productId: number, variantId: number, newStock: number, reason: StockAdjustmentReason) => void;
}

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ productName, variant, onClose, onSubmit }) => {
    const [newStock, setNewStock] = useState(variant.stock.toString());
    const [reason, setReason] = useState<StockAdjustmentReason | ''>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const stockValue = parseInt(newStock, 10);
        if (!isNaN(stockValue) && stockValue >= 0 && reason) {
            onSubmit(variant.productId, variant.id, stockValue, reason);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Adjust Stock</h2>
                <p className="text-gray-400 mb-6">Product: <span className="font-semibold text-emerald-400">{productName} {formatAttributes(variant.attributes)}</span></p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="currentStock" className="block text-sm font-medium text-gray-400 mb-1">Current Stock</label>
                        <input
                            type="text"
                            id="currentStock"
                            value={variant.stock}
                            disabled
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-400"
                        />
                    </div>
                     <div className="mb-4">
                        <label htmlFor="newStock" className="block text-sm font-medium text-gray-400 mb-1">New Stock Quantity</label>
                        <input
                            type="number"
                            id="newStock"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            required
                            min="0"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                     <div className="mb-6">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-400 mb-1">Reason for Adjustment</label>
                        <select
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                            required
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="" disabled>Select a reason...</option>
                            <option value="Stocktake Correction">Stocktake Correction</option>
                            <option value="Damaged Goods">Damaged Goods</option>
                            <option value="Expired Stock">Expired Stock</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Confirm Adjustment
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
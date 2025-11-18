import React from 'react';
import { Product, Variant } from '../types';

interface ImportPreviewModalProps {
    products: (Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] })[];
    onClose: () => void;
    onConfirm: () => void;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ products, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-4xl relative flex flex-col h-full max-h-[80vh]">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">Import Preview</h2>
                <p className="text-gray-400 mb-4">Found <span className="font-bold text-emerald-400">{products.length}</span> valid products. Please review the data below before importing.</p>
                
                <div className="flex-grow overflow-y-auto border border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">SKU</th>
                                <th className="px-4 py-2">Price</th>
                                <th className="px-4 py-2">Cost</th>
                                <th className="px-4 py-2">Initial Qty</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800">
                            {products.map((p, index) => {
                                const variant = p.variants?.[0];
                                const lot = variant?.lots?.[0];
                                return (
                                    <tr key={index} className="border-b border-gray-700">
                                        <td className="px-4 py-2 font-medium">{p.name}</td>
                                        <td className="px-4 py-2">{variant?.sku ?? 'N/A'}</td>
                                        <td className="px-4 py-2">{variant?.price?.toFixed(2) ?? '0.00'}</td>
                                        <td className="px-4 py-2">{variant?.cost?.toFixed(2) ?? '0.00'}</td>
                                        <td className="px-4 py-2 font-bold">{lot?.quantity ?? 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">
                        Confirm Import
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
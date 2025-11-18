import React, { useState, useMemo } from 'react';
import { Product, Variant, Supplier } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import AddSupplierModal from './AddSupplierModal';

interface ManualGoodsReceiptModalProps {
    products: Product[];
    suppliers: Supplier[];
    onClose: () => void;
    onSubmit: (data: { supplierId: number; referencePoNumber: string; items: { variantId: number; name: string; quantityReceived: number }[] }) => Promise<void>;
    onAddNewSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
}

type GRNItem = { 
    variantId: number;
    name: string;
    quantityReceived: number;
};

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const ManualGoodsReceiptModal: React.FC<ManualGoodsReceiptModalProps> = ({ products, suppliers, onClose, onSubmit, onAddNewSupplier }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
    const [supplierId, setSupplierId] = useState<string>('');
    const [referencePoNumber, setReferencePoNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        const results: (Variant & {productName: string})[] = [];
        for (const p of products) {
            if (p.name.toLowerCase().includes(lowercasedTerm)) {
                p.variants.forEach(v => results.push({...v, productName: p.name}));
            } else {
                p.variants.forEach(v => {
                    if (v.sku.toLowerCase().includes(lowercasedTerm) || v.barcode.toLowerCase().includes(lowercasedTerm)) {
                        results.push({...v, productName: p.name});
                    }
                });
            }
        }
        return results.slice(0, 5);
    }, [searchTerm, products]);
    
    const handleAddVariant = (variant: Variant & {productName: string}) => {
        if (!grnItems.some(item => item.variantId === variant.id)) {
            setGrnItems(prev => [...prev, { 
                variantId: variant.id, 
                name: `${variant.productName} ${formatAttributes(variant.attributes)}`, 
                quantityReceived: 1,
            }]);
        }
        setSearchTerm('');
    };

    const handleUpdateQuantity = (variantId: number, quantity: number) => {
        const newQuantity = Math.max(0, quantity);
        setGrnItems(prev => prev.map(item => item.variantId === variantId ? { ...item, quantityReceived: newQuantity } : item));
    };

    const handleRemoveItem = (variantId: number) => {
        setGrnItems(prev => prev.filter(item => item.variantId !== variantId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const selectedSupplierId = parseInt(supplierId);
        if (grnItems.length > 0 && selectedSupplierId) {
            setIsLoading(true);
            try {
                await onSubmit({ 
                    supplierId: selectedSupplierId, 
                    referencePoNumber, 
                    items: grnItems.filter(i => i.quantityReceived > 0)
                });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create goods receipt.');
            } finally {
                setIsLoading(false);
            }
        } else {
            setError('Please select a supplier and add at least one item.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-3xl relative flex flex-col h-full max-h-[90vh]">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Create Manual Goods Receipt</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Supplier *</label>
                         <div className="flex gap-2">
                            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                                <option value="" disabled>Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setShowAddSupplierModal(true)} className="px-3 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm whitespace-nowrap hover:bg-blue-700">Add New</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Reference PO Number (Optional)</label>
                         <input type="text" value={referencePoNumber} onChange={(e) => setReferencePoNumber(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"/>
                    </div>
                    <div className="relative md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Search Products to Add</label>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Type to search..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"/>
                        {searchResults.length > 0 && (
                            <div className="absolute w-full mt-1 bg-gray-900 border border-gray-700 rounded-md z-10">
                                {searchResults.map(v => (
                                    <div key={v.id} className="p-2 flex justify-between items-center hover:bg-gray-700/50">
                                        <span>{v.productName} {formatAttributes(v.attributes)}</span>
                                        <button type="button" onClick={() => handleAddVariant(v)} className="p-1 bg-emerald-600 rounded-full text-white"><PlusIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto border-t border-b border-gray-700 py-4">
                    <h3 className="text-lg font-semibold text-emerald-300 mb-2">Received Items</h3>
                    {grnItems.length > 0 ? (
                        <div className="space-y-2">
                            {grnItems.map(item => (
                                <div key={item.variantId} className="grid grid-cols-3 items-center gap-2 p-2 bg-gray-700/50 rounded-md">
                                    <p className="font-medium col-span-2">{item.name}</p>
                                    <div className="flex items-center gap-2 justify-end">
                                        <label className="text-sm">Qty Received:</label>
                                        <input type="number" value={item.quantityReceived} onChange={(e) => handleUpdateQuantity(item.variantId, parseFloat(e.target.value) || 0)} min="0" step="0.001" className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-white" />
                                        <button type="button" onClick={() => handleRemoveItem(item.variantId)} className="text-gray-500 hover:text-red-500 p-1"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No items added to this receipt yet.</p>
                    )}
                </div>
                
                <div className="mt-6">
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" disabled={grnItems.length === 0 || !supplierId || isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                        {isLoading ? 'Saving...' : 'Create Goods Receipt'}
                    </button>
                </div>

                {showAddSupplierModal && (
                    <AddSupplierModal
                        onClose={() => setShowAddSupplierModal(false)}
                        onSubmit={onAddNewSupplier}
                    />
                )}
            </form>
        </div>
    );
};

export default ManualGoodsReceiptModal;
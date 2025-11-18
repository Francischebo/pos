import React, { useState, useMemo } from 'react';
import { Product, PurchaseOrder, Variant, Supplier } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface CreatePOModalProps {
    products: Product[];
    suppliers: Supplier[];
    onClose: () => void;
    onSubmit: (po: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => Promise<void>;
}

type POItem = { 
    productId: number;
    variantId: number;
    name: string;
    quantity: number;
    cost: number;
    taxRate: number;
};

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const CreatePOModal: React.FC<CreatePOModalProps> = ({ products, suppliers, onClose, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [poItems, setPoItems] = useState<POItem[]>([]);
    const [poNumber, setPoNumber] = useState('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { subtotal, tax, total } = useMemo(() => {
        const subtotal = poItems.reduce((sum, item) => sum + item.cost * item.quantity, 0);
        const tax = poItems.reduce((sum, item) => sum + (item.cost * item.quantity * item.taxRate), 0);
        return { subtotal, tax, total: subtotal + tax };
    }, [poItems]);

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
        return results.slice(0, 5); // Limit results
    }, [searchTerm, products]);

    const handleAddVariant = (variant: Variant & {productName: string}) => {
        if (!poItems.some(item => item.variantId === variant.id)) {
            setPoItems(prev => [...prev, { 
                productId: variant.productId, 
                variantId: variant.id, 
                name: `${variant.productName} ${formatAttributes(variant.attributes)}`, 
                quantity: 1,
                cost: variant.cost,
                taxRate: variant.taxRate,
            }]);
        }
        setSearchTerm('');
    };

    const handleUpdateQuantity = (variantId: number, quantity: number) => {
        const newQuantity = Math.max(1, quantity);
        setPoItems(prev => prev.map(item => item.variantId === variantId ? { ...item, quantity: newQuantity } : item));
    };

    const handleRemoveItem = (variantId: number) => {
        setPoItems(prev => prev.filter(item => item.variantId !== variantId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const selectedSupplier = suppliers.find(s => s.id === parseInt(supplierId));
        if (poItems.length > 0 && poNumber && selectedSupplier) {
            const itemsToSubmit = poItems.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                quantityOrdered: item.quantity,
                quantityReceived: 0,
                cost: item.cost,
                taxRate: item.taxRate,
            }));
            
            try {
                await onSubmit({ poNumber, items: itemsToSubmit, supplier: selectedSupplier, expectedDeliveryDate, subtotal, tax, total });
                onClose();
            } catch (err) {
                 const message = (err && typeof err === 'object' && 'message' in err) 
                    ? String((err as any).message)
                    : 'An unknown error occurred while creating the PO.';
                setError(message);
            } finally {
                setIsLoading(false);
            }

        } else {
            setError('Please fill all required fields and add at least one item.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-3xl relative flex flex-col h-full max-h-[90vh]">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Create New Purchase Order</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">PO Number</label>
                         <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Supplier</label>
                         <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                            <option value="" disabled>Select Supplier</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Expected Delivery</label>
                         <input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-gray-400"/>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Search Products</label>
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
                    <h3 className="text-lg font-semibold text-emerald-300 mb-2">Order Items</h3>
                    {poItems.length > 0 ? (
                        <div className="space-y-2">
                            {poItems.map(item => (
                                <div key={item.variantId} className="grid grid-cols-5 items-center gap-2 p-2 bg-gray-700/50 rounded-md">
                                    <p className="font-medium col-span-2">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm">Cost:</label>
                                        <p className="font-mono">{(item.cost).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm">Qty:</label>
                                        <input type="number" value={item.quantity} onChange={(e) => handleUpdateQuantity(item.variantId, parseInt(e.target.value) || 1)} min="1" className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-white" />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(item.variantId)} className="text-gray-500 hover:text-red-500 p-1 justify-self-end"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No items added to this order yet.</p>
                    )}
                </div>
                
                 <div className="mt-4 pt-4 border-t border-gray-700 text-right space-y-1">
                    <p className="text-sm">Subtotal: <span className="font-semibold w-24 inline-block">KES {subtotal.toFixed(2)}</span></p>
                    <p className="text-sm">Tax: <span className="font-semibold w-24 inline-block">KES {tax.toFixed(2)}</span></p>
                    <p className="text-lg font-bold">Total: <span className="font-bold w-24 inline-block text-emerald-400">KES {total.toFixed(2)}</span></p>
                </div>

                <div className="mt-6">
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" disabled={poItems.length === 0 || !poNumber || !supplierId || isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                        {isLoading ? 'Creating PO...' : 'Create Purchase Order'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePOModal;
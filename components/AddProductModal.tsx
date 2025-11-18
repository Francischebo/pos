

import React, { useState } from 'react';
import { Product, Variant, Lot, SellingMethod, StorageUom } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface AddProductModalProps {
    onClose: () => void;
    onSubmit: (product: Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] }) => Promise<void>;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSubmit }) => {
    const [product, setProduct] = useState<Omit<Product, 'id' | 'variants'>>({
        name: '', category: '', brand: '',
        imageUrl: 'https://placehold.co/400x300/1f2937/374151?text=No+Image',
    });
    const [variants, setVariants] = useState<Omit<Variant, 'id' | 'productId'>[]>([{
        attributes: { Size: 'Regular' }, sku: '', barcode: '', price: 0, cost: 0, taxRate: 0.16, reorderPoint: 10,
        sellingMethod: 'Each', storageUom: 'Each',
        lots: [{ lotNumber: 'L-INIT', expiryDate: '', quantity: 0 }]
    }]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProduct(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleVariantChange = (index: number, field: keyof Omit<Variant, 'id' | 'productId' | 'lots' | 'attributes'>, value: string) => {
        const newVariants = [...variants];
        const targetVariant = newVariants[index] as any;

        if (field === 'price' || field === 'cost' || field === 'taxRate' || field === 'reorderPoint') {
            const numValue = parseFloat(value);
            targetVariant[field] = isNaN(numValue) ? 0 : numValue;
        } else {
            targetVariant[field] = value;
        }
        setVariants(newVariants);
    };

    const handleAttributeChange = (variantIndex: number, attrName: string, attrValue: string) => {
        const newVariants = [...variants];
        newVariants[variantIndex].attributes[attrName] = attrValue;
        setVariants(newVariants);
    };
    
    const handleLotChange = (variantIndex: number, lotIndex: number, field: keyof Lot, value: string) => {
        const newVariants = [...variants];
        const targetLot = newVariants[variantIndex].lots[lotIndex] as any;

        if (field === 'quantity') {
            const numValue = parseFloat(value);
            targetLot[field] = isNaN(numValue) ? 0 : numValue;
        } else {
            targetLot[field] = value;
        }
        setVariants(newVariants);
    };

    const addVariant = () => {
        setVariants([...variants, {
            attributes: { Size: 'New Size' }, sku: '', barcode: '', price: 0, cost: 0, taxRate: 0.16, reorderPoint: 10,
            sellingMethod: 'Each', storageUom: 'Each',
            lots: [{ lotNumber: 'L-INIT', expiryDate: '', quantity: 0 }]
        }]);
    };

    const removeVariant = (index: number) => {
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onSubmit({ ...product, variants });
            onClose(); // Only close on successful submission
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save product. Please check the data and try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-400";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-4xl relative flex flex-col h-full max-h-[90vh]">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Add New Product</h2>
                
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                            <div className="p-4 border-2 border-gray-600 border-dashed rounded-md text-center">
                                <img src={product.imageUrl} alt="Preview" className="h-32 w-32 object-cover rounded-md mb-4 bg-gray-700 mx-auto" />
                                <label htmlFor="file-upload" className="cursor-pointer bg-gray-700 rounded-md font-medium text-emerald-400 hover:text-emerald-300 px-3 py-1 text-sm">
                                    <span>Upload Image</span>
                                    <input id="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                        </div>
                        <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm text-gray-400 mb-1 block">Product Name</label><input type="text" name="name" value={product.name} onChange={handleProductChange} required className={inputStyle} /></div>
                            <div><label className="text-sm text-gray-400 mb-1 block">Brand</label><input type="text" name="brand" value={product.brand} onChange={handleProductChange} className={inputStyle} /></div>
                            <div><label className="text-sm text-gray-400 mb-1 block">Category</label><input type="text" name="category" value={product.category} onChange={handleProductChange} className={inputStyle} /></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="p-4 border border-gray-700 rounded-lg relative bg-gray-900/30">
                                {variants.length > 1 && <button type="button" onClick={() => removeVariant(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>}
                                <h3 className="text-lg font-semibold text-emerald-300 mb-3">Variant {index + 1}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div><label className="text-sm text-gray-400 mb-1 block">Attribute (e.g. Size)</label><input type="text" value={Object.keys(variant.attributes)[0] || ''} onChange={(e) => {/* Complex logic needed */}} className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Value (e.g. Large)</label><input type="text" value={Object.values(variant.attributes)[0] || ''} onChange={(e) => handleAttributeChange(index, Object.keys(variant.attributes)[0] || 'Attribute', e.target.value)} className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">SKU</label><input type="text" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} required className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Barcode</label><input type="text" value={variant.barcode} onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)} className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Selling Method</label><select value={variant.sellingMethod} onChange={(e) => handleVariantChange(index, 'sellingMethod', e.target.value)} className={inputStyle}><option value="Each">Each</option><option value="Weight">Weight</option><option value="Volume">Volume</option></select></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Storage UoM</label><select value={variant.storageUom} onChange={(e) => handleVariantChange(index, 'storageUom', e.target.value)} className={inputStyle}><option value="Each">Each</option><option value="mg">mg</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option></select></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Price</label><input type="number" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} required min="0" step="0.01" className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Cost</label><input type="number" value={variant.cost} onChange={(e) => handleVariantChange(index, 'cost', e.target.value)} min="0" step="0.01" className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Reorder Point</label><input type="number" value={variant.reorderPoint} onChange={(e) => handleVariantChange(index, 'reorderPoint', e.target.value)} min="0" className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Initial Qty</label><input type="number" value={variant.lots[0].quantity} onChange={(e) => handleLotChange(index, 0, 'quantity', e.target.value)} required min="0" step="0.001" className={inputStyle} /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Expiry Date</label><input type="date" value={variant.lots[0].expiryDate} onChange={(e) => handleLotChange(index, 0, 'expiryDate', e.target.value)} className={`${inputStyle} text-gray-400`} /></div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addVariant} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:border-emerald-500/50">
                           <PlusIcon className="w-5 h-5"/> Add Another Variant
                        </button>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700">
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-wait">
                        {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                        {isLoading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProductModal;
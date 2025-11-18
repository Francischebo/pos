import React, { useState, useMemo } from 'react';
import { Product, Variant, getVariantStock } from '../types';

interface VariantSelectModalProps {
    product: Product;
    onClose: () => void;
    onAddToCart: (product: Product, variant: Variant) => void;
}

const VariantSelectModal: React.FC<VariantSelectModalProps> = ({ product, onClose, onAddToCart }) => {
    // Extract all unique attribute names, e.g., ["Size", "Color"]
    const attributeNames = useMemo(() => {
        const names = new Set<string>();
        product.variants.forEach(v => Object.keys(v.attributes).forEach(name => names.add(name)));
        return Array.from(names);
    }, [product]);

    // State to hold the currently selected attribute values, e.g., { Size: "Large", Color: "Red" }
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
        const initialState: Record<string, string> = {};
        if (attributeNames.length > 0 && product.variants.length > 0) {
            attributeNames.forEach(name => {
                // Pre-select the first available option for each attribute
                initialState[name] = product.variants[0].attributes[name];
            });
        }
        return initialState;
    });

    // Find the variant that matches the current selection
    const selectedVariant = useMemo(() => {
        return product.variants.find(v => 
            attributeNames.every(name => v.attributes[name] === selectedAttributes[name])
        );
    }, [product.variants, selectedAttributes, attributeNames]);
    
    const selectedVariantStock = selectedVariant ? getVariantStock(selectedVariant) : 0;
    const isOutOfStock = selectedVariantStock <= 0;

    const handleSelectAttribute = (name: string, value: string) => {
        setSelectedAttributes(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = () => {
        if (selectedVariant && !isOutOfStock) {
            onAddToCart(product, selectedVariant);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className="flex items-start gap-6">
                    <img src={product.imageUrl} alt={product.name} className="w-32 h-32 object-cover rounded-lg" />
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-white">{product.name}</h2>
                        <p className="text-gray-400 mb-4">{product.category}</p>
                        
                        {selectedVariant ? (
                             <div className="mt-2">
                                <p className="text-3xl font-bold text-emerald-400">KES {selectedVariant.price.toLocaleString()}</p>
                                <p className={`text-sm font-semibold ${isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
                                    {isOutOfStock ? 'Out of Stock' : `${selectedVariantStock} in stock`}
                                </p>
                            </div>
                        ) : (
                            <p className="text-yellow-400 mt-2">Selection not available.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {attributeNames.map(name => {
                        // FIX: Filter out null/undefined values to prevent invalid React keys and ensure type safety.
                        const options = Array.from(new Set(product.variants.map(v => v.attributes[name]))).filter((v): v is string => v != null);
                        return (
                            <div key={name}>
                                <h3 className="text-sm font-medium text-gray-300 mb-2">{name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {options.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => handleSelectAttribute(name, option)}
                                            className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-colors ${
                                                selectedAttributes[name] === option
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-gray-700 border-gray-600 hover:border-gray-500 text-gray-200'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedVariant || isOutOfStock}
                        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariantSelectModal;
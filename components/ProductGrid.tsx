import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { BarcodeIcon } from './icons/BarcodeIcon';
import { SearchIcon } from './icons/SearchIcon';

interface ProductGridProps {
  products: (Product & { stock: number })[];
  onSelectProduct: (product: Product) => void;
  onBarcodeSubmit: (barcode: string) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onSelectProduct, onBarcodeSubmit, onSearch, searchTerm }) => {
  const [showScanInput, setShowScanInput] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showScanInput) {
      scanInputRef.current?.focus();
    }
  }, [showScanInput]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only alphanumeric characters and hyphens
    if (/^[a-zA-Z0-9-]*$/.test(value)) {
      setBarcode(value);
    } else {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 500);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode) {
      onBarcodeSubmit(barcode);
      setBarcode('');
      setShowScanInput(false);
    }
  };

  const handleIconClick = () => {
    setShowScanInput(prev => !prev);
  };
  
  const searchBarClasses = showScanInput ? "ring-2 ring-emerald-500/70 shadow-lg shadow-emerald-500/20" : "";
  const scanInputClasses = isInvalid ? "shake-error border-red-500 ring-red-500/70" : "border-emerald-400 ring-emerald-500/70";

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 shadow-xl">
      <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-emerald-300 whitespace-nowrap">Products</h2>
        
        <div className={`relative flex-grow max-w-lg transition-all duration-300 ${searchBarClasses}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Search products by name, SKU..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700/50 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
        </div>
        
        {showScanInput ? (
          <form onSubmit={handleBarcodeSubmit} className="w-full sm:w-auto">
            <input
              ref={scanInputRef}
              type="text"
              value={barcode}
              onChange={handleBarcodeChange}
              onBlur={() => setShowScanInput(false)}
              placeholder="Scan barcode..."
              className={`w-full px-3 py-2 bg-gray-900 border rounded-full text-sm focus:outline-none ring-2 shadow-lg shadow-emerald-500/20 transition-all ${scanInputClasses}`}
            />
          </form>
        ) : (
          <button 
            onClick={handleIconClick}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <BarcodeIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Scan Barcode</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} onSelectProduct={onSelectProduct} />
        ))}
        {products.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">No products match your search.</p>}
      </div>
    </div>
  );
};

export default ProductGrid;
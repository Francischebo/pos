import React, { useMemo } from 'react';
import { Product } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface ProductCardProps {
  product: Product & { stock: number };
  onSelectProduct: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const isOutOfStock = product.stock <= 0;
  
  const handleAddClick = () => {
    onSelectProduct(product);
  };

  const priceDisplay = useMemo(() => {
    if (product.variants.length === 0) return 'N/A';
    if (product.variants.length === 1) return `KES ${product.variants[0].price.toLocaleString()}`;

    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `KES ${minPrice.toLocaleString()}`;
    }
    return `KES ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`;
  }, [product.variants]);

  return (
    <div className={`bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 ${!isOutOfStock && 'hover:scale-105 hover:shadow-emerald-500/20 hover:border-emerald-500/50'} flex flex-col relative`}>
      {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold z-10">OUT OF STOCK</div>}
      <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover"/>
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-semibold text-sm text-gray-100 flex-grow">{product.name}</h3>
        <p className="text-xs text-gray-400 mt-1">Stock: {product.stock.toFixed(3)} {product.variants[0]?.storageUom}</p>
        <p className="text-sm font-bold text-emerald-400 mt-1">{priceDisplay}</p>
      </div>
      <button
        onClick={handleAddClick}
        disabled={isOutOfStock}
        className="bg-emerald-600 text-white w-full py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        aria-label={`Add ${product.name} to cart`}
      >
        <PlusCircleIcon className="w-5 h-5" />
        <span>Add</span>
      </button>
    </div>
  );
};

export default ProductCard;
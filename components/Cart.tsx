import React from 'react';
import { CartItem, Customer } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { RefreshIcon } from './icons/RefreshIcon';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, variantId: number, newQuantity: number) => void;
  onEditQuantity: (productId: number, variantId: number) => void;
  onRemove: (productId: number, variantId: number) => void;
  onCheckout: () => void;
  subtotal: number;
  tax: number;
  total: number;
  isSaleComplete: boolean;
  paymentMessage: string;
  onAssignCustomer: () => void;
  assignedCustomer?: Customer;
  onStartNewSale: () => void;
  onPrintReceipt: () => void;
}

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onEditQuantity, onRemove, onCheckout, subtotal, tax, total, isSaleComplete, paymentMessage, onAssignCustomer, assignedCustomer, onStartNewSale, onPrintReceipt }) => {

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 shadow-xl border border-gray-700/50 sticky top-6 flex flex-col h-[calc(100vh-4.5rem)]">
      <h2 className="text-xl font-semibold mb-4 text-emerald-300 border-b border-gray-700 pb-2">Order Summary</h2>
      
      <div className="mb-3 p-3 rounded-lg bg-gray-900/50">
        {assignedCustomer ? (
           <div className="flex items-center">
             <UserCircleIcon className="w-8 h-8 text-emerald-400 mr-3" />
             <div>
               <p className="font-semibold text-sm text-gray-200">{assignedCustomer.name}</p>
               <p className="text-xs text-gray-400">{assignedCustomer.phone}</p>
             </div>
             <button onClick={onAssignCustomer} className="ml-auto text-xs text-emerald-500 hover:underline">Change</button>
           </div>
        ) : (
          <button onClick={onAssignCustomer} className="w-full flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-700/50 transition-colors">
            <UserPlusIcon className="w-6 h-6 text-gray-400"/>
            <span className="text-sm font-medium text-gray-300">Assign Customer</span>
          </button>
        )}
      </div>

      {items.length === 0 && !isSaleComplete ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <ShoppingCartIcon className="w-16 h-16 text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">Your cart is empty</p>
          <p className="text-gray-500 text-sm">Add products to get started.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
          {items.map(item => (
            <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3">
              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
              <div className="flex-grow">
                  <p className="font-medium text-sm text-gray-200 leading-tight">{item.name} <span className="text-gray-400">{formatAttributes(item.variantAttributes)}</span></p>
                  <p className="text-xs text-gray-400">@ KES {item.price.toFixed(2)}</p>
              </div>
              
              {item.sellingMethod === 'Each' ? (
                <div className="flex items-center gap-2">
                   <button onClick={() => onUpdateQuantity(item.productId, item.variantId, item.quantity - 1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-lg hover:bg-gray-600">-</button>
                   <span className="w-8 text-center font-bold">{item.quantity}</span>
                   <button onClick={() => onUpdateQuantity(item.productId, item.variantId, item.quantity + 1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-lg hover:bg-gray-600">+</button>
                </div>
              ) : (
                <div className="text-center">
                    <p className="font-bold">{item.quantity.toFixed(3)}</p>
                    <p className="text-xs text-gray-400">{item.storageUom}</p>
                    <button onClick={() => onEditQuantity(item.productId, item.variantId)} className="text-xs text-emerald-500 hover:underline">Edit</button>
                </div>
              )}

              <div className="w-24 text-right">
                <p className="font-semibold text-gray-200">KES {(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onClick={() => onRemove(item.productId, item.variantId)} className="text-gray-500 hover:text-red-500 p-1">
                  <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-medium">KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-400">Tax (VAT)</span>
                <span className="font-medium">KES {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
        <div className="flex justify-between items-center text-2xl font-bold mb-4">
          <span className="text-gray-300">Total:</span>
          <span className="text-emerald-400">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        {isSaleComplete ? (
             <div className="mt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-green-400 mb-3">
                    <CheckCircleIcon className="w-6 h-6" />
                    <span className="font-semibold text-base">{paymentMessage}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onPrintReceipt}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all duration-300"
                    >
                        <PrinterIcon className="w-6 h-6" />
                        <span>Print Receipt</span>
                    </button>
                    <button
                        onClick={onStartNewSale}
                        className="w-full bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-700 transition-all duration-300"
                    >
                        <RefreshIcon className="w-5 h-5" />
                        <span>New Sale</span>
                    </button>
                </div>
            </div>
        ) : (
            <div className="mt-4">
              <button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Proceed to Payment
              </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default Cart;
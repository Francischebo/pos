


import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Product, UserRole, StockAdjustmentReason, Variant, SellingMethod, StorageUom, StockAdjustmentLog, User } from '../types';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import AddProductModal from '../components/AddProductModal';
import ImportPreviewModal from '../components/ImportPreviewModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { InventoryIcon } from '../components/icons/InventoryIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { ChevronUpIcon } from '../components/icons/ChevronUpIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { supabase } from '../services/supabaseClient';
import { convertKeysToCamelCase } from '../Dashboard';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

type VariantWithStockAndProductInfo = Variant & {
    stock: number;
    productName: string;
    category: string;
    brand: string;
    imageUrl: string;
};

interface InventoryViewProps {
  products: Product[];
  variants: VariantWithStockAndProductInfo[];
  onAdjustStock: (productId: number, variantId: number, newStock: number, reason: StockAdjustmentReason) => void;
  userRole: UserRole;
  // FIX: Update prop types to correctly handle async operations.
  onAddNewProduct: (product: Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] }) => Promise<void>;
  onAddMultipleProducts: (products: (Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] })[]) => Promise<void>;
}

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const InventoryRow: React.FC<{ variant: VariantWithStockAndProductInfo; onAdjustClick: () => void; userRole: UserRole }> = ({ variant, onAdjustClick, userRole }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const displayStock = variant.sellingMethod === 'Each' 
      ? variant.stock 
      : `${variant.stock.toFixed(3)} ${variant.storageUom}`;

    return (
        <>
            <tr className="border-b border-gray-700 hover:bg-gray-700/30">
                <td className="px-6 py-4">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="font-bold text-emerald-400 hover:text-emerald-300">
                        {isExpanded ? '−' : '+'}
                    </button>
                </td>
                <td className="px-6 py-4 font-medium text-white flex items-center">
                    <img src={variant.imageUrl} alt={variant.productName} className="w-10 h-10 rounded-md object-cover mr-4" />
                    <div>
                        <p>{variant.productName} <span className="text-gray-400">{formatAttributes(variant.attributes)}</span></p>
                        <p className="text-xs text-gray-400">{variant.sku}</p>
                    </div>
                </td>
                <td className="px-6 py-4">{variant.category}</td>
                <td className="px-6 py-4">{variant.sellingMethod}</td>
                <td className="px-6 py-4">KES {variant.cost.toFixed(2)}</td>
                <td className="px-6 py-4">KES {variant.price.toFixed(2)}</td>
                <td className="px-6 py-4 font-bold">{displayStock}</td>
                <td className="px-6 py-4">
                {variant.stock > variant.reorderPoint ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-300 bg-green-900/50 rounded-full">In Stock</span>
                ) : variant.stock > 0 ? (
                    <span className="px-2 py-1 text-xs font-medium text-yellow-300 bg-yellow-900/50 rounded-full">Low Stock</span>
                ) : (
                    <span className="px-2 py-1 text-xs font-medium text-red-300 bg-red-900/50 rounded-full">Out of Stock</span>
                )}
                </td>
                <td className="px-6 py-4">
                    <button 
                        onClick={onAdjustClick} 
                        className="font-medium text-emerald-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={!['Admin', 'Manager'].includes(userRole)}
                    >
                        Adjust Stock
                    </button>
                </td>
            </tr>
            {isExpanded && (
                 <tr className="bg-gray-800">
                    <td colSpan={9} className="p-4">
                        <div className="p-4 bg-gray-900/50 rounded-md">
                           <h4 className="font-semibold text-emerald-300 mb-2">Batch Details</h4>
                           {variant.lots.length > 0 ? (
                            <table className="w-full text-xs text-left">
                                <thead className="text-gray-400">
                                    <tr>
                                        <th className="py-1 px-2">Lot #</th>
                                        <th className="py-1 px-2">Expiry Date</th>
                                        <th className="py-1 px-2">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {variant.lots.map(lot => (
                                    <tr key={lot.lotNumber}>
                                        <td className="py-1 px-2">{lot.lotNumber}</td>
                                        <td className="py-1 px-2">{lot.expiryDate}</td>
                                        <td className="py-1 px-2 font-mono">{lot.quantity.toFixed(3)} {variant.storageUom}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                           ) : <p className="text-xs text-gray-500">No batch information available.</p>}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};


const InventoryView: React.FC<InventoryViewProps> = ({ products, variants, onAdjustStock, userRole, onAddNewProduct, onAddMultipleProducts }) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [adjustmentLogs, setAdjustmentLogs] = useState<StockAdjustmentLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [adjustingVariant, setAdjustingVariant] = useState<VariantWithStockAndProductInfo | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<(Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] })[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockAdjustmentLog, direction: 'asc' | 'desc' } | null>(null);

  const fetchAdjustmentLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    const { data, error } = await supabase!
        .from('stock_adjustment_logs')
        .select('*, user:profiles(*), variant:variants(product_id, attributes)');
    
    if (error) {
        alert('Failed to load adjustment history.');
    } else {
        const formattedLogs: StockAdjustmentLog[] = data.map((log: any) => {
            const product = products.find(p => p.id === log.variant.product_id);
            return {
                id: log.id,
                date: new Date(log.date),
                user: convertKeysToCamelCase(log.user),
                productName: product?.name || 'Unknown',
                variantAttributes: log.variant.attributes,
                previousStock: log.previous_stock,
                newStock: log.new_stock,
                reason: log.reason,
            };
        });
        setAdjustmentLogs(formattedLogs);
    }
    setIsLoadingLogs(false);
  }, [products]);

  useEffect(() => {
    if (activeTab === 'history' && adjustmentLogs.length === 0) {
        fetchAdjustmentLogs();
    }
  }, [activeTab, adjustmentLogs.length, fetchAdjustmentLogs]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(1); // Skip header
        const productsMap = new Map<string, Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] }>();
        const errors: string[] = [];
        
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            const values = line.split(',').map(v => v.trim());
            const lineNumber = index + 2;

            if (values.length < 16) { // Expect at least 16 columns
                errors.push(`Line ${lineNumber}: Invalid column count. Expected at least 16, got ${values.length}.`);
                return;
            }

            const [
                name, brand, category, imageUrl, sellingMethod, storageUom, 
                attributesJSON, sku, barcode, priceStr, costStr, taxRateStr, 
                reorderPointStr, lotNumber, expiryDate, quantityStr
            ] = values;

            if (!name || !sku) {
                errors.push(`Line ${lineNumber}: 'Product Name' and 'SKU' are required fields.`);
                return;
            }

            const price = parseFloat(priceStr);
            const cost = parseFloat(costStr);
            const taxRate = parseFloat(taxRateStr);
            const reorderPoint = parseInt(reorderPointStr, 10);
            const quantity = parseFloat(quantityStr);

            if (isNaN(price) || isNaN(cost) || isNaN(taxRate) || isNaN(reorderPoint) || isNaN(quantity)) {
                errors.push(`Line ${lineNumber}: Contains an invalid number for price, cost, tax, reorder point, or quantity.`);
                return;
            }

            let attributes = {};
            try {
                attributes = JSON.parse(attributesJSON || '{}');
            } catch {
                errors.push(`Line ${lineNumber}: Invalid JSON in attributes column: "${attributesJSON}"`);
                return;
            }

            if (!productsMap.has(name)) {
                 productsMap.set(name, {
                    name, brand, category, 
                    imageUrl: imageUrl || 'https://placehold.co/400x300/1f2937/374151?text=No+Image',
                    variants: []
                });
            }
            
            const product = productsMap.get(name)!;

            product.variants.push({
                attributes, sku, barcode, price, cost, taxRate, reorderPoint,
                sellingMethod: (sellingMethod as SellingMethod) || 'Each',
                storageUom: (storageUom as StorageUom) || 'Each',
                lots: [{
                    lotNumber: lotNumber || `IMPORT-${Date.now().toString().slice(-4)}`, 
                    expiryDate, // Can be empty string, will be converted to null later
                    quantity,
                }]
            });
        });
        
        if (errors.length > 0) {
            alert(`Import failed with ${errors.length} errors:\n- ${errors.slice(0, 5).join('\n- ')}\n...check console for all errors.`);
            console.error("CSV Import Errors:", errors);
            return;
        }

        const newProducts = Array.from(productsMap.values());
        if(newProducts.length === 0) {
            alert("No valid products were found in the CSV file.");
            return;
        }
        setParsedProducts(newProducts);
        setShowImportModal(true);
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };
  
  // FIX: Handle async operation and catch potential errors to prevent app crashes.
  const handleImportConfirm = async () => {
    try {
      await onAddMultipleProducts(parsedProducts);
      setShowImportModal(false);
      setParsedProducts([]);
    } catch (err) {
      // The error is already alerted by the `onAddMultipleProducts` function.
      // We catch it here to prevent the modal from closing on failure.
      console.error("Import failed:", err);
    }
  };

  const sortedAndFilteredLogs = useMemo(() => {
    let logs = [...adjustmentLogs];
    if (historySearchTerm) {
        const lowercasedTerm = historySearchTerm.toLowerCase();
        logs = logs.filter(log => 
            log.productName.toLowerCase().includes(lowercasedTerm) || 
            log.user.name.toLowerCase().includes(lowercasedTerm)
        );
    }
    if (sortConfig !== null) {
        logs.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            
            if (aVal instanceof Date && bVal instanceof Date) {
                 if (aVal.getTime() < bVal.getTime()) return sortConfig.direction === 'asc' ? -1 : 1;
                 if (aVal.getTime() > bVal.getTime()) return sortConfig.direction === 'asc' ? 1 : -1;
                 return 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return logs;
  }, [adjustmentLogs, historySearchTerm, sortConfig]);

  const requestSort = (key: keyof StockAdjustmentLog) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ sortKey: keyof StockAdjustmentLog, title: string }> = ({ sortKey, title }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
        <div className="flex items-center">
            {title}
            {sortConfig?.key === sortKey && (
                sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />
            )}
        </div>
    </th>
  );

  const TabButton: React.FC<{ tab: 'stock' | 'history'; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tab 
          ? 'bg-gray-800/50 text-emerald-300 border-b-2 border-emerald-300' 
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-emerald-400">Inventory Management</h1>
            {['Admin', 'Manager'].includes(userRole) && (
                <div className="flex gap-4">
                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        Add New Product
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        <UploadIcon className="w-5 h-5" />
                        Import Products
                    </button>
                </div>
            )}
        </div>

        <div className="border-b border-gray-700 mb-6">
            <div className="flex space-x-2">
                <TabButton tab="stock" label="Current Stock" icon={<InventoryIcon className="w-5 h-5" />} />
                <TabButton tab="history" label="Adjustment History" icon={<HistoryIcon className="w-5 h-5" />} />
            </div>
        </div>

        {activeTab === 'stock' && (
            <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-12"></th>
                        <th scope="col" className="px-6 py-3">Product</th>
                        <th scope="col" className="px-6 py-3">Category</th>
                        <th scope="col" className="px-6 py-3">Selling Method</th>
                        <th scope="col" className="px-6 py-3">Cost</th>
                        <th scope="col" className="px-6 py-3">Price</th>
                        <th scope="col" className="px-6 py-3">Stock Level</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {variants.map(variant => (
                        <InventoryRow 
                            key={variant.id} 
                            variant={variant}
                            onAdjustClick={() => setAdjustingVariant(variant)}
                            userRole={userRole}
                        />
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by product or user..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
                    />
                </div>
                {isLoadingLogs ? (
                     <div className="flex items-center justify-center h-64">
                        <LoadingSpinnerIcon className="w-8 h-8 text-emerald-400" />
                        <span className="ml-2 text-gray-400">Loading history...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="date" title="Date" />
                                    <th scope="col" className="px-6 py-3">Product</th>
                                    <th scope="col" className="px-6 py-3">User</th>
                                    <th scope="col" className="px-6 py-3">Reason</th>
                                    <th scope="col" className="px-6 py-3 text-right">Previous Qty</th>
                                    <th scope="col" className="px-6 py-3 text-right">New Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredLogs.map(log => (
                                    <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-6 py-4">{log.date.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium">{log.productName} <span className="text-gray-400">{formatAttributes(log.variantAttributes)}</span></td>
                                        <td className="px-6 py-4">{log.user.name}</td>
                                        <td className="px-6 py-4">{log.reason}</td>
                                        <td className="px-6 py-4 text-right font-mono">{log.previousStock.toFixed(3)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">{log.newStock.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

      {adjustingVariant && (
        <StockAdjustmentModal
            productName={adjustingVariant.productName}
            variant={adjustingVariant}
            onClose={() => setAdjustingVariant(null)}
            onSubmit={onAdjustStock}
        />
      )}
      {showAddModal && (
          <AddProductModal
            onClose={() => setShowAddModal(false)}
            onSubmit={onAddNewProduct}
          />
      )}
      {showImportModal && (
          <ImportPreviewModal
            products={parsedProducts}
            onClose={() => setShowImportModal(false)}
            onConfirm={handleImportConfirm}
          />
      )}
    </div>
  );
};

export default InventoryView;

import React, { useState, useMemo } from 'react';
import { PurchaseInvoice, Supplier } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface ManualInvoiceModalProps {
    suppliers: Supplier[];
    onClose: () => void;
    onSubmit: (invoice: Omit<PurchaseInvoice, 'id' | 'status'>) => Promise<void>;
}

const ManualInvoiceModal: React.FC<ManualInvoiceModalProps> = ({ suppliers, onClose, onSubmit }) => {
    const [supplierId, setSupplierId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<{ description: string; amount: string }[]>([{ description: '', amount: '' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const total = useMemo(() => {
        return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }, [items]);

    const handleItemChange = (index: number, field: 'description' | 'amount', value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', amount: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const selectedSupplier = suppliers.find(s => s.id === parseInt(supplierId));

        if (!invoiceNumber || !selectedSupplier || !items.every(i => i.description && parseFloat(i.amount) > 0)) {
            setError('Please fill all required fields and ensure all item amounts are valid.');
            return;
        }
        
        setIsLoading(true);
        try {
            const invoiceItems = items.map(item => ({
                description: item.description,
                amount: parseFloat(item.amount),
            }));
            
            await onSubmit({
                invoiceNumber,
                date: new Date(invoiceDate),
                dueDate,
                supplier: selectedSupplier,
                items: invoiceItems,
                total,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-2xl relative flex flex-col h-full max-h-[90vh]">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Create Manual Invoice</h2>
                
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Supplier</label>
                            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className={inputStyle}>
                                <option value="" disabled>Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Supplier Invoice #</label>
                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required className={inputStyle}/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Invoice Date</label>
                            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className={`${inputStyle} text-gray-400`}/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className={`${inputStyle} text-gray-400`}/>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-emerald-300 mt-6 mb-2">Invoice Items</h3>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Description (e.g., Rent, Utilities)"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    required
                                    className={`${inputStyle} flex-grow`}
                                />
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className={`${inputStyle} w-32`}
                                />
                                <button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1} className="text-gray-500 hover:text-red-500 p-2 disabled:text-gray-700 disabled:cursor-not-allowed">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addItem} className="mt-3 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
                        <PlusIcon className="w-4 h-4" /> Add Line Item
                    </button>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-700">
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <p className="text-2xl font-bold text-right">Total: <span className="text-emerald-400">KES {total.toFixed(2)}</span></p>
                    <button type="submit" disabled={isLoading} className="w-full mt-4 bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-wait">
                        {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                        {isLoading ? 'Saving...' : 'Create Invoice'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualInvoiceModal;
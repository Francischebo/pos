import React, { useState, useMemo } from 'react';
import { GoodsReceiptNote, PurchaseInvoice, PurchaseOrder, Supplier, PurchaseInvoiceItem } from '../types';

interface PurchaseInvoiceModalProps {
    goodsReceipt: GoodsReceiptNote;
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    onClose: () => void;
    onSubmit: (invoice: Omit<PurchaseInvoice, 'id'>) => void;
}

const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({ goodsReceipt, purchaseOrders, suppliers, onClose, onSubmit }) => {
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');

    const { items, total } = useMemo(() => {
        const po = purchaseOrders.find(p => p.id === goodsReceipt.purchaseOrderId);
        if (!po) return { items: [], total: 0 };
        
        const invoiceItems: PurchaseInvoiceItem[] = goodsReceipt.items.map(grnItem => {
            const poItem = po.items.find(pi => pi.variantId === grnItem.variantId);
            const itemSubtotal = poItem ? grnItem.quantityReceived * poItem.cost : 0;
            const itemTax = poItem ? itemSubtotal * poItem.taxRate : 0;
            return {
                description: `${poItem?.name || 'Unknown Item'} (Qty: ${grnItem.quantityReceived})`,
                amount: itemSubtotal + itemTax,
            };
        });

        const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

        return { items: invoiceItems, total: invoiceTotal };
    }, [goodsReceipt, purchaseOrders]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const supplier = suppliers.find(s => s.id === goodsReceipt.supplier.id);
        if (invoiceNumber && invoiceDate && dueDate && supplier) {
            onSubmit({
                invoiceNumber,
                date: new Date(invoiceDate),
                dueDate,
                goodsReceiptId: goodsReceipt.id,
                supplier: supplier,
                items,
                total,
                status: 'Unpaid',
            });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Create Supplier Invoice</h2>
                <p className="text-gray-400 mb-6">From Goods Receipt: <span className="font-semibold text-emerald-400">{goodsReceipt.id}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Supplier Invoice Number</label>
                        <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Invoice Date</label>
                        <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-gray-400" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-gray-400" />
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700">
                    <p className="text-lg font-bold text-right">Total Amount: <span className="text-emerald-400">KES {total.toFixed(2)}</span></p>
                    <button type="submit" className="w-full mt-4 bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700">
                        Create Invoice
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PurchaseInvoiceModal;
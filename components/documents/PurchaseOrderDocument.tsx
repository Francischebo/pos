import React from 'react';
import { PurchaseOrder, CompanySettings } from '../../types';

interface PurchaseOrderDocumentProps {
    purchaseOrder: PurchaseOrder;
    settings: CompanySettings;
}

const PurchaseOrderDocument: React.FC<PurchaseOrderDocumentProps> = ({ purchaseOrder, settings }) => {
    return (
        <div>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{settings.name}</h1>
                    <p className="text-sm text-gray-600">{settings.address}</p>
                    <p className="text-sm text-gray-600">{settings.phone} | {settings.email}</p>
                    <p className="text-sm text-gray-600">Tax ID: {settings.taxId}</p>
                </div>
                <img src={settings.logoUrl} alt="Company Logo" className="w-24 h-24 object-contain" />
            </header>

            <section className="my-6">
                <h2 className="text-2xl font-bold text-gray-700 text-center uppercase mb-4">Purchase Order</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-3 rounded-md">
                        <h3 className="font-semibold text-gray-500 text-sm">SUPPLIER</h3>
                        <p className="font-bold">{purchaseOrder.supplier.name}</p>
                        <p className="text-sm">{purchaseOrder.supplier.address}</p>
                        <p className="text-sm">{purchaseOrder.supplier.phone}</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md text-right">
                        <p className="text-sm"><span className="font-semibold text-gray-500">PO #:</span> {purchaseOrder.poNumber}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Date:</span> {new Date(purchaseOrder.date).toLocaleDateString()}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Expected Delivery:</span> {purchaseOrder.expectedDeliveryDate}</p>
                    </div>
                </div>
            </section>

            <section>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2">Item Description</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2 text-right">Unit Cost</th>
                            <th className="p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {purchaseOrder.items.map(item => (
                            <tr key={item.variantId} className="border-b">
                                <td className="p-2 font-semibold">{item.name}</td>
                                <td className="p-2 text-right">{item.quantityOrdered}</td>
                                <td className="p-2 text-right">KES {item.cost.toFixed(2)}</td>
                                <td className="p-2 text-right">KES {(item.cost * item.quantityOrdered).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mt-6 flex justify-end">
                <div className="w-1/2">
                    <div className="flex justify-between p-2 bg-gray-100">
                        <span className="font-semibold">Subtotal:</span>
                        <span>KES {purchaseOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2">
                        <span className="font-semibold">Tax (VAT):</span>
                        <span>KES {purchaseOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-800 text-white font-bold text-lg">
                        <span>Total:</span>
                        <span>KES {purchaseOrder.total.toFixed(2)}</span>
                    </div>
                </div>
            </section>
            
            <footer className="mt-12 pt-4 border-t text-xs text-gray-500">
                <p>Terms & Conditions: Please include the PO number on all invoices and correspondence. Delivery is expected on or before the date specified.</p>
            </footer>
        </div>
    );
};

export default PurchaseOrderDocument;
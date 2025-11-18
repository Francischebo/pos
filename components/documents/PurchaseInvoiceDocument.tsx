import React from 'react';
import { PurchaseInvoice, CompanySettings } from '../../types';

interface PurchaseInvoiceDocumentProps {
    invoice: PurchaseInvoice;
    settings: CompanySettings;
}

const PurchaseInvoiceDocument: React.FC<PurchaseInvoiceDocumentProps> = ({ invoice, settings }) => {
    return (
        <div>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{settings.name}</h1>
                    <p className="text-sm text-gray-600">{settings.address}</p>
                </div>
                <img src={settings.logoUrl} alt="Company Logo" className="w-24 h-24 object-contain" />
            </header>

            <section className="my-6">
                <h2 className="text-2xl font-bold text-gray-700 text-center uppercase mb-4">Supplier Invoice Record</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-3 rounded-md">
                        <h3 className="font-semibold text-gray-500 text-sm">SUPPLIER</h3>
                        <p className="font-bold">{invoice.supplier.name}</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md text-right">
                        <p className="text-sm"><span className="font-semibold text-gray-500">Invoice #:</span> {invoice.invoiceNumber}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Due Date:</span> {invoice.dueDate}</p>
                        {invoice.goodsReceiptId && <p className="text-sm"><span className="font-semibold text-gray-500">Ref GRN #:</span> {invoice.goodsReceiptId}</p>}
                    </div>
                </div>
            </section>
             
             <section>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2">Description</th>
                            <th className="p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2 font-semibold">{item.description}</td>
                                <td className="p-2 text-right">KES {item.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

             <section className="mt-6 flex justify-end">
                <div className="w-1/2">
                    <div className="flex justify-between p-2 bg-gray-800 text-white font-bold text-lg">
                        <span>Total Amount Due:</span>
                        <span>KES {invoice.total.toFixed(2)}</span>
                    </div>
                </div>
            </section>
            
            <footer className="mt-12 pt-4 border-t text-xs text-gray-500">
                <p>This is a record of an invoice received from the supplier for accounting purposes.</p>
            </footer>
        </div>
    );
};

export default PurchaseInvoiceDocument;
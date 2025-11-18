import React from 'react';
import { GoodsReceiptNote, CompanySettings } from '../../types';

interface GoodsReceiptDocumentProps {
    goodsReceipt: GoodsReceiptNote;
    settings: CompanySettings;
}

const GoodsReceiptDocument: React.FC<GoodsReceiptDocumentProps> = ({ goodsReceipt, settings }) => {
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
                <h2 className="text-2xl font-bold text-gray-700 text-center uppercase mb-4">Goods Receipt Note</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-3 rounded-md">
                        <h3 className="font-semibold text-gray-500 text-sm">SUPPLIER</h3>
                        <p className="font-bold">{goodsReceipt.supplier.name}</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md text-right">
                        <p className="text-sm"><span className="font-semibold text-gray-500">GRN #:</span> {goodsReceipt.id}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Date Received:</span> {new Date(goodsReceipt.date).toLocaleDateString()}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-500">Original PO #:</span> {goodsReceipt.purchaseOrderNumber}</p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="font-semibold mb-2">Received Items</h3>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2">Item Description</th>
                            <th className="p-2 text-right">Quantity Received</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {goodsReceipt.items.map(item => (
                            <tr key={item.variantId} className="border-b">
                                <td className="p-2 font-semibold">{item.name}</td>
                                <td className="p-2 text-right">{item.quantityReceived}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <footer className="mt-12 pt-4 grid grid-cols-2 gap-8 text-sm">
                <div>
                    <p className="font-semibold">Received By:</p>
                    <div className="mt-8 border-b border-gray-400"></div>
                    <p className="mt-1">Signature</p>
                </div>
                 <div>
                    <p className="font-semibold">Supplier Representative:</p>
                    <div className="mt-8 border-b border-gray-400"></div>
                    <p className="mt-1">Signature</p>
                </div>
            </footer>
        </div>
    );
};

export default GoodsReceiptDocument;
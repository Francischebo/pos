import React, { useState, useMemo } from 'react';
import { Product, PurchaseOrder, Variant, Supplier, GoodsReceiptNote, PurchaseInvoice, CompanySettings } from '../types';
import CreatePOModal from '../components/CreatePOModal';
import GoodsReceiptModal from '../components/GoodsReceiptModal';
import PurchaseInvoiceModal from '../components/PurchaseInvoiceModal';
import ManualInvoiceModal from '../components/ManualInvoiceModal';
import ViewDocumentModal from '../components/ViewDocumentModal';
import AddSupplierModal from '../components/AddSupplierModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SupplierIcon } from '../components/icons/SupplierIcon';
import { ReportsIcon } from '../components/icons/ReportsIcon';
import { TransactionsIcon } from '../components/icons/TransactionsIcon';
import { ChevronUpIcon } from '../components/icons/ChevronUpIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import ManualGoodsReceiptModal from '../components/ManualGoodsReceiptModal';

type VariantWithStockAndProductInfo = Variant & {
    stock: number;
    productName: string;
};

interface PurchasingViewProps {
  variants: VariantWithStockAndProductInfo[];
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceiptNote[];
  invoices: PurchaseInvoice[];
  onCreatePO: (po: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => Promise<void>;
  onReceiveStock: (poId: string, receivedItems: { variantId: number, quantityReceived: number }[]) => void;
  onCreateInvoice: (invoice: Omit<PurchaseInvoice, 'id'>) => void;
  onCreateManualInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'status'>) => Promise<void>;
  onAddNewSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onMarkInvoiceAsPaid: (invoiceId: string) => void;
  onPrintPO: (po: PurchaseOrder) => void;
  companySettings: CompanySettings;
  onCreateManualGRN: (data: { supplierId: number; referencePoNumber: string; items: { variantId: number; name: string; quantityReceived: number }[] }) => Promise<void>;
}

type PurchasingTab = 'pos' | 'grns' | 'invoices' | 'suppliers';

const PurchasingView: React.FC<PurchasingViewProps> = ({ variants, products, suppliers, purchaseOrders, goodsReceipts, invoices, onCreatePO, onReceiveStock, onCreateInvoice, onCreateManualInvoice, onAddNewSupplier, onMarkInvoiceAsPaid, onPrintPO, companySettings, onCreateManualGRN }) => {
  const [activeTab, setActiveTab] = useState<PurchasingTab>('pos');
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const [showManualGRNModal, setShowManualGRNModal] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [invoicingGRN, setInvoicingGRN] = useState<GoodsReceiptNote | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{type: 'po' | 'grn' | 'invoice', data: any} | null>(null);

  const [grnSearchTerm, setGrnSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [grnSortConfig, setGrnSortConfig] = useState<{ key: keyof GoodsReceiptNote | 'original_po', direction: 'asc' | 'desc' } | null>(null);
  const [invoiceSortConfig, setInvoiceSortConfig] = useState<{ key: keyof PurchaseInvoice, direction: 'asc' | 'desc' } | null>(null);

  const reorderSuggestions = variants.filter(v => v.stock <= v.reorderPoint);

  const sortedAndFilteredGrns = useMemo(() => {
    let items = [...goodsReceipts];
    if (grnSearchTerm) {
      const lowercasedTerm = grnSearchTerm.toLowerCase();
      items = items.filter(grn => 
        grn.id.toLowerCase().includes(lowercasedTerm) || 
        grn.purchaseOrderNumber.toLowerCase().includes(lowercasedTerm) || 
        grn.supplier.name.toLowerCase().includes(lowercasedTerm)
      );
    }
    if (grnSortConfig) {
      items.sort((a, b) => {
        const aVal = a[grnSortConfig.key as keyof GoodsReceiptNote];
        const bVal = b[grnSortConfig.key as keyof GoodsReceiptNote];
        if (aVal < bVal) return grnSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return grnSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [goodsReceipts, grnSearchTerm, grnSortConfig]);

  const sortedAndFilteredInvoices = useMemo(() => {
    let items = [...invoices];
    if (invoiceSearchTerm) {
      const lowercasedTerm = invoiceSearchTerm.toLowerCase();
      items = items.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(lowercasedTerm) || 
        inv.supplier.name.toLowerCase().includes(lowercasedTerm)
      );
    }
    if (invoiceSortConfig) {
      items.sort((a, b) => {
        const aVal = a[invoiceSortConfig.key];
        const bVal = b[invoiceSortConfig.key];
        if (aVal < bVal) return invoiceSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return invoiceSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [invoices, invoiceSearchTerm, invoiceSortConfig]);

  const requestGrnSort = (key: keyof GoodsReceiptNote) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (grnSortConfig && grnSortConfig.key === key && grnSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setGrnSortConfig({ key, direction });
  };
  
  const requestInvoiceSort = (key: keyof PurchaseInvoice) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (invoiceSortConfig && invoiceSortConfig.key === key && invoiceSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setInvoiceSortConfig({ key, direction });
  };
  
  const SortableHeader: React.FC<{ sortKey: any, title: string, config: any, requestSort: (key: any) => void }> = ({ sortKey, title, config, requestSort }) => (
    <th scope="col" className="px-4 py-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
        <div className="flex items-center">
            {title}
            {config?.key === sortKey && (
                config.direction === 'asc' ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />
            )}
        </div>
    </th>
  );

  const TabButton: React.FC<{ tab: PurchasingTab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
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
            <h1 className="text-3xl font-bold text-emerald-400">Purchasing & Procurement</h1>
            {activeTab === 'pos' && (
                <button onClick={() => setShowCreatePOModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    Create New PO
                </button>
            )}
        </div>
      
        <div className="border-b border-gray-700 mb-6">
            <div className="flex space-x-2">
                <TabButton tab="pos" label="Purchase Orders" icon={<ReportsIcon className="w-5 h-5" />} />
                <TabButton tab="grns" label="Goods Receipts" icon={<TransactionsIcon className="w-5 h-5" />} />
                <TabButton tab="invoices" label="Supplier Invoices" icon={<TransactionsIcon className="w-5 h-5" />} />
                <TabButton tab="suppliers" label="Suppliers" icon={<SupplierIcon className="w-5 h-5" />} />
            </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
            {activeTab === 'pos' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-2">PO Number</th>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Supplier</th>
                                <th className="px-4 py-2">Total</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => (
                                <tr key={po.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                    <td className="px-4 py-2 font-mono font-semibold">{po.poNumber}</td>
                                    <td className="px-4 py-2">{new Date(po.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{po.supplier.name}</td>
                                    <td className="px-4 py-2">KES {po.total.toFixed(2)}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${po.status === 'Ordered' ? 'bg-blue-900/50 text-blue-300' : po.status === 'Partially Received' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setViewingDocument({type: 'po', data: po})} className="font-medium text-emerald-500 hover:underline text-xs">View</button>
                                            {po.status !== 'Received' && <button onClick={() => setReceivingPO(po)} className="font-medium text-blue-500 hover:underline text-xs">Receive Stock</button>}
                                            <button
                                                onClick={() => onPrintPO(po)}
                                                className="font-medium text-purple-400 hover:underline text-xs flex items-center gap-1"
                                                title="Download PO as PDF"
                                            >
                                                <DownloadIcon className="w-4 h-4" />
                                                Download
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'grns' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <input type="text" placeholder="Search GRNs..." value={grnSearchTerm} onChange={e => setGrnSearchTerm(e.target.value)} className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                        <button onClick={() => setShowManualGRNModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            <PlusIcon className="w-5 h-5" />
                            Add Receipts/Invoices
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="id" title="GRN ID" config={grnSortConfig} requestSort={requestGrnSort} />
                                    <SortableHeader sortKey="date" title="Date" config={grnSortConfig} requestSort={requestGrnSort} />
                                    <SortableHeader sortKey="purchaseOrderNumber" title="Original PO" config={grnSortConfig} requestSort={requestGrnSort} />
                                    <th className="px-4 py-2">Supplier</th>
                                    <th className="px-4 py-2">Invoice Status</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredGrns.map(grn => {
                                    const isInvoiced = invoices.some(inv => inv.goodsReceiptId === grn.id);
                                    return (
                                        <tr key={grn.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                            <td className="px-4 py-2 font-mono font-semibold">{grn.id}</td>
                                            <td className="px-4 py-2">{new Date(grn.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 font-mono">{grn.purchaseOrderNumber}</td>
                                            <td className="px-4 py-2">{grn.supplier?.name || 'Unknown Supplier'}</td>
                                            <td className="px-4 py-2">
                                                {isInvoiced ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/50 text-green-300">Invoiced</span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-900/50 text-yellow-300">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 space-x-2">
                                                <button onClick={() => setViewingDocument({type: 'grn', data: grn})} className="font-medium text-emerald-500 hover:underline text-xs">View</button>
                                                {!isInvoiced && <button onClick={() => setInvoicingGRN(grn)} className="font-medium text-blue-500 hover:underline text-xs">Create Invoice</button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             {activeTab === 'invoices' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <input type="text" placeholder="Search Invoices..." value={invoiceSearchTerm} onChange={e => setInvoiceSearchTerm(e.target.value)} className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                        <button onClick={() => setShowManualInvoiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            <PlusIcon className="w-5 h-5" />
                            Create Manual Invoice
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="invoiceNumber" title="Invoice #" config={invoiceSortConfig} requestSort={requestInvoiceSort} />
                                    <SortableHeader sortKey="date" title="Date" config={invoiceSortConfig} requestSort={requestInvoiceSort} />
                                    <th className="px-4 py-2">Supplier</th>
                                    <SortableHeader sortKey="total" title="Total" config={invoiceSortConfig} requestSort={requestInvoiceSort} />
                                    <SortableHeader sortKey="status" title="Status" config={invoiceSortConfig} requestSort={requestInvoiceSort} />
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredInvoices.map(inv => (
                                    <tr key={inv.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-4 py-2 font-mono font-semibold">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-2">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2">{inv.supplier.name}</td>
                                        <td className="px-4 py-2">KES {inv.total.toFixed(2)}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${inv.status === 'Unpaid' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 space-x-2">
                                            <button onClick={() => setViewingDocument({type: 'invoice', data: inv})} className="font-medium text-emerald-500 hover:underline text-xs">View</button>
                                            {inv.status === 'Unpaid' && (
                                                <button onClick={() => onMarkInvoiceAsPaid(inv.id)} className="font-medium text-green-500 hover:underline text-xs">Mark as Paid</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'suppliers' && (
                 <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowAddSupplierModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            <PlusIcon className="w-5 h-5" />
                            Add New Supplier
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                                <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Contact Person</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Email</th></tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-4 py-2 font-semibold">{s.name}</td><td className="px-4 py-2">{s.contactPerson}</td><td className="px-4 py-2">{s.phone}</td><td className="px-4 py-2">{s.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}
        </div>

      {showCreatePOModal && (
        <CreatePOModal 
            products={products}
            suppliers={suppliers}
            onClose={() => setShowCreatePOModal(false)}
            onSubmit={onCreatePO}
        />
      )}
      {receivingPO && (
          <GoodsReceiptModal
            purchaseOrder={receivingPO}
            onClose={() => setReceivingPO(null)}
            onSubmit={onReceiveStock}
          />
      )}
      {invoicingGRN && (
          <PurchaseInvoiceModal
            goodsReceipt={invoicingGRN}
            onClose={() => setInvoicingGRN(null)}
            onSubmit={onCreateInvoice}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
          />
      )}
       {showAddSupplierModal && (
        <AddSupplierModal
            onClose={() => setShowAddSupplierModal(false)}
            onSubmit={onAddNewSupplier}
        />
      )}
       {showManualInvoiceModal && (
        <ManualInvoiceModal
            suppliers={suppliers}
            onClose={() => setShowManualInvoiceModal(false)}
            onSubmit={onCreateManualInvoice}
        />
      )}
      {showManualGRNModal && (
        <ManualGoodsReceiptModal
            products={products}
            suppliers={suppliers}
            onClose={() => setShowManualGRNModal(false)}
            onSubmit={onCreateManualGRN}
            onAddNewSupplier={onAddNewSupplier}
        />
      )}
      {viewingDocument && (
        <ViewDocumentModal
            documentType={viewingDocument.type}
            documentData={viewingDocument.data}
            companySettings={companySettings}
            onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default PurchasingView;
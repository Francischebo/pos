
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, CartItem, Variant } from '../types';
import ReturnModal from '../components/ReturnModal';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PrinterIcon } from '../components/icons/PrinterIcon';
import { supabase } from '../services/supabaseClient';
import { convertKeysToCamelCase } from '../Dashboard';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

interface TransactionsViewProps {
  onProcessReturn: (transaction: Transaction, itemsToReturn: CartItem[]) => Promise<void>;
  onPrintReceipt: (transaction: Transaction) => void;
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ onProcessReturn, onPrintReceipt }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase!.from('transactions').select('*, user:profiles(*)').order('date', { ascending: false });
    
    if (error) {
        console.error("Error fetching transactions:", error);
        alert(`Failed to fetch transactions: ${error.message}`);
    } else if (data) {
        const formattedTransactions = data.map(t => ({
            ...convertKeysToCamelCase(t),
            user: convertKeysToCamelCase(t.user)
        }));
        setTransactions(formattedTransactions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleReturnSubmit = async (transaction: Transaction, itemsToReturn: CartItem[]) => {
    await onProcessReturn(transaction, itemsToReturn);
    fetchTransactions(); // Refetch data after return is processed
    setReturnTransaction(null);
  };

  const filteredTransactions = transactions.filter(txn =>
    txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (txn.customer?.name && txn.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleExport = () => {
    const headers = [
      'Transaction ID', 'Date', 'Time', 'Customer Name', 'Type', 'Items', 
      'Subtotal (KES)', 'Tax (KES)', 'Total (KES)', 'Payment Method(s)', 'User'
    ];
    
    const rows = filteredTransactions.map(txn => {
        const itemsSummary = txn.items.map(item => 
            `${item.quantity}x ${item.name} ${Object.values(item.variantAttributes).join(' ')}`
        ).join('; ');

        const paymentSummary = txn.paymentMethods.map(p => `${p.method}: ${p.amount.toFixed(2)}`).join('; ');

        return [
            txn.id,
            new Date(txn.date).toLocaleDateString(),
            new Date(txn.date).toLocaleTimeString(),
            txn.customer?.name || 'N/A',
            txn.type,
            `"${itemsSummary}"`, // Enclose in quotes to handle commas
            txn.subtotal.toFixed(2),
            txn.tax.toFixed(2),
            txn.total.toFixed(2),
            paymentSummary,
            txn.user.name
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-emerald-400">Transaction History</h1>
        <div className="flex items-center gap-4">
           <input
            type="text"
            placeholder="Search by ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
       {loading ? (
           <div className="flex items-center justify-center h-64">
               <LoadingSpinnerIcon className="w-8 h-8 text-emerald-400" />
               <span className="ml-2 text-gray-400">Loading transactions...</span>
           </div>
       ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3">Transaction ID</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Payment</th>
                <th scope="col" className="px-6 py-3">Total Amount</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(txn => (
                <tr key={txn.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-mono font-medium text-white">{txn.id}</td>
                  <td className="px-6 py-4 text-gray-400">{new Date(txn.date).toLocaleString()}</td>
                  <td className="px-6 py-4">{txn.customer?.name || <span className="text-gray-500">N/A</span>}</td>
                  <td className="px-6 py-4">
                    {txn.paymentMethods.map(p => p.method).join(' / ')}
                  </td>
                  <td className={`px-6 py-4 font-bold ${txn.type === 'Sale' ? 'text-white' : 'text-red-400'}`}>
                    {txn.type === 'Return' && '-'}KES {txn.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {txn.type === 'Sale' && (
                        <button 
                          onClick={() => setReturnTransaction(txn)} 
                          className="font-medium text-red-500 hover:underline"
                        >
                          Process Return
                        </button>
                      )}
                      <button
                        onClick={() => onPrintReceipt(txn)}
                        className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                        title="Print Receipt"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        <span>Print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-8">No transactions found.</p>
          )}
        </div>
       )}
      </div>

      {returnTransaction && (
        <ReturnModal 
            transaction={returnTransaction}
            onClose={() => setReturnTransaction(null)}
            onSubmit={handleReturnSubmit}
        />
      )}
    </div>
  );
};

export default TransactionsView;

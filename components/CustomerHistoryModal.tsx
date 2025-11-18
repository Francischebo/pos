import React, { useMemo } from 'react';
import { Customer, Transaction } from '../types';

interface CustomerHistoryModalProps {
    customer: Customer;
    transactions: Transaction[];
    onClose: () => void;
}

const KPICard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
        <h3 className="text-sm font-semibold text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, transactions, onClose }) => {
    
    const stats = useMemo(() => {
        const salesTransactions = transactions.filter(t => t.type === 'Sale');
        const totalSpend = salesTransactions.reduce((sum, txn) => sum + txn.total, 0);
        const totalVisits = salesTransactions.length;
        const avgSpend = totalVisits > 0 ? totalSpend / totalVisits : 0;
        return { totalSpend, totalVisits, avgSpend };
    }, [transactions]);

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-3xl relative flex flex-col h-full max-h-[80vh]">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className="border-b border-gray-700 pb-4 mb-4">
                    <h2 className="text-3xl font-bold text-emerald-400">{customer.name}</h2>
                    <p className="text-gray-400">{customer.phone}</p>
                    <div className="mt-2 flex gap-4 text-sm">
                        <span>Loyalty Points: <span className="font-bold text-white">{customer.loyaltyPoints}</span></span>
                        <span>Store Credit: <span className="font-bold text-white">KES {customer.storeCredit.toLocaleString()}</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <KPICard title="Total Spend" value={`KES ${stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0})}`} />
                    <KPICard title="Total Visits" value={stats.totalVisits.toString()} />
                    <KPICard title="Avg. Spend / Visit" value={`KES ${stats.avgSpend.toLocaleString(undefined, { maximumFractionDigits: 0})}`} />
                </div>

                <h3 className="text-xl font-semibold text-gray-300 mb-3">Transaction Log</h3>
                <div className="flex-grow overflow-y-auto border border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Transaction ID</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Amount (KES)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800">
                           {transactions.map(txn => (
                               <tr key={txn.id} className="border-b border-gray-700">
                                   <td className="px-4 py-2 text-gray-400">{txn.date.toLocaleString()}</td>
                                   <td className="px-4 py-2 font-mono">{txn.id}</td>
                                   <td className="px-4 py-2">
                                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${txn.type === 'Sale' ? 'text-green-300 bg-green-900/50' : 'text-red-300 bg-red-900/50'}`}>
                                        {txn.type}
                                     </span>
                                   </td>
                                   <td className={`px-4 py-2 font-bold ${txn.type === 'Sale' ? 'text-white' : 'text-red-400'}`}>
                                       {txn.type === 'Return' && '-'}{txn.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                   </td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                    {transactions.length === 0 && <p className="text-center p-8 text-gray-500">No transactions found for this customer.</p>}
                </div>
            </div>
         </div>
    );
};

export default CustomerHistoryModal;

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, Transaction, Product, UserRole } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import AddUserModal from '../components/AddUserModal';
import { supabase } from '../services/supabaseClient';
import { convertKeysToCamelCase } from '../Dashboard';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

interface AdminViewProps {
    users: User[];
    products: Product[];
    onResetData: () => void;
}

const KPICard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

type AdminTab = 'overview' | 'actions';

const AdminView: React.FC<AdminViewProps> = ({ users, products, onResetData }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase!.from('transactions').select('*');
        if (error) {
            alert('Failed to load transaction data for admin view.');
        } else {
            setTransactions(convertKeysToCamelCase(data));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchTransactions();
        }
    }, [activeTab, fetchTransactions]);

    const stats = useMemo(() => {
        const totalRevenue = transactions.filter(t => t.type === 'Sale').reduce((sum, t) => sum + t.total, 0);
        return {
            totalRevenue: `KES ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0})}`,
            userCount: users.length,
            productCount: products.length,
        };
    }, [users, transactions, products]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-emerald-400">Admin Dashboard</h1>
            
            <div className="border-b border-gray-700 mb-6">
                <div className="flex space-x-2">
                    {(['overview', 'actions'] as AdminTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                                activeTab === tab 
                                ? 'bg-gray-800/50 text-emerald-300 border-b-2 border-emerald-300' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinnerIcon className="w-8 h-8 text-emerald-400" />
                        <span className="ml-2 text-gray-400">Loading overview stats...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard title="Total Revenue" value={stats.totalRevenue} />
                        <KPICard title="Total Users" value={stats.userCount} />
                        <KPICard title="Total Products" value={stats.productCount} />
                    </div>
                )
            )}

            {activeTab === 'actions' && (
                <div className="bg-gray-800/50 rounded-lg shadow-xl p-6 border border-gray-700/50 max-w-lg">
                    <h2 className="text-xl font-bold text-red-400 mb-2">System Actions</h2>
                    <p className="text-gray-400 mb-4">These actions are irreversible. Please proceed with caution.</p>
                    <div className="border-t border-gray-700 pt-4">
                        <button onClick={onResetData} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                            <TrashIcon className="w-5 h-5" />
                            Reset All Transaction Data
                        </button>
                        <p className="text-xs text-gray-500 mt-2">This will delete all sales, purchase orders, goods receipts, and invoices.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;

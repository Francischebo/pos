
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction, UserRole, Product, User } from '../types';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';
import BarChart from '../components/charts/BarChart';
import ComboChart from '../components/charts/ComboChart';
import InsightsCard from '../components/InsightsCard';
import { supabase } from '../services/supabaseClient';
import { convertKeysToCamelCase } from '../Dashboard';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

interface ReportsViewProps {
  products: Product[];
  users: User[];
  userRole: UserRole;
}

type Period = 'today' | '7d' | '30d' | '365d' | 'all' | 'custom';
type ReportTab = 'summary' | 'sales_trend' | 'category' | 'products' | 'payments' | 'traffic' | 'employees' | 'recommendations';

const KPICard: React.FC<{ title: string; value: string; subtext?: string }> = ({ title, value, subtext }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
);

const TabButton: React.FC<{ tab: ReportTab; activeTab: ReportTab; label: string; onClick: (tab: ReportTab) => void }> = ({ tab, activeTab, label, onClick }) => (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
        activeTab === tab 
          ? 'bg-gray-800/50 text-emerald-300 border-b-2 border-emerald-300' 
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

const ReportsView: React.FC<ReportsViewProps> = ({ products, users, userRole }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [period, setPeriod] = useState<Period>('30d');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase!.from('transactions').select('*, user:profiles(*)');
    if (error) {
      alert('Failed to load transaction data for reports.');
    } else {
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
  
  if (userRole === 'Cashier') {
    return (
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold mb-6 text-red-400">Access Denied</h1>
        <p>You must be a manager or admin to view financial reports.</p>
      </div>
    );
  }

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setDateRange({start: '', end: ''});
  }
  
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({...prev, [name]: value}));
    setPeriod('custom');
  };

  const { filteredTransactions, groupBy, timeLabels, daysInPeriod } = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (period === 'custom' && dateRange.start && dateRange.end) {
        startDate = new Date(dateRange.start);
        endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
    } else {
        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case '7d':
                startDate = new Date(new Date().setDate(now.getDate() - 6));
                startDate.setHours(0,0,0,0);
                break;
            case '30d':
                startDate = new Date(new Date().setDate(now.getDate() - 29));
                startDate.setHours(0,0,0,0);
                break;
            case '365d':
                startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
                startDate.setDate(startDate.getDate() + 1);
                startDate.setHours(0,0,0,0);
                break;
            case 'all':
                if (transactions.length > 0) {
                    const sortedTxns = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    startDate = new Date(sortedTxns[0].date);
                } else {
                    startDate = new Date();
                }
                startDate.setHours(0,0,0,0);
                break;
        }
    }

    const filtered = transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate >= startDate && txnDate < endDate;
    });
    
    const rangeInDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

    let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';
    if (rangeInDays <= 2) groupBy = 'hour';
    else if (rangeInDays > 90) groupBy = 'month';
    else if (rangeInDays > 28) groupBy = 'week';
    
    const labels = new Map<string, string>();
    let current = new Date(startDate);

    while(current < endDate) {
        let dateKey;
        if (groupBy === 'hour') {
            dateKey = new Date(current.getFullYear(), current.getMonth(), current.getDate(), current.getHours()).toISOString();
            current.setHours(current.getHours() + 1);
        } else if (groupBy === 'week') {
            const firstDayOfWeek = new Date(current);
            firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
            dateKey = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate()).toISOString();
            current.setDate(current.getDate() + 7);
        } else if (groupBy === 'month') {
            dateKey = new Date(current.getFullYear(), current.getMonth(), 1).toISOString();
            current.setMonth(current.getMonth() + 1);
        } else { // day
            dateKey = new Date(current.getFullYear(), current.getMonth(), current.getDate()).toISOString();
            current.setDate(current.getDate() + 1);
        }
        labels.set(dateKey, new Date(dateKey).toISOString());
    }

    return { filteredTransactions: filtered, groupBy, timeLabels: Array.from(labels.keys()), daysInPeriod: rangeInDays };
  }, [transactions, period, dateRange]);
  
  const variantMap = useMemo(() => {
    return new Map(products.flatMap(p => 
      p.variants.map(v => [v.id, { category: p.category, productName: p.name, attributes: v.attributes, cost: v.cost }])
    ));
  }, [products]);

  const salesSummaryData = useMemo(() => {
    const salesTxns = filteredTransactions.filter(t => t.type === 'Sale');
    const totalRevenue = salesTxns.reduce((sum, t) => sum + t.total, 0);
    const grossProfit = salesTxns.reduce((sum, t) => {
        const transactionCost = t.items.reduce((itemSum, item) => {
            const variantInfo = variantMap.get(item.variantId);
            return itemSum + ( (variantInfo?.cost || 0) * item.quantity);
        }, 0);
        return sum + (t.subtotal - transactionCost);
    }, 0);
    const avgSale = salesTxns.length > 0 ? totalRevenue / salesTxns.length : 0;
    
    const bins: {[key: string]: {revenue: number, profit: number}} = {};
    timeLabels.forEach(key => bins[key] = {revenue: 0, profit: 0});
    
    salesTxns.forEach(txn => {
        const date = new Date(txn.date);
        let key = '';
        if (groupBy === 'hour') key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
        else if (groupBy === 'week') {
            const firstDayOfWeek = new Date(date);
            firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
            key = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate()).toISOString();
        }
        else if (groupBy === 'month') key = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        else key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        
        if (bins[key]) {
            bins[key].revenue += txn.total;
            const txnCost = txn.items.reduce((s, i) => s + (variantMap.get(i.variantId)?.cost || 0) * i.quantity, 0);
            bins[key].profit += (txn.subtotal - txnCost);
        }
    });
    const chartData = Object.entries(bins);

    return { kpis: { totalRevenue, grossProfit, totalTransactions: salesTxns.length, avgSale }, chartData };
  }, [filteredTransactions, variantMap, timeLabels, groupBy]);

  const salesByCategoryData = useMemo(() => {
    const data: { [key: string]: number } = {};
    filteredTransactions.filter(t => t.type === 'Sale').flatMap(t => t.items).forEach(item => {
        const category = variantMap.get(item.variantId)?.category || 'Unknown';
        data[category] = (data[category] || 0) + (item.price * item.quantity);
    });
    return Object.entries(data).map(([label, value]) => ({label, value})).sort((a,b) => b.value-a.value);
  }, [filteredTransactions, variantMap]);

  const topProductsData = useMemo(() => {
    const data: { [key: string]: number } = {};
     filteredTransactions.filter(t => t.type === 'Sale').flatMap(t => t.items).forEach(item => {
        const variantInfo = variantMap.get(item.variantId);
        const name = variantInfo ? `${variantInfo.productName} (${Object.values(variantInfo.attributes).join(', ')})` : 'Unknown';
        data[name] = (data[name] || 0) + (item.price * item.quantity);
    });
    return Object.entries(data).map(([label, value]) => ({label, value})).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredTransactions, variantMap]);

  const paymentMethodsData = useMemo(() => {
      const data: { [key: string]: number } = {};
      filteredTransactions.filter(t => t.type === 'Sale').forEach(t => {
          t.paymentMethods.forEach(pm => {
            data[pm.method] = (data[pm.method] || 0) + pm.amount;
          });
      });
      return Object.entries(data).map(([label, value]) => ({label, value}));
  }, [filteredTransactions]);
  
  const hourlyTrafficData = useMemo(() => {
    const hourlyBins: { [hour: number]: number } = {};
    for(let i=0; i<24; i++) hourlyBins[i] = 0;
    filteredTransactions.filter(t => t.type === 'Sale').forEach(t => {
        hourlyBins[new Date(t.date).getHours()]++;
    });
    const avgHourly = Object.entries(hourlyBins).map(([hour, count]) => ({
        label: new Date(0, 0, 0, parseInt(hour)).toLocaleTimeString('en-US', {hour: 'numeric', hour12: true}).toLowerCase(),
        value: count / (daysInPeriod || 1),
        key: hour,
    }));
    return avgHourly;
  }, [filteredTransactions, daysInPeriod]);
  
  const userPerformanceData = useMemo(() => {
      const data: { [key: string]: number } = {};
      filteredTransactions.filter(t => t.type === 'Sale').forEach(t => {
          const name = t.user.name;
          data[name] = (data[name] || 0) + t.total;
      });
      return Object.entries(data).map(([label, value]) => ({label, value})).sort((a,b) => b.value-a.value);
  }, [filteredTransactions]);

  const getLabel = (key: string, groupBy: 'hour' | 'day' | 'week' | 'month') => {
    const date = new Date(key);
    switch (groupBy) {
        case 'hour':
            return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
        case 'day':
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
        case 'week':
            const weekStart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
            return `Wk of ${weekStart}`;
        case 'month':
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        default:
            return date.toLocaleDateString();
    }
  }

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinnerIcon className="w-10 h-10 text-emerald-400" />
                <span className="ml-3 text-gray-400">Loading report data...</span>
            </div>
        );
    }

    const productColors = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f97316', '#ec4899', '#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#6366f1'];
    switch(activeTab) {
        case 'summary':
            return (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <KPICard title="Total Revenue" value={`KES ${salesSummaryData.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                        <KPICard title="Gross Profit" value={`KES ${salesSummaryData.kpis.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                        <KPICard title="Total Transactions" value={salesSummaryData.kpis.totalTransactions.toLocaleString()} />
                        <KPICard title="Avg. Sale Value" value={`KES ${salesSummaryData.kpis.avgSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    </div>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 h-[400px]">
                        <h3 className="text-lg font-semibold mb-4">Revenue & Profit Trend</h3>
                        <ComboChart data={salesSummaryData.chartData} groupBy={groupBy} />
                    </div>
                </div>
            );
        case 'sales_trend': {
            const salesTrendData = salesSummaryData.chartData.map(([key, values]) => ({
                key,
                label: getLabel(key, groupBy),
                value: values.revenue,
            }));

            return (
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                    <h3 className="text-lg font-semibold">Total Sales Trend</h3>
                    <p className="text-sm text-gray-400 mb-4">Total revenue from sales over the selected period.</p>
                    <div className="h-[400px]">
                        <LineChart data={salesTrendData} yAxisLabel="Total Sales (KES)" onHover={() => {}} hoveredDataKey={null} color="#10b981" />
                    </div>
                </div>
            );
        }
        case 'category': {
            const totalCategoryRevenue = salesByCategoryData.reduce((sum, item) => sum + item.value, 0);
            const topCategory = salesByCategoryData[0];
            return (
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-[400px]">
                            <PieChart data={salesByCategoryData} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">Data Breakdown</h4>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase"><tr><th className="py-2 pr-4">Category</th><th className="py-2 pr-4 text-right">Revenue</th><th className="py-2 pr-4 text-right">% of Total</th></tr></thead>
                                    <tbody className="divide-y divide-gray-700 text-white">
                                        {salesByCategoryData.map(cat => (
                                            <tr key={cat.label}>
                                                <td className="py-2 pr-4 font-medium">{cat.label}</td>
                                                <td className="py-2 pr-4 text-right">KES {cat.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="py-2 pr-4 text-right font-semibold">{totalCategoryRevenue > 0 ? ((cat.value / totalCategoryRevenue) * 100).toFixed(1) : 0}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-emerald-400 mb-2">Analysis & Recommendation</h4>
                                {topCategory ? (
                                    <p className="text-sm text-gray-300">
                                        Your top-performing category is <span className="font-semibold">{topCategory.label}</span>, driving <span className="font-semibold">{totalCategoryRevenue > 0 ? ((topCategory.value / totalCategoryRevenue) * 100).toFixed(1) : 0}%</span> of sales.
                                        <br/><br/>
                                        <span className="font-semibold">Action:</span> Ensure best-selling products in this category are well-stocked and consider promoting related items to maximize revenue.
                                    </p>
                                ) : <p className="text-sm text-gray-400">No sales data for this period.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        case 'products':
            return (
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 h-[500px]">
                    <h3 className="text-lg font-semibold mb-4">Top 10 Products by Revenue</h3>
                    <BarChart data={topProductsData} horizontal colors={productColors} />
                </div>
            );
        case 'payments': {
             const totalPaymentRevenue = paymentMethodsData.reduce((sum, item) => sum + item.value, 0);
             const topPaymentMethod = paymentMethodsData.length > 0 ? paymentMethodsData.sort((a,b) => b.value - a.value)[0] : null;
             return (
                 <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4">Sales by Payment Method</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-[400px]">
                            <PieChart data={paymentMethodsData} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">Data Breakdown</h4>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase"><tr><th className="py-2 pr-4">Method</th><th className="py-2 pr-4 text-right">Revenue</th><th className="py-2 pr-4 text-right">% of Total</th></tr></thead>
                                    <tbody className="divide-y divide-gray-700 text-white">
                                        {paymentMethodsData.map(pm => (
                                            <tr key={pm.label}>
                                                <td className="py-2 pr-4 font-medium">{pm.label}</td>
                                                <td className="py-2 pr-4 text-right">KES {pm.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="py-2 pr-4 text-right font-semibold">{totalPaymentRevenue > 0 ? ((pm.value / totalPaymentRevenue) * 100).toFixed(1) : 0}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-emerald-400 mb-2">Analysis & Recommendation</h4>
                                {topPaymentMethod ? (
                                    <p className="text-sm text-gray-300">
                                        <span className="font-semibold">{topPaymentMethod.label}</span> is your most popular payment method, accounting for <span className="font-semibold">{totalPaymentRevenue > 0 ? ((topPaymentMethod.value / totalPaymentRevenue) * 100).toFixed(1) : 0}%</span> of revenue.
                                        <br/><br/>
                                        <span className="font-semibold">Action:</span> Ensure a smooth and reliable checkout experience for this payment method to maintain customer satisfaction and prevent transaction failures.
                                    </p>
                                ) : <p className="text-sm text-gray-400">No sales data for this period.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        case 'traffic': {
            const peakHour = hourlyTrafficData.reduce((max, hour) => hour.value > max.value ? hour : max, hourlyTrafficData[0] || { label: 'N/A', value: 0 });
            return (
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                    <h3 className="text-lg font-semibold">Hourly Customer Traffic</h3>
                    <p className="text-sm text-gray-400 mb-4">Average number of transactions for each hour within the selected period.</p>
                    <div className="h-[350px]">
                        <LineChart data={hourlyTrafficData} yAxisLabel="Avg. Transactions" onHover={() => {}} hoveredDataKey={null} />
                    </div>
                    {peakHour && peakHour.value > 0 && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-md text-center">
                            <p className="font-semibold text-emerald-300">Peak Hour: {peakHour.label}</p>
                            <p className="text-sm text-gray-400">Recommendation: Ensure adequate staffing during this time to manage customer flow.</p>
                        </div>
                    )}
                </div>
            );
        }
        case 'employees':
             return (
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4">User Performance by Revenue</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3 text-right">Total Sales (KES)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userPerformanceData.map(emp => (
                                    <tr key={emp.label} className="border-b border-gray-700">
                                        <td className="px-6 py-4 font-medium">{emp.label}</td>
                                        <td className="px-6 py-4 text-right font-semibold">{emp.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        case 'recommendations':
            return (
                <InsightsCard
                    totalRevenue={salesSummaryData.kpis.totalRevenue}
                    grossProfit={salesSummaryData.kpis.grossProfit}
                    transactions={filteredTransactions}
                    period={period}
                    variantMap={variantMap}
                    daysInPeriod={daysInPeriod}
                />
            );
        default: return null;
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-emerald-400">Reports</h1>
        <div className="flex items-center gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700/50 flex-wrap">
          {(['today', '7d', '30d', '365d'] as Period[]).map(p => (
            <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${period === p ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : '1Y'}
            </button>
          ))}
          <div className="flex items-center gap-2 border-l border-gray-600 ml-2 pl-2">
            <input type="date" name="start" value={dateRange.start} onChange={handleDateRangeChange} className="bg-gray-700 text-gray-300 text-sm rounded-md px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            <span className="text-gray-500">-</span>
            <input type="date" name="end" value={dateRange.end} onChange={handleDateRangeChange} className="bg-gray-700 text-gray-300 text-sm rounded-md px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
        </div>
      </div>

       <div className="border-b border-gray-700 mb-6">
            <div className="flex space-x-2 overflow-x-auto">
                <TabButton tab="summary" activeTab={activeTab} label="Sales Summary" onClick={setActiveTab} />
                <TabButton tab="sales_trend" activeTab={activeTab} label="Sales Trend" onClick={setActiveTab} />
                <TabButton tab="recommendations" activeTab={activeTab} label="Recommendations" onClick={setActiveTab} />
                <TabButton tab="category" activeTab={activeTab} label="Sales by Category" onClick={setActiveTab} />
                <TabButton tab="products" activeTab={activeTab} label="Top Products" onClick={setActiveTab} />
                <TabButton tab="payments" activeTab={activeTab} label="Payment Methods" onClick={setActiveTab} />
                <TabButton tab="traffic" activeTab={activeTab} label="Hourly Traffic" onClick={setActiveTab} />
                <TabButton tab="employees" activeTab={activeTab} label="User Performance" onClick={setActiveTab} />
            </div>
        </div>
        
        <div>
            {renderContent()}
        </div>
    </div>
  );
};

export default ReportsView;

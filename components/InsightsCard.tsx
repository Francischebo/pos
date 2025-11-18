import React, { useMemo } from 'react';
import { Transaction, Variant } from '../types';

interface InsightsCardProps {
    totalRevenue: number;
    grossProfit: number;
    transactions: Transaction[];
    period: 'today' | '7d' | '30d' | '365d' | 'all' | 'custom';
    variantMap: Map<number, { category: string; productName: string; attributes: Record<string, string>; }>;
    daysInPeriod: number;
}

const InsightItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg">
        <h4 className="font-bold text-emerald-400 mb-2">{title}</h4>
        <div className="text-sm text-gray-300 space-y-1">{children}</div>
    </div>
);

const InsightsCard: React.FC<InsightsCardProps> = ({ totalRevenue, grossProfit, transactions, period, variantMap, daysInPeriod }) => {

    const periodMap = {
        today: 'today',
        '7d': 'this week',
        '30d': 'this month',
        '365d': 'this year',
        'all': 'overall',
        custom: 'the selected period',
    };

    const insights = useMemo(() => {
        // Sales Trend Insight
        let salesTrend = 'stable';
        if (transactions.length > 10) {
            const firstHalf = transactions.slice(transactions.length / 2);
            const secondHalf = transactions.slice(0, transactions.length / 2);
            const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.total, 0) / (firstHalf.length || 1);
            const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.total, 0) / (secondHalf.length || 1);
            if (secondHalfAvg > firstHalfAvg * 1.1) salesTrend = 'upward';
            if (secondHalfAvg < firstHalfAvg * 0.9) salesTrend = 'downward';
        }

        // Top Performer (Category)
        const salesByCategory: { [key: string]: number } = {};
        transactions.flatMap(txn => txn.items).forEach(item => {
            const variantInfo = variantMap.get(item.variantId);
            const category = variantInfo?.category || 'Unknown';
            salesByCategory[category] = (salesByCategory[category] || 0) + (item.price * item.quantity);
        });
        const topCategory = Object.entries(salesByCategory).sort((a,b) => b[1] - a[1])[0];

        // Business Projection (simple linear projection)
        const dailyRevenue = totalRevenue / (daysInPeriod || 1);
        const projectedMonthlyRevenue = dailyRevenue * 30;

        return { salesTrend, topCategory, projectedMonthlyRevenue };

    }, [totalRevenue, transactions, period, variantMap, daysInPeriod]);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-gray-300">AI-Powered Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsightItem title="Sales Analysis">
                    <p>Your sales trend for <span className="font-semibold">{periodMap[period]}</span> is currently trending <span className="font-semibold text-yellow-400">{insights.salesTrend}</span>.</p>
                    <p>Consider running promotions during slower periods if this trend continues.</p>
                </InsightItem>
                <InsightItem title="Top Performers">
                   <p>Your primary revenue driver is the <span className="font-semibold text-blue-400">{insights.topCategory ? insights.topCategory[0] : 'N/A'}</span> category.</p>
                   <p>Recommendation: Ensure top-selling items in this category are always in stock and consider bundling them with other products.</p>
                </InsightItem>
                <InsightItem title="Inventory Opportunity">
                    <p>Review the "Dead Stock" report in the Inventory Analysis tab.</p>
                    <p>Recommendation: Items that haven't sold in over 30 days could be discounted or bundled to free up capital and shelf space.</p>
                </InsightItem>
                 <InsightItem title="Business Projections">
                    <p>Based on performance for {periodMap[period]}, your projected revenue for a 30-day period is approximately <span className="font-semibold text-green-400">KES {insights.projectedMonthlyRevenue.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>.</p>
                    <p>This is a simplified projection. For more accuracy, maintain consistent data entry.</p>
                </InsightItem>
            </div>
        </div>
    );
};

export default InsightsCard;
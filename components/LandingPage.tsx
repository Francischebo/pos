import React from 'react';

interface LandingPageProps {
  onNavigateToDashboard: () => void;
}

const FeatureSection: React.FC<{ title: string; features: string[] }> = ({ title, features }) => (
  <div className="w-full md:w-2/5 mb-12">
    <h2 className="text-2xl font-bold text-blue-800 mb-4">{title}</h2>
    <ul className="space-y-2 text-gray-700">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <span className="text-blue-800 mr-2">–</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <button className="bg-red-600 text-white font-semibold py-2 px-8 rounded mt-6 hover:bg-red-700 transition-colors duration-300 shadow-lg">
      REQUEST CONSULTATION
    </button>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToDashboard }) => {
  const posFeatures = [
    'Loyalty program – Rewards & Incentives',
    'Barcodes – Reporting – Customer-facing display',
    'User accounts and permissions',
    'Searchable customer database',
    'Multiple payment methods + MPESA Integration & split payments',
    'Returns, refunds, and store credit features',
  ];

  const inventoryFeatures = [
    'Accurate Stock Management',
    'Multi-branch Inventory Management',
    'Low Stock, Excess Stock, Damaged Stock notification features',
    'WAC (Weighted Average Costing)',
    'Weighing Scale Integration',
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-blue-900">Retail Solutions Inc.</h1>
        <button
          onClick={onNavigateToDashboard}
          className="bg-emerald-600 text-white font-semibold py-2 px-6 rounded hover:bg-emerald-700 transition-colors duration-300"
        >
          Launch POS System
        </button>
      </header>
      <main className="container mx-auto p-8 lg:p-16">
        <div className="flex flex-col md:flex-row justify-around items-start">
          <FeatureSection title="POS (POINT OF SALES)" features={posFeatures} />
          <FeatureSection title="INVENTORY MANAGEMENT MODULE" features={inventoryFeatures} />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;

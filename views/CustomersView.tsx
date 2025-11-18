import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onViewHistory: (customerId: number) => void;
}

const CustomersView: React.FC<CustomersViewProps> = ({ customers, onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">Customer Database</h1>
      <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
          />
      </div>
      <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3">Name</th>
                <th scope="col" className="px-6 py-3">Phone</th>
                <th scope="col" className="px-6 py-3">Loyalty Points</th>
                <th scope="col" className="px-6 py-3">Store Credit (KES)</th>
                <th scope="col" className="px-6 py-3">Last Seen</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-medium text-white">{customer.name}</td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4 font-bold">{customer.loyaltyPoints}</td>
                  <td className="px-6 py-4 font-bold">{customer.storeCredit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-400">{customer.lastSeen.toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                     <button onClick={() => onViewHistory(customer.id)} className="font-medium text-emerald-500 hover:underline">View History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomersView;
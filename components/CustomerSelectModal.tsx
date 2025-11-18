import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomerSelectModalProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({ customers, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg relative flex flex-col h-full max-h-[70vh]">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h2 className="text-xl font-bold text-white mb-4">Assign Customer</h2>
        <div className="mb-4">
            <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-emerald-500 focus:border-emerald-500"
            />
        </div>
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="space-y-2">
                {filteredCustomers.map(customer => (
                    <div 
                        key={customer.id} 
                        onClick={() => onSelect(customer)}
                        className="p-3 rounded-md bg-gray-700/50 hover:bg-emerald-500/20 cursor-pointer flex justify-between items-center"
                    >
                        <div>
                            <p className="font-semibold text-gray-200">{customer.name}</p>
                            <p className="text-sm text-gray-400">{customer.phone}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-400">Points</p>
                             <p className="font-semibold text-emerald-400">{customer.loyaltyPoints}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectModal;

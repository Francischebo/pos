import React, { useState } from 'react';
import { Supplier } from '../types';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface AddSupplierModalProps {
    onClose: () => void;
    onSubmit: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err) {
            const message = (err && typeof err === 'object' && 'message' in err) 
                ? String((err as any).message)
                : 'An unknown error occurred. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-400";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
                <button type="button" onClick={onClose} disabled={isLoading} className="absolute top-3 right-3 text-gray-400 hover:text-white disabled:cursor-not-allowed">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Add New Supplier</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Supplier Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Contact Person</label>
                        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Address</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} required className={inputStyle} />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-wait">
                        {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                        {isLoading ? 'Saving...' : 'Save Supplier'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddSupplierModal;
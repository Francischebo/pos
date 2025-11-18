import React, { useState } from 'react';
import { CompanySettings } from '../types';
import Toast from '../components/Toast';

interface SettingsViewProps {
    settings: CompanySettings;
    onSave: (newSettings: CompanySettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
    const [formData, setFormData] = useState<CompanySettings>(settings);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        setToast({ message: "Settings saved successfully!", type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-400";

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} />}
            <h1 className="text-3xl font-bold mb-6 text-emerald-400">Company Settings</h1>
            <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-lg shadow-xl p-8 border border-gray-700/50 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Logo Section */}
                    <div className="md:col-span-1 flex flex-col items-center">
                        <img src={formData.logoUrl} alt="Company Logo" className="w-32 h-32 object-contain rounded-full bg-gray-700 mb-4 border-2 border-gray-600" />
                        <label htmlFor="logo-upload" className="cursor-pointer bg-gray-700 rounded-md font-medium text-emerald-400 hover:text-emerald-300 px-4 py-2 text-sm">
                            <span>Change Logo</span>
                            <input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                    </div>

                    {/* Details Section */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                        </div>
                         <div>
                            <label htmlFor="taxId" className="block text-sm font-medium text-gray-400 mb-1">Tax ID (KRA PIN)</label>
                            <input type="text" id="taxId" name="taxId" value={formData.taxId} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                            <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                            <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="mpesaTillNumber" className="block text-sm font-medium text-gray-400 mb-1">M-Pesa Till Number</label>
                            <input type="text" id="mpesaTillNumber" name="mpesaTillNumber" value={formData.mpesaTillNumber} onChange={handleChange} required className={inputStyle} />
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end">
                    <button type="submit" className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsView;
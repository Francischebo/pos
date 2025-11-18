

import React, { useState } from 'react';
import { User } from '../types';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface ProfileModalProps {
    user: User;
    onClose: () => void;
    onUpdateProfile: (userId: string, currentPasswordForVerification: string, data: { name: string; email: string; newPassword?: string }) => Promise<void>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdateProfile }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordChangeRequested, setPasswordChangeRequested] = useState(false);

    const isCashier = user.role === 'Cashier';
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setPasswordChangeRequested(false);
        
        if (newPassword && newPassword !== confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword && newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }
        
        if (!currentPassword) {
            setError("Current password is required to save changes.");
            return;
        }

        if (newPassword) {
            setPasswordChangeRequested(true);
        }

        setIsLoading(true);
        try {
            await onUpdateProfile(user.id, currentPassword, {
                name,
                email,
                newPassword: newPassword || undefined,
            });
            setSuccess("Profile updated successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setPasswordChangeRequested(false);
        }
    };

    const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-600/50 disabled:cursor-not-allowed";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">My Profile</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isCashier && (
                        <div className="bg-blue-900/50 text-blue-300 text-sm p-3 rounded-md">
                            As a Cashier, you can only update your password. Please contact an administrator to change your name or email.
                        </div>
                    )}
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputStyle} disabled={isCashier} />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputStyle} disabled={isCashier} />
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="font-semibold text-gray-300 mb-2">Change Password</h3>
                         <div>
                            <label className="text-sm text-gray-400 mb-1 block">New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputStyle} />
                        </div>
                         <div>
                            <label className="text-sm text-gray-400 mb-1 block">Confirm New Password</label>
                            <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputStyle} />
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-700">
                         <label className="text-sm text-gray-400 mb-1 block">Current Password (to save changes)</label>
                         <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputStyle} />
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    {success && <p className="text-sm text-green-400 text-center">{success}</p>}

                    <div className="flex justify-end gap-4 mt-6">
                         <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                            Close
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:bg-gray-500"
                        >
                            {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
                            {isLoading ? (passwordChangeRequested ? 'Securing Password...' : 'Saving...') : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
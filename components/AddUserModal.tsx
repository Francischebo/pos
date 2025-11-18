
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AddUserModalProps {
    user: User | null;
    currentUserRole: UserRole;
    onClose: () => void;
    onSubmit: (data: (User & { password?: string }) | (Omit<User, 'id'> & { password: string })) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ user, currentUserRole, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('Cashier');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');

    const availableRoles = (currentUserRole === 'Admin' || currentUserRole === 'Manager')
        ? ['Admin', 'Manager', 'Cashier']
        : ['Manager', 'Cashier'];

    useEffect(() => {
        if (user) {
            setName(user.name);
            setRole(user.role);
            setEmail(user.email);
            setPassword(''); // Clear password field for editing for security.
        } else {
            // Reset form when opening for a new user.
            setName('');
            setRole('Cashier');
            setEmail('');
            setPassword('');
        }
        setFormError('');
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        
        if (name.trim()) {
            if (user) {
                // Editing existing user
                const userData: User & { password?: string } = { ...user, name, role, email };
                if (password) {
                    if (password.length < 6) {
                        setFormError("Password must be at least 6 characters long.");
                        return;
                    }
                    userData.password = password;
                }
                onSubmit(userData);
            } else {
                // Creating new user
                if (!password || password.length < 6) {
                    setFormError("A password of at least 6 characters is required.");
                    return; 
                }
                onSubmit({ name, role, email, password });
            }
        }
    };

    const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-400";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative">
                <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">{user ? 'Edit User' : 'Add New User'}</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!user} // Password is only required for new users
                            placeholder={user ? "Leave blank to keep current" : "Min. 6 characters"}
                            className={inputStyle}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputStyle}>
                            {availableRoles.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {formError && <p className="text-red-400 text-sm text-center mt-4">{formError}</p>}

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700">
                        {user ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddUserModal;

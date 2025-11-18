
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import AddUserModal from '../components/AddUserModal';
import { supabase } from '../services/supabaseClient';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

interface UsersViewProps {
    currentUserRole: UserRole;
}

const UsersView: React.FC<UsersViewProps> = ({ currentUserRole }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase!.from('profiles').select('*');
        if (error) {
            console.error("Error fetching users:", error);
            alert(`Error fetching users: ${error.message}`);
        } else if (data) {
            const formattedUsers: User[] = data.map(profile => ({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
            }));
            setUsers(formattedUsers);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        if (!userData.password) {
            alert("Password is required to create a new user.");
            return;
        }

        // Step 1: Create the user in auth.users
        const { data: authData, error: signUpError } = await supabase!.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    name: userData.name
                }
            }
        });

        if (signUpError) {
            alert(`Error creating user: ${signUpError.message}`);
            return;
        }

        if (!authData.user) {
            alert('User created, but no user data returned. Please check the Supabase dashboard. Email confirmation might be required.');
            fetchUsers();
            return;
        }

        // Step 2: The trigger has run and created a profile with a default role. Now, update the role.
        const { error: profileError } = await supabase!
            .from('profiles')
            .update({ role: userData.role })
            .eq('id', authData.user.id);
        
        if (profileError) {
            alert(`User authentication was created, but failed to set the role in their profile: ${profileError.message}. Please set it manually in the Supabase dashboard.`);
        } else {
            alert('User created successfully! Note: If email confirmation is enabled in your Supabase project, the user will need to confirm their email before they can log in.');
        }

        fetchUsers();
    };

    const handleUpdateUser = async (user: User & { password?: string }) => {
        const originalUser = users.find(u => u.id === user.id);
        if (!originalUser) return;

        if (user.password || user.email !== originalUser.email) {
            alert("For security reasons, updating a user's email or password must be done from the Supabase dashboard. Only name and role will be updated.");
        }

        const { error } = await supabase!
            .from('profiles')
            .update({ name: user.name, role: user.role })
            .eq('id', user.id);
        
        if (error) {
            alert(`Error updating user: ${error.message}`);
        } else {
            alert('User profile updated successfully.');
            fetchUsers();
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This action requires admin privileges and cannot be undone.")) {
             // Deleting a user requires elevated permissions, typically done via a server-side function.
             alert("For security, user deletion must be performed from the Supabase dashboard (Authentication -> Users).");
        }
    };

    const handleAddOrUpdateUser = (data: (User & { password?: string }) | (Omit<User, 'id'> & { password: string })) => {
        if ('id' in data) {
            handleUpdateUser(data);
        } else {
            handleAddUser(data);
        }
        setIsAddUserModalOpen(false);
        setEditingUser(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinnerIcon className="w-8 h-8 text-emerald-400" />
                <span className="ml-2 text-gray-400">Loading users...</span>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-emerald-400">User Management</h1>
                <button 
                    onClick={() => { setEditingUser(null); setIsAddUserModalOpen(true); }} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add User
                </button>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg shadow-xl p-4 border border-gray-700/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                         <thead className="text-xs text-emerald-300 uppercase bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                    <td className="px-6 py-4 font-mono text-xs">{user.id}</td>
                                    <td className="px-6 py-4 font-medium">{user.name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">{user.role}</td>
                                    <td className="px-6 py-4 space-x-4">
                                        <button 
                                            onClick={() => { setEditingUser(user); setIsAddUserModalOpen(true); }}
                                            className="font-medium text-emerald-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="font-medium text-red-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isAddUserModalOpen && (
                <AddUserModal
                    user={editingUser}
                    currentUserRole={currentUserRole}
                    onClose={() => { setIsAddUserModalOpen(false); setEditingUser(null); }}
                    onSubmit={handleAddOrUpdateUser}
                />
            )}
        </div>
    );
};

export default UsersView;

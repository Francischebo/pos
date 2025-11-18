import React, { useState } from 'react';
import { User, Notification, CompanySettings } from '../types';
import { BellIcon } from './icons/BellIcon';
import { SyncIcon } from './icons/SyncIcon';

interface HeaderProps {
    currentUser: User;
    allUsers: User[];
    onSwitchUser: (user: User) => void;
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    isRefreshing: boolean;
    companySettings?: CompanySettings | null;
}

const Header: React.FC<HeaderProps> = ({ currentUser, allUsers, onSwitchUser, notifications, setNotifications, isRefreshing, companySettings }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleBellClick = () => {
        setShowNotifications(!showNotifications);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleUserSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // FIX: The user ID is a string (UUID from Supabase), so we should not parse it to an integer.
        const selectedUserId = e.target.value;
        const userToSwitchTo = allUsers.find(u => u.id === selectedUserId);
        if (userToSwitchTo) {
            onSwitchUser(userToSwitchTo);
        }
    };

    return (
        <header className="bg-gray-800/50 border-b border-gray-700/50 p-4 flex justify-between items-center">
            <div>
                <div className="flex items-center gap-3">
                    <img src={companySettings?.logoUrl || '/mobet-logo.png'} alt="Mobet POS Kenya" className="w-10 h-10 rounded-md object-contain" />
                    <div>
                        <h1 className="text-lg font-bold text-white">{companySettings?.name || 'Mobet POS KENYA'}</h1>
                        {companySettings?.address && <span className="text-sm text-gray-400">{companySettings.address}</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    {isRefreshing && (
                        <div title="Syncing data...">
                            <SyncIcon className="w-5 h-5 text-emerald-400 animate-spin" />
                        </div>
                    )}
                    <label htmlFor="user-switcher" className="text-sm font-medium text-gray-400">Login As:</label>
                    <select
                        id="user-switcher"
                        value={currentUser.id}
                        onChange={handleUserSwitch}
                        className="bg-gray-700 border border-gray-600 rounded-md text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {allUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name} ({user.role})
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="relative">
                    <button onClick={handleBellClick} className="relative text-gray-400 hover:text-white">
                        <BellIcon className="w-6 h-6" />
                        {unreadCount > 0 && (
                             <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                            <div className="p-3 font-semibold border-b border-gray-700">Notifications</div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.slice().reverse().map(n => (
                                        <div key={n.id} className="p-3 border-b border-gray-700/50 text-sm">
                                           {n.type === 'warning' && <span className="font-bold text-yellow-400">Low Stock: </span>}
                                           {n.message}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-500">No notifications.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
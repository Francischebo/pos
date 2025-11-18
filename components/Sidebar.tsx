
import React from 'react';
import { AppView, User, Notification, UserRole } from '../types';
import { PosIcon } from './icons/PosIcon';
import { InventoryIcon } from './icons/InventoryIcon';
import { CustomersIcon } from './icons/CustomersIcon';
import { TransactionsIcon } from './icons/TransactionsIcon';
import { ReportsIcon } from './icons/ReportsIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { PurchasingIcon } from './icons/PurchasingIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { UsersIcon } from './icons/UsersIcon';

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  currentUser: User;
  notifications: Notification[];
  onLogout: () => void;
  onProfileClick: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-emerald-500/20 text-emerald-300'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, currentUser, notifications, onLogout, onProfileClick }) => {
  const navItems: { view: AppView; label: string; icon: React.ReactNode; roles: UserRole[] }[] = [
    { view: 'pos', label: 'POS Terminal', icon: <PosIcon className="w-6 h-6" />, roles: ['Admin', 'Manager', 'Cashier'] },
    { view: 'inventory', label: 'Inventory', icon: <InventoryIcon className="w-6 h-6" />, roles: ['Admin', 'Manager', 'Cashier'] },
    { view: 'purchasing', label: 'Purchasing', icon: <PurchasingIcon className="w-6 h-6" />, roles: ['Admin', 'Manager'] },
    { view: 'customers', label: 'Customers', icon: <CustomersIcon className="w-6 h-6" />, roles: ['Admin', 'Manager', 'Cashier'] },
    { view: 'users', label: 'Users', icon: <UsersIcon className="w-6 h-6" />, roles: ['Admin', 'Manager'] },
    { view: 'transactions', label: 'Transactions', icon: <TransactionsIcon className="w-6 h-6" />, roles: ['Admin', 'Manager', 'Cashier'] },
    { view: 'reports', label: 'Reports', icon: <ReportsIcon className="w-6 h-6" />, roles: ['Admin', 'Manager'] },
    { view: 'admin', label: 'Admin', icon: <ShieldIcon className="w-6 h-6" />, roles: ['Admin', 'Manager'] },
  ];

  const bottomNavItems: { view: AppView; label: string; icon: React.ReactNode; roles: UserRole[] }[] = [
      { view: 'settings', label: 'Settings', icon: <SettingsIcon className="w-6 h-6" />, roles: ['Admin', 'Manager'] },
  ];

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700/50 flex flex-col p-4">
        <div className="flex items-center mb-8 relative">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 text-transparent bg-clip-text">
          Mobet POS KENYA
        </h1>
        {notifications.length > 0 && (
            <span className="absolute left-24 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {notifications.length}
            </span>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {navItems
          .filter(item => item.roles.includes(currentUser.role))
          .map(item => (
          <NavItem
            key={item.view}
            label={item.label}
            icon={item.icon}
            isActive={activeView === item.view}
            onClick={() => setActiveView(item.view)}
          />
        ))}
      </nav>

      <div className="mt-auto">
        <button 
          onClick={onProfileClick}
          className="w-full p-3 rounded-lg bg-gray-900/50 mb-2 text-left hover:bg-gray-700/50 transition-colors"
        >
            <div className="flex items-center">
                <img src={`https://i.pravatar.cc/40?u=${currentUser.id}`} alt="User" className="w-10 h-10 rounded-full" />
                <div className="ml-3">
                    <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                    <p className="text-xs text-gray-400">{currentUser.role}</p>
                </div>
            </div>
        </button>
        {bottomNavItems
            .filter(item => item.roles.includes(currentUser.role))
            .map(item => (
            <NavItem
                key={item.view}
                label={item.label}
                icon={item.icon}
                isActive={activeView === item.view}
                onClick={() => setActiveView(item.view)}
            />
        ))}
        <NavItem
            label="Logout"
            icon={<LogoutIcon className="w-6 h-6" />}
            isActive={false}
            onClick={onLogout}
        />
      </div>
    </aside>
  );
};

export default Sidebar;

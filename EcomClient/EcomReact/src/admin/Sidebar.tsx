import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Plus,
  Store
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { to: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { to: 'admin/orders', icon: ShoppingCart, label: 'Đơn hàng' },
    { to: 'admin/products', icon: Package, label: 'Sản phẩm' },
    { to: 'admin/products/add', icon: Plus, label: 'Thêm sản phẩm' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Store className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Quản trị</h1>
        </div>
      </div>
      <nav className="mt-8">
        <ul className="space-y-2 px-4">
          {navItems.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.to}
                end
                className={({ isActive }) => {
                  return `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`;
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
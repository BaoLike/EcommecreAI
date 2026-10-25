import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { apiService, type DashboardStats, type Order } from '../services/apiService';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([apiService.getDashboardStats(), apiService.getOrders()])
      .then(([dashboard, recentOrders]) => {
        setStats(dashboard);
        setOrders(recentOrders.slice(0, 5));
      })
      .catch((error) => {
        console.error('Error fetching admin dashboard:', error);
        setLoadError('Không thể tải dữ liệu quản trị. Hãy đăng nhập bằng tài khoản admin.');
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { title: 'Đơn hàng', value: stats.totalOrders, icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Sản phẩm', value: stats.totalProducts, icon: Package, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Doanh thu đã thanh toán', value: money.format(stats.totalRevenue), icon: DollarSign, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { title: 'Khách hàng', value: stats.totalCustomers, icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  if (loading) {
    return <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white p-6 rounded-lg shadow-sm h-32" />)}
    </div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tổng quan cửa hàng</h1>
        <p className="text-gray-600">Số liệu lấy từ backend của cửa hàng hiện tại.</p>
      </div>
      {loadError && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">{loadError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng gần đây</h2>
        {orders.length === 0 ? <p className="text-gray-500">Chưa có đơn hàng.</p> : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Đơn #{order.id}</p>
                  <p className="text-xs text-gray-500">{order.customerName} · {new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{money.format(order.total)}</p>
                  <span className="text-xs text-gray-600">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;

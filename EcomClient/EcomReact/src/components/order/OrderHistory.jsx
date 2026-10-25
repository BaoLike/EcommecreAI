import React, { useEffect, useState } from 'react';
import { Search, Filter, Eye, Calendar, Package, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../api/api';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Lấy đơn hàng của người dùng hiện tại
        const data = await api.get('/order-history/my-orders');
        setOrders(data.data);
      } catch (error) {
        console.error('Error fetching user orders:', error);
        setLoadError('Không thể tải đơn hàng. Vui lòng đăng nhập lại hoặc thử sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  console.log('order user data', orders)
  const filteredOrders = orders.filter(order => {
    const orderId = String(order.orderId ?? '');
    const matchesSearch = orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const statusByOrder = {
      PENDING: 'pending', SUCCESS: 'processing', PROCESSING: 'processing',
      SHIPPING: 'shipped', DELIVERED: 'delivered', CANCELLED: 'cancelled',
      FAILED: 'cancelled', EXPIRED: 'cancelled', REVIEW_REQUIRED: 'pending',
    };
    const matchesStatus = statusFilter === 'all' || statusByOrder[order.orderStatus] === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.orderDate);
      const now = new Date();
      const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
        case 'year':
          matchesDate = daysDiff <= 365;
          break;
        default:
          matchesDate = true;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SUCCESS: 'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
      SHIPPING: 'bg-purple-100 text-purple-800 border-purple-200',
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
      REVIEW_REQUIRED: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      PENDING: 'Chờ xử lý',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đã gửi hàng',
      DELIVERED: 'Đã giao hàng',
      CANCELED: 'Đã hủy',
      CANCELLED: 'Đã hủy',
      FAILED: 'Thanh toán thất bại',
      EXPIRED: 'Đã hết hạn',
      REVIEW_REQUIRED: 'Cần kiểm tra thanh toán'
    };
    return statusTexts[status] || status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return dateString;
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await api.put(`/order-history/${orderId}/cancel`);
      setOrders((current) => current.map((order) =>
        order.orderId === orderId ? { ...order, orderStatus: 'CANCELLED' } : order
      ));
    } catch (error) {
      console.error('Could not cancel order:', error);
      window.alert(error?.response?.data?.message || 'Không thể hủy đơn hàng này.');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử mua hàng</h1>
        <p className="text-gray-600">Xem lại các đơn hàng bạn đã đặt</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="shipped">Đã gửi hàng</option>
              <option value="delivered">Đã giao hàng</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
            </select>
          </div>

          {/* Results count */}
          <div className="flex items-center text-sm text-gray-600">
            <Package className="h-4 w-4 mr-2" />
            {filteredOrders.length} đơn hàng
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
              {loadError ? (
                <div className="bg-white rounded-lg border p-6 text-center text-red-700">{loadError}</div>
              ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có đơn hàng nào</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                ? 'Không tìm thấy đơn hàng phù hợp với bộ lọc của bạn.'
                : 'Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm!'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.orderId} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Đơn hàng #{order.orderId}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.orderStatus)}`}>
                        {getStatusText(order.orderStatus)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(order.orderDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{order.totalProducts || 0} sản phẩm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                      <Eye className="h-4 w-4" />
                      <span>Xem chi tiết</span>
                    </button>
                    {['SUCCESS', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(order.orderStatus) && (
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Đánh giá
                      </button>
                    )}
                    {order.orderStatus === 'PENDING' && (
                      <button onClick={() => cancelOrder(order.orderId)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Hủy đơn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistory;

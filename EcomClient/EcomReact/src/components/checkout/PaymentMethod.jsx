import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../api/api';

export default function PaymentMethodComponent() {
  const [selectedMethod, setSelectedMethod] = useState('vnpay');
  const addressSelectedId = useSelector((state) => state.location.selectedAddressId);
  const listAddress = useSelector((state) => state.location.list);
  const listAddressData = Array.isArray(listAddress) ? listAddress : [];
  const addressSelected = listAddressData.find(addr => addr.addressId === addressSelectedId);
  const [error, setError] = useState('');
  const paymentMethods = [
    {
      id: 'vnpay',
      name: 'Thanh toán qua VNPay',
      description: 'Thanh toán trực tuyến qua cổng VNPay',
      icon: CreditCard
    }
  ];


  const handlePatmentWithVNPay = async () =>{
    let listProductItems;
    try { listProductItems = JSON.parse(localStorage.getItem("cartItemList") || "[]"); } catch { listProductItems = []; }
    if (!addressSelected || !Array.isArray(listProductItems) || listProductItems.length === 0) {
      throw new Error('Chọn địa chỉ giao hàng và thêm sản phẩm trước khi thanh toán.');
    }
    const dataPayment = {
      addressId: addressSelected.addressId,
      items: listProductItems.map(({ productId, quantity }) => ({ productId, quantity })),
      bankCode: 'NCB',
      language: 'vn',
    };
    const responseVNPay = await api.post('/payment/create-payment', dataPayment);
    if (responseVNPay.data.paymentUrl) {
      window.location.assign(responseVNPay.data.paymentUrl);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Chọn phương thức thanh toán</h2>
      
      <div className="space-y-4">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <div
              key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
              className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center h-5 mt-1">
                <input
                  type="radio"
                  name="payment-method"
                  checked={isSelected}
                  onChange={() => setSelectedMethod(method.id)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
              </div>
              
              <div className="ml-4 flex-1 flex items-start">
                <div className={`p-3 rounded-lg mr-4 ${
                  isSelected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${
                    isSelected ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {method.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {method.description}
                  </p>
                  
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      
      <div className="mt-6 flex justify-end">
        <button
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
          onClick={() => {
            setError('');
            handlePatmentWithVNPay().catch((error) => {
              setError(error?.response?.data?.message || error.message || 'Không thể bắt đầu thanh toán.');
            });
          }}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

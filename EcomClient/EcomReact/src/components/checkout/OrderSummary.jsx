export default function OrderSummary({onNext, onBack}) {
  let orderItems = [];
  try { orderItems = JSON.parse(localStorage.getItem("cartItemList") || "[]"); } catch {}
  const unitPrice = (item) => Number(item.specialPrice) > 0 ? Number(item.specialPrice) : Number(item.price) || 0;
  const subtotal = orderItems.reduce((sum, item) => sum + (unitPrice(item) * Number(item.quantity || 0)), 0);
  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tóm tắt đơn hàng</h2>
      
      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-4 px-2 font-semibold text-gray-700">Sản phẩm</th>
              <th className="text-center py-4 px-2 font-semibold text-gray-700">Số lượng</th>
              <th className="text-right py-4 px-2 font-semibold text-gray-700">Đơn giá</th>
              <th className="text-right py-4 px-2 font-semibold text-gray-700">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.productId} className="border-b border-gray-200">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.image} 
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <span className="text-gray-800 font-medium">{item.productName}</span>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex justify-center">
                    <span className="text-gray-700 font-medium">{item.quantity}</span>
                  </div>
                </td>
                <td className="py-4 px-2 text-right text-gray-700">
                  {money.format(unitPrice(item))}
                </td>
                <td className="py-4 px-2 text-right font-semibold text-gray-800">
                  {money.format(unitPrice(item) * Number(item.quantity || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Summary */}
      <div className="mt-8 border-t-2 border-gray-200 pt-6">
        <div className="max-w-md ml-auto space-y-3">
          <div className="flex justify-between text-gray-700">
            <span>Tạm tính:</span>
            <span className="font-medium">{money.format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t border-gray-300">
            <span>Tổng cộng:</span>
            <span className="text-blue-600">{money.format(subtotal)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-4">
        <button onClick={onBack} className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200">
          Quay lại
        </button>
        <button onClick={onNext} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200">
          Xác nhận đặt hàng
        </button>
      </div>
    </div>
  );
}

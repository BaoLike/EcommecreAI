import React, { useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';

const UpdateProductForm = ({ product, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: product?.productName || '',
    sku: product?.sku || '',
    brand: product?.brand || '',
    model: product?.model || '',
    description: product?.description || '',
    price: product?.price ?? 0,
    discount: product?.discount ?? 0,
    stock: product?.quantity ?? 0,
    warrantyMonths: product?.warrantyMonths ?? 0,
    specificationsText: JSON.stringify(product?.specifications || {}, null, 2),
    image: undefined,
  });
  const [imagePreview, setImagePreview] = useState(product?.image || '');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(current => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormData(current => ({ ...current, image: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    try {
      const specifications = JSON.parse(formData.specificationsText || '{}');
      if (!specifications || Array.isArray(specifications) || typeof specifications !== 'object') {
        throw new Error();
      }
      onSubmit({
        ...formData,
        price: Number(formData.price),
        discount: Number(formData.discount),
        stock: Number(formData.stock),
        warrantyMonths: Number(formData.warrantyMonths),
        specifications,
      });
    } catch {
      setError('Thông số kỹ thuật cần là JSON object hợp lệ.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">Cập nhật sản phẩm</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Đóng">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Tên sản phẩm *
              <input required maxLength="200" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">SKU
              <input maxLength="64" name="sku" value={formData.sku} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Thương hiệu
              <input maxLength="100" name="brand" value={formData.brand} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Model
              <input maxLength="150" name="model" value={formData.model} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Giá (VND) *
              <input required type="number" min="0" step="1" name="price" value={formData.price} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Giảm giá (%)
              <input type="number" min="0" max="100" step="0.1" name="discount" value={formData.discount} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Tồn kho *
              <input required type="number" min="0" step="1" name="stock" value={formData.stock} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium">Bảo hành (tháng)
              <input type="number" min="0" step="1" name="warrantyMonths" value={formData.warrantyMonths} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium md:col-span-2">Mô tả *
              <textarea required maxLength="10000" rows="4" name="description" value={formData.description} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm font-medium md:col-span-2">Thông số kỹ thuật (JSON)
              <textarea rows="6" name="specificationsText" value={formData.specificationsText} onChange={handleChange} className="mt-1 w-full rounded border p-2 font-mono text-sm" />
            </label>
          </div>

          <div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white">
              <Upload className="mr-2 h-4 w-4" /> Đổi ảnh
            </button>
            {imagePreview && <img src={imagePreview} alt="Ảnh sản phẩm" className="mt-3 h-32 rounded object-cover" />}
          </div>

          <div className="flex justify-end gap-3 border-t pt-5">
            <button type="button" onClick={onClose} className="rounded border px-5 py-2">Hủy</button>
            <button type="submit" className="rounded bg-blue-600 px-5 py-2 font-semibold text-white">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProductForm;

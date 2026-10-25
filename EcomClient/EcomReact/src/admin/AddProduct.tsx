import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { apiService } from '../services/apiService';

interface Category {
  categoryId: number;
  categoryName: string;
}

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({
    productName: '', sku: '', brand: '', model: '', description: '',
    price: '', discount: '0', quantity: '0', warrantyMonths: '0',
    specificationsText: '{\n  \n}',
  });

  useEffect(() => {
    apiService.getCategory().then(setCategories).catch(() => setError('Không tải được danh mục sản phẩm.'));
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      let specifications: Record<string, unknown>;
      try {
        specifications = JSON.parse(form.specificationsText || '{}');
        if (!specifications || Array.isArray(specifications) || typeof specifications !== 'object') {
          throw new Error('Thông số phải là một JSON object.');
        }
      } catch {
        throw new Error('Thông số kỹ thuật cần là JSON hợp lệ, ví dụ {"ram":"8 GB"}.');
      }
      if (!categoryId) throw new Error('Vui lòng chọn danh mục.');

      await apiService.addProduct({
        productName: form.productName.trim(),
        sku: form.sku.trim() || undefined,
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        description: form.description.trim(),
        price: Number(form.price),
        discount: Number(form.discount),
        quantity: Number(form.quantity),
        warrantyMonths: Number(form.warrantyMonths),
        specifications,
      }, Number(categoryId), image);
      navigate('/profile/admin/products');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể tạo sản phẩm.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <button onClick={() => navigate('/profile/admin/products')} className="mb-5 inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
      </button>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Thêm sản phẩm</h1>
      <p className="mb-6 text-gray-600">SKU, giá, tồn kho và thông số được lưu trong catalog của cửa hàng.</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">Tên sản phẩm *
            <input required maxLength={200} name="productName" value={form.productName} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">SKU
            <input maxLength={64} name="sku" value={form.sku} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Thương hiệu
            <input maxLength={100} name="brand" value={form.brand} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Model
            <input maxLength={150} name="model" value={form.model} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Giá (VND) *
            <input required type="number" min="1" step="1" name="price" value={form.price} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Giảm giá (%)
            <input type="number" min="0" max="100" step="0.1" name="discount" value={form.discount} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Tồn kho *
            <input required type="number" min="0" step="1" name="quantity" value={form.quantity} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Bảo hành (tháng)
            <input type="number" min="0" step="1" name="warrantyMonths" value={form.warrantyMonths} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium">Danh mục *
            <select required value={categoryId} onChange={event => setCategoryId(event.target.value)} className="mt-1 w-full rounded border p-2">
              <option value="">Chọn danh mục</option>
              {categories.map(category => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium md:col-span-2">Mô tả *
            <textarea required maxLength={10000} rows={4} name="description" value={form.description} onChange={handleChange} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">Thông số kỹ thuật (JSON)
            <textarea rows={6} name="specificationsText" value={form.specificationsText} onChange={handleChange} className="mt-1 w-full rounded border p-2 font-mono text-sm" />
          </label>
        </div>

        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white">
            <Upload className="mr-2 h-4 w-4" /> Chọn ảnh
          </button>
          {imagePreview && <img src={imagePreview} alt="Xem trước ảnh sản phẩm" className="mt-3 h-32 rounded object-cover" />}
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <button type="button" onClick={() => navigate('/profile/admin/products')} className="rounded bg-gray-100 px-4 py-2">Hủy</button>
          <button disabled={loading} type="submit" className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50">
            {loading ? 'Đang lưu…' : 'Lưu sản phẩm'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default AddProduct;

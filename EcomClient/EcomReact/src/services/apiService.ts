import api from '../api/api';

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  totalCustomers: number;
}

export interface Order {
  id: number;
  customerName: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'review_required';
  orderDate: string;
  items: number;
  demoData: boolean;
}

export interface Product {
  productId: number;
  productName: string;
  sku?: string;
  brand?: string;
  model?: string;
  warrantyMonths?: number;
  specifications?: Record<string, unknown>;
  demoData?: boolean;
  description: string;
  price: number;
  discount: number;
  quantity: number;
  specialPrice: number;
  image: string;
}

interface ProductPage {
  content: Product[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

interface Category {
  categoryId: number;
  categoryName: string;
}

class ApiService {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get('/admin/dashboard');
    return data;
  }

  async getOrders(): Promise<Order[]> {
    const { data } = await api.get('/admin/orders');
    return data;
  }

  async updateOrderStatus(orderId: string | number, status: string): Promise<void> {
    const backendStatus: Record<string, string> = {
      pending: 'PENDING',
      processing: 'PROCESSING',
      shipped: 'SHIPPING',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
      review_required: 'REVIEW_REQUIRED',
    };
    await api.patch(`/admin/orders/${orderId}/status`, {
      status: backendStatus[status] || status,
    });
  }

  async getUserOrders() {
    const { data } = await api.get('/order-history/my-orders');
    return data;
  }

  async getProducts(params = 'pageNumber=0&pageSize=50'): Promise<ProductPage> {
    const { data } = await api.get(`/public/products?${params}`);
    return data;
  }

  async addProduct(productData: Partial<Product>, categoryId: number, imageFile?: File): Promise<Product> {
    const formData = new FormData();
    formData.append('productDTO', new Blob([JSON.stringify(productData)], {
      type: 'application/json',
    }));
    if (imageFile) formData.append('image', imageFile);

    const { data } = await api.post(`/admin/categories/${categoryId}/product`, formData);
    return data;
  }

  async deleteProduct(productId: number): Promise<void> {
    await api.delete(`/admin/products/${productId}`);
  }

  async updateProduct(productId: string | number, productData: Record<string, unknown>): Promise<Product> {
    const formData = new FormData();
    const productDTO = {
      productName: productData.name ?? productData.productName,
      description: productData.description,
      price: Number(productData.price),
      discount: Number(productData.discount ?? 0),
      quantity: Number(productData.stock ?? productData.quantity),
      sku: productData.sku,
      brand: productData.brand,
      model: productData.model,
      warrantyMonths: productData.warrantyMonths,
      specifications: productData.specifications,
    };
    formData.append('productDTO', new Blob([JSON.stringify(productDTO)], {
      type: 'application/json',
    }));
    if (productData.image instanceof File) formData.append('image', productData.image);

    const { data } = await api.put(`/admin/products/${productId}`, formData);
    return data;
  }

  async getCategory(): Promise<Category[]> {
    const { data } = await api.get('/public/categories');
    return data.content;
  }
}

export const apiService = new ApiService();

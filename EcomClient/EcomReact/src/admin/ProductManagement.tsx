import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Package } from 'lucide-react';
import { apiService } from '../services/apiService';
import Paginations from '../components/shared/Paginations';
import UpdateProductForm from './UpdateProductForm';
import toast from 'react-hot-toast';

interface Product {
  productId: number;
  productName: string;
  description: string;
  price: number;
  discount: number;
  quantity: number;
  specialPrice: number,
  image: string,
  sku?: string;
  brand?: string;
  model?: string;
  warrantyMonths?: number;
  specifications?: Record<string, unknown>;
  demoData?: boolean;
}

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<{ totalPages: number; totalElements: number }>({ totalPages: 0, totalElements: 0 });
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleChangePage = async (queryParam: string) => {
    const productPage = await apiService.getProducts(queryParam);
    setProducts(productPage.content);
  }

  const handleOnclicEditProduct = (product: Product) => {
  setSelectedProduct(product);
  setShowUpdateForm(true);
};


  const handleUpdateProduct = async (formData: any) => {
    if (!selectedProduct) return;
    try {
      const updated = await apiService.updateProduct(selectedProduct.productId, formData);
      setProducts(current => current.map(p =>
        p.productId === selectedProduct.productId 
          ? updated
          : p
      ));

      setShowUpdateForm(false);
      setSelectedProduct(null);

      toast.success('Cập nhật sản phẩm thành công!');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Có lỗi xảy ra khi cập nhật sản phẩm');
    }
  };

  const handleCloseForm = () => {
    setShowUpdateForm(false);
    setSelectedProduct(null);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await apiService.getProducts();
        setProducts(data.content);
        const paginationData = {
          pageNumber: data.pageNumber,
          pageSize: data.pageSize,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
          lastPage: data.lastPage
        }
        setPagination(paginationData)
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Không tải được danh sách sản phẩm.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.deleteProduct(productId);
      setProducts(current => current.filter(product => product.productId !== productId));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const filteredProducts = products.filter(product =>
    `${product.productName} ${product.sku || ''} ${product.brand || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
            <p className="text-gray-600">Manage your product inventory and catalog</p>
          </div>
          <Link
            to="add"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.productName}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{product.productName}</h3>
                  </div>
                  <p className="text-xs text-gray-500">{[product.brand, product.model, product.sku].filter(Boolean).join(' · ') || 'Chưa có SKU/thương hiệu'}</p>
                  <p className="text-sm text-gray-600 mb-3 mt-2 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{money.format(product.specialPrice || product.price)}</p>
                      <p className="text-xs text-gray-500">{product.warrantyMonths || 0} tháng bảo hành</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Stock: {product.quantity}</p>
                      <p className={`text-xs ${product.quantity > 10 ? 'text-green-600' : product.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {product.quantity > 10 ? 'In Stock' : product.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {handleOnclicEditProduct(product)}}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.productId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first product'}
              </p>
              {!searchTerm && (
                <Link
                  to="/products/add"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center pt-10">
        <Paginations
        handleChange={handleChangePage}
        numberOfPage={pagination.totalPages}
        totalProducts={pagination.totalElements}/>
      </div>
        {showUpdateForm && selectedProduct && (
          <UpdateProductForm
            product={selectedProduct}
            onClose={handleCloseForm}
            onSubmit={handleUpdateProduct}
          />
        )}
    </div>
  );
};

export default ProductManagement;

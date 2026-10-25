import Banner from "./Banner";
import { useEffect, useState } from "react";
import ProductCart from '../shared/ProductCart';
import api from "../../api/api";


const Home = () => {
    const [products, setProducts] = useState([]);
    const [computerProducts, setComputerProducts] = useState([]);
    const [isComputerLoading, setIsComputerLoading] = useState(true);
    const [computerLoadError, setComputerLoadError] = useState('');

    useEffect(() => {
        let active = true;
        api.get('/public/recommendations')
            .then(({ data }) => {
                if (active) setProducts(Array.isArray(data) ? data : []);
            })
            .catch((error) => {
                console.error('Could not load featured products:', error);
            });

        api.get('/public/products?category=Laptop&pageNumber=0&pageSize=3&sortBy=discount&sortOrder=desc&inStock=true')
            .then(({ data }) => {
                if (active) setComputerProducts(Array.isArray(data?.content) ? data.content : []);
            })
            .catch((error) => {
                console.error('Could not load computer products for the home slider:', error);
                if (active) setComputerLoadError('Không thể tải sản phẩm máy tính. Vui lòng thử lại sau.');
            })
            .finally(() => {
                if (active) setIsComputerLoading(false);
            });

        return () => { active = false; };
    }, []);

    return (
        <div className="lg:px-14 sm:px-8 px-4">
            <div className="py-6">
                <Banner products={computerProducts} loading={isComputerLoading} error={computerLoadError}/>
            </div>

            <div className="py-5 ">
                <div className="flex flex-col justify-center items-center space-y-2">
                    <h1 className="text-slate-800 text-4xl font-bold">Sản phẩm nổi bật</h1>
                        <span className="text-slate-700">
                            Gợi ý những mặt hàng được chọn lọc dành riêng cho bạn!
                        </span>
                </div>
            </div>

            <div className="pb-6 pt-14  grid  2xl:grids-cols-4 lg:grid-cols-4 sm:grid-cols-2 gap-x-6 gap-y-6">
                    {products.map((item) => {
                        return <ProductCart key={item.productId}
                        image={item.image} productName={item.productName}
                        productId={item.productId} description={item.description}
                        quantity={item.quantity} price={item.price}
                        discount={item.discount} specialPrice={item.specialPrice}
                        demoData={item.demoData}/>
                    })}
            </div>
        </div>
    )
};

export default Home;

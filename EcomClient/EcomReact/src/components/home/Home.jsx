import Banner from "./Banner";
import { useEffect, useState } from "react";
import ProductCart from '../shared/ProductCart';
import Loader from "../shared/Loader";
import api from "../../api/api";


const Home = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        let active = true;
        api.get('/public/recommendations')
            .then(({ data }) => {
                if (active) setProducts(data);
            })
            .catch((error) => console.error('Could not load featured products:', error));
        return () => { active = false; };
    }, []);

    console.log('products', products)
    return (
        <div className="lg:px-14 sm:px-8 px-4">
            <div className="py-6">
                <Banner/>
            </div>

            <div className="py-5 ">
                <div className="flex flex-col justify-center items-center space-y-2">
                    <h1 className="text-slate-800 text-4xl font-bold">Products</h1>
                        <span className="text-slate-700">
                            Discover our handpicked selection  of top-rated items just for you!
                        </span>
                </div>
            </div>

            <div className="pb-6 pt-14  grid  2xl:grids-cols-4 lg:grid-cols-4 sm:grid-cols-2 gap-x-6 gap-y-6">
                    {products && products.slice(0,10).map((item, index) => {
                        return <ProductCart key={index} 
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

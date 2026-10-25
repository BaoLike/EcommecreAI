import { useState } from "react";
import { FaShoppingBag, FaShoppingCart } from "react-icons/fa";
import ProductViewModal from "./ProductViewModal";
import { truncateText } from "../utils/truncateText";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/action";
import toast from "react-hot-toast"

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const ProductCart = ({
      productId,
      productName,
      image,
      description,
      quantity,
      price,
      discount,
      specialPrice,
}) => {
    const [openProductModalView, setOpenProductViewModal] = useState(false);
    const btnLoader = false;
    const [selectedViewProduct, setSelectedViewProduct] = useState("");
    const isAvailable = quantity && Number(quantity) > 0;
    const dispatch = useDispatch();

    const handleProductView = (product) => {
        setSelectedViewProduct(product);
        setOpenProductViewModal(true);
    };

    const addToCartHandle = (cartItems) => {
        dispatch(addToCart(cartItems, 1, toast));
    }

    return (
        <div className="border rounded-lg shadow-xl overflow-hidden transition-shadow duration-300">
            <div onClick={() => {
                handleProductView({
                    id: productId,
                    productName,
                    image,
                    description,
                    quantity,
                    price,
                    discount,
                    specialPrice,
                });
            }} 
            className="relative w-full overflow-hidden aspect-[3/2]">
                <img 
                className="w-full h-full cursor-pointer transition-transform duration-300 transform hover:scale-105"
                crossOrigin="anonymous"
                src = {image}
                alt = {productName}>
                </img>
            </div>
            <div className="p-4">
                <h2 onClick={() => {
                handleProductView({
                    id: productId,
                    productName,
                    image,
                    description,
                    quantity,
                    price,
                    discount,
                    specialPrice,
                });
            }}
                    className="text-lg font-semibold mb-2 cursor-pointer">
                    {truncateText(productName, 50)}
                </h2>
                <div className="min-h-20 max-h-20">
                    <p className="text-gray-600 text-sm">{truncateText(description)}</p>
                </div>

                <div className="flex  items-center justify-between">
                    {specialPrice ? (
                        <div className="flex flex-col">
                            <span className="text-gray-400 line-through">
                                {money.format(Number(price) || 0)}
                            </span>
                            <span className="text-xl font-bold text-slate-700">
                                {money.format(Number(specialPrice) || 0)}
                            </span>
                        </div>
                    ) : (
                        <div>
                            {"   "}
                            <span className="text-xl font-bold text-slate-700">
                                {money.format(Number(price) || 0)}
                            </span>
                        </div>
                    )}
                    <button className={`bg-blue-500 ${isAvailable ? "opacity-100 hover:bg-600" : "opacity-70"} 
                    text-white py-2 px-3 rounded-lg items-center transition-colors duration-300 w-36 flex  justify-center`}
                    onClick={() => addToCartHandle({
                        image,
                        productName,
                        description,
                        specialPrice,
                        price,
                        productId,
                        quantity,
                    })}
                    disabled={!isAvailable || btnLoader}>
                        <FaShoppingCart className="mr-2"/>
                        {isAvailable ? "Add to cart" : "Stock out"}
                    </button>
                </div>
                
            </div>
            <ProductViewModal
                open={openProductModalView}
                setOpen={setOpenProductViewModal}
                product={selectedViewProduct}
                isAvailable={isAvailable} 
            />
        </div>
    )
}

export default ProductCart;

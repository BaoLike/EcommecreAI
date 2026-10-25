import { MdArrowBack, MdShoppingCart } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ItemContent from "./ItemContent";
import { useEffect, useState } from "react";
import { fetchCart } from "../../store/action";
import { FaShoppingBag, FaShoppingCart } from "react-icons/fa";
const Cart = () => {
    const getTotalPrice = () => {
        const data = localStorage.getItem('cartItemList') ? JSON.parse(localStorage.getItem('cartItemList')) : []
        let totalPrice = 0;
        data.forEach((item) => totalPrice += item.specialPrice*item.quantity);
        return totalPrice;
    }
    const dataFromLocalStorage = JSON.parse(localStorage.getItem('cartItemList'));

    const [totalPrice, updateTotalPrice] =useState(getTotalPrice());
    const [cart, updateCart] = useState(dataFromLocalStorage);
    const dispatch = useDispatch();
    


    


    const handleStatusCart = () => {
        const newListCart =  JSON.parse(localStorage.getItem('cartItemList'));
        const newTotalPrice = getTotalPrice();

        updateCart(newListCart);
        updateTotalPrice(newTotalPrice);
        return newListCart;
    }

    if(!cart || cart.length === 0 ){
        return (
            <div className="lg:px-14 sm:px-8 px-4 py-10">
                <div className="flex flex-col items-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                        <MdShoppingCart size={36} className="text-gray-700"/>
                        Your cart
                    </h1>

                    <p className="text-lg text-gray-600 mt-2">Your cart is empty! Go shoping now</p>
                    <Link to="/products"><button className={`bg-blue-500 opacity-100 hover:bg-600
                                        text-white py-2 px-3 rounded-lg items-center transition-colors duration-300 w-50 mt-10 flex  justify-center`}>
                                            <FaShoppingCart className="mr-2"/>
                                            Go To Product Store
                                        </button></Link>
                </div>
            </div>)
    }

    return (
        <div className="lg:px-14 sm:px-8 px-4 py-10">
            <div className="flex flex-col items-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                    <MdShoppingCart size={36} className="text-gray-700"/>
                    Your cart
                </h1>

                <p className="text-lg text-gray-600 mt-2">All your selected items</p>
            </div>

            <div class="grid md:grid-cols-5  grid-cols-4 gap-4 pb-2 semibold items-center">
                <div className="md:col-span-2 justify-self-start text-lg text-slate-800 lg:ps-4">
                    Products
                </div>

                <div className="justify-self-center text-lg text-slate-800">
                    Quantity    
                </div>

                <div className="justify-self-center text-lg text-slate-800">
                    Price
                </div>

                <div className="justify-self-center text-lg text-slate-800">
                    Total
                </div>  
            </div>


            <div>
                {cart && cart.length > 0 && cart.map((item, i) => <ItemContent key={i} {...item} handleUpdateCartItem={handleStatusCart}/>)}
            </div>

            <div className="border-t-[1.5px] border-slate-200 py-4 flex sm:flex-row sm:px-0 px-2 flex-col sm:justify-between gap-4">
                <div></div>
                <div className="flex text-sm gap-1 flex-col">
                    <div className="flex justify-between w-full md:text-lg text-sm font-semibold">
                        <span>Subtotal</span>
                        <span>{Math.round(totalPrice*100)/100}</span>
                    </div>

                    <p className="text-slate-500">Taxes and shipping calculated at checkout</p>

                    <Link className="w-full flex justify-end" to="/checkout">
                        <button
                            onClick={()=>{}}
                            className="font-semibold w-[300px] py-2 px-4 rounded-sm bg-customBlue text-white flex items-center justify-center gap-2 hover:text-gray-300 transition duration-500"
                        >
                            <MdShoppingCart size={20}/>
                            Checkout
                        </button>
                    </Link>

                    
                    <Link className="flex gap-2 items-center mt-2 text-slate-500" to="/products">
                        <MdArrowBack/>
                        <span>Continue Shoping</span>
                    </Link>
                </div>
            </div>
        </div>
    )
};

export default Cart;
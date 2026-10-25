import { Badge } from "@mui/material";
import { FaShoppingCart, FaSignInAlt, FaStore } from "react-icons/fa";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "../UserMenu";

const Navbar = () => {
    const path = useLocation().pathname;
    let user;
    const quantityItemCart = useSelector((state) => state.carts.quantityCartItems);
    if(localStorage.getItem("auth") !== null){
        user = JSON.parse(localStorage.getItem("auth"))
    }
    else{
        user = {id: null, roles: []};
    }

    return (
        <div className="sticky top-0 z-50 flex min-h-[70px] w-full items-center justify-between gap-6 bg-custom-gradient px-3 text-white sm:px-6">
            <Link to="/" className="hidden shrink-0 items-center text-2xl font-bold lg:flex">
                <FaStore className="mr-2 text-3xl" />
                <span className="font-[Poppins]">E-Shop</span>
            </Link>

            <ul className="ml-auto flex w-full flex-nowrap items-center justify-between gap-1 whitespace-nowrap text-xs text-slate-800 sm:w-auto sm:justify-end sm:gap-5 sm:text-sm lg:gap-7 lg:text-base">
                <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link className={`${path === "/" ? "text-white font-semibold" : "text-gray-200"}`}
                          to="/">
                        Trang chủ
                    </Link>
                </li>

                <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link className={`${path === "/products" ? "text-white font-semibold" : "text-gray-200"}`}
                          to="/products">
                        Sản phẩm
                    </Link>
                </li>

                <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link className={`${path === "/about" ? "text-white font-semibold" : "text-gray-200"}`}
                          to="/about">
                        Giới thiệu
                    </Link>
                </li>

                <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link className={`${path === "/contact" ? "text-white font-semibold" : "text-gray-200"}`}
                          to="/contact">
                        Liên hệ
                    </Link>
                </li>

                {!user["roles"].includes("ROLE_ADMIN") ? (
                    <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link className={`${path === "/cart" ? "text-white font-semibold" : "text-gray-200"}`}
                          to="/cart">
                        <Badge 
                            showZero
                            badgeContent={quantityItemCart}
                            color="primary"
                            overlap="circular"
                            anchorOrigin={{vertical: "top", horizontal: "right",}}
                        >
                            <FaShoppingCart size={25}/>
                        </Badge>
                    </Link>
                    </li>
                ) : null}
                


                {(user && user.id) ? (
                    <li className="shrink-0 font-[500] transition-all duration-150">
                        <UserMenu/>
                    </li>
                ) : (
                    <li className="shrink-0 font-[500] transition-all duration-150">
                    <Link aria-label="Đăng nhập" className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-red-500 px-2 py-[6px]
                                    text-white font-semibold rounded-md shadow-lg hover:from-purple-600 hover:to-red-400
                                    transition duration-300 ease-in-out transform sm:px-4"
                          to="/login">
                        <FaSignInAlt />
                        <span className="hidden sm:inline">Đăng nhập</span>
                    </Link>
                </li>
                )}
            </ul>
        </div>
    )
};

export default Navbar; 

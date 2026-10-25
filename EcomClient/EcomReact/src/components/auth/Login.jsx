import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineLogin } from "react-icons/ai";
import InputField from "../shared/InputField";
import { useDispatch } from "react-redux";
import { authenticateSignInUser } from "../../store/action";
import toast from "react-hot-toast";
import Spinner from "../shared/Spinner";

const Login = ()=>{
    const navigate = useNavigate();
    const [loader, setLoader] = useState(false);
    const dispatch = useDispatch();
    const {
        register,
        handleSubmit,
        reset,
        formState: {errors}
    } = useForm({
        mode: "onTouched",
    });

    const loginHandle = async (data) => {
        console.log("login clicked");
        dispatch(authenticateSignInUser(data, toast, reset, navigate, setLoader))
    }

    return (
        <div className="min-h-[calc(100vh-64px)] flex justify-center items-center">
            <form onSubmit={handleSubmit(loginHandle)}
                  className="sm:w-[450px] w-[360px] shadow-custom py-8 sm:px-8 px-4 rounded-md ">
                    <div className="flex flex-col items-center justify-center space-y-4 ">
                        <AiOutlineLogin className="text-slate-800 text-5xl"/>
                        <h1 className="text-slate-800 text-center font-montserrat lg:text-3xl text-2xl font-bold">Đăng nhập</h1>
                    </div>
                <hr className="mt-2 mb-5 text-black"/>
                <div className="flex flex-col gap-3">
                    <InputField
                        label="Tên đăng nhập"
                        required
                        id="username"
                        type="text"
                        message="*Vui lòng nhập tên đăng nhập"
                        placeHolder="Nhập tên đăng nhập"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Mật khẩu"
                        required
                        id="password"
                        type="password"
                        message="*Vui lòng nhập mật khẩu"
                        placeHolder="Nhập mật khẩu"
                        register={register}
                        errors={errors}
                    />
                </div>

                <button disabled={loader} 
                        type="submit"
                        className="bg-button-gradient flex gap-2 items-center justify-center font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100  rounded-sm my-3">
                    {loader ? (<><Spinner/>Đang xử lý...</>) : (<>Đăng nhập</>)}
                    
                </button>

                <p className="text-center text-sm text-slate-700 mt-6">
                    Chưa có tài khoản?
                    <Link className="font-semibold underline hover:text-black ml-1" to="/register">
                        <span>Đăng ký</span>
                    </Link>
                </p>
            </form>
        </div>
    )
};

export default Login;

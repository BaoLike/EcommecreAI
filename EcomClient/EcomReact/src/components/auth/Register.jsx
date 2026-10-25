import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineLogin } from "react-icons/ai";
import InputField from "../shared/InputField";
import { useDispatch } from "react-redux";
import { registerNewUser } from "../../store/action";
import toast from "react-hot-toast";
import { FaUserPlus } from "react-icons/fa";
import Spinner from "../shared/Spinner";


const Register = () => {
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

    const registerHandle = async (data) => {
        console.log("register clicked");
        dispatch(registerNewUser(data, toast, reset, navigate, setLoader));
    }

    return (
        <div className="min-h-[calc(100vh-64px)] flex justify-center items-center">
            <form onSubmit={handleSubmit(registerHandle)}
                  className="sm:w-[450px] w-[360px] shadow-custom py-8 sm:px-8 px-4 rounded-md ">
                    <div className="flex flex-col items-center justify-center space-y-4 ">
                        <FaUserPlus className="text-slate-800 text-5xl"/>
                        <h1 className="text-slate-800 text-center font-montserrat lg:text-3xl text-2xl font-bold">Register Here</h1>
                    </div>
                <hr className="mt-2 mb-5 text-black"/>
                <div className="flex flex-col gap-3">
                    <InputField
                        label="Username"
                        required
                        id="username"
                        type="text"
                        message="*Username is required"
                        placeHolder="Enter your username"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Email"
                        required
                        id="email"
                        type="email"
                        message="*Email is required"
                        placeHolder="Enter your email"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Password"
                        required
                        id="password"
                        type="password"
                        min={6}
                        message="*Password is required"
                        placeHolder="Enter your password"
                        register={register}
                        errors={errors}
                    />
                </div>

                <button disabled={loader} 
                        type="submit"
                        className="bg-button-gradient flex gap-2 items-center justify-center font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100  rounded-sm my-3">
                    {loader ? (<><Spinner/>Loading...</>) : (<>Create account</>)}
                    
                </button>

                <p className="text-center text-sm text-slate-700 mt-6">
                    Already have an account?
                    <Link className="font-semibold underline hover:text-black ml-1" to="/login">
                        <span>Login</span>
                    </Link>
                </p>
            </form>
        </div>
    )
};

export default Register;

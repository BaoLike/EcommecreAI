const InputField = ({
    label,
    id,
    type,
    errors,
    register,
    required,
    message,
    className,
    min, 
    value,
    placeHolder
}) => {
    return (
        <div className="flex flex-col gap-1 w-full ">
            <label htmlFor="id"
                className={`${className ? className : ""} font-semibold text-sm text-slate-800`}>
                    {label}
            </label>
            
            <input type={type} 
                   id={id}
                   placeholder={placeHolder}
                   className={`${className ? className : ""} px-2  py-2 border outline-none bg-transparent text-slate-800 rounded-md ${errors[id]?.message ? "border-red-500" : "border-slate-700"}`} {...register(id, {
                    required: {value: required, message},
                    minLength: min ? {value:min, message: "Mật khẩu cần tối thiểu 6 ký tự"} : null,
                    pattern: type === "email" ? {value: /^[a-zA-Z0-9]+@(?:[a-zA-Z0-9]+\.)+com+$/, message: "Email không hợp lệ"} : type === "url" ? {value: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/[^\s]*)?$/i, message: "URL không hợp lệ"} : null
                   })}/>
                   {errors[id]?.message && (
                    <p className="text-sm font-semibold text-red-600 mt-0">
                        {errors[id]?.message}
                    </p>
                   )}
        </div>
    )
};

export default InputField;
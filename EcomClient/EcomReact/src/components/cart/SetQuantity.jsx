const btnStyles = "border-[1.2px] border-slate-800 px-3 py-1 rounded";

const SetQuantity = ({
    quantity, 
    cartCounter,
    handleQuantityIncrease,
    handleQuantityDecrease
}) => {
    return (
        <div className="flex gap-8 items-center">
        {cartCounter ? null : <div className="font-semibold">QUANTITY</div>}
        <div className="flex md:flex-row flex-col gap-4  items-center lg:text-[22px] text-sm">
            <button disabled={quantity<=1}
                className={btnStyles}
                onClick={handleQuantityDecrease}>
                    -
            </button>

            <div className="text-red-500">{quantity}</div>

            <button
                className={btnStyles}
                onClick={handleQuantityIncrease}>
                    +
            </button>
        </div>
    </div>
    )
    
};

export default SetQuantity;
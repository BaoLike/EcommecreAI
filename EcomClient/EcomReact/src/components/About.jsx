const About = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-slate-800 text-4xl font-bold text-center mb-12">
                Giới thiệu
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-center mb-12 ">
                <div className="w-full md:w-1/2 text-center md:text-left">
                    <p className="text-lg mb-4 ">
                        Chào mừng bạn đến E-Shop — nơi mua sắm tin cậy với sản phẩm chất lượng và giá tốt.
                       Thanh toán an toàn, giao hàng nhanh và hỗ trợ khách hàng 24/7.
                       Khám phá bộ sưu tập mới nhất ngay hôm nay!</p>
                </div>

                <div className="w-full md:w-1/2 mb-6 md:mb-0">
                    <img src="https://embarkx.com/sample/placeholder.png" alt="" 
                    className="w-full h-auto rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105"/>
                </div>
            </div>
        </div>
    )
};

export default About;
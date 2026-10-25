import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade, Pagination, Scrollbar } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { truncateText } from '../utils/truncateText';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

const colors = ["bg-banner-color1", "bg-banner-color2", "bg-banner-color3", "bg-banner-color4"];

const Banner = ({ products = [], loading = false, error = '' }) => {
    const bannerProducts = products.filter(Boolean).slice(0, 3);

    if (loading) {
        return (
            <div className="py-2 rounded-md">
                <div className="carousel-item rounded-md sm:h-[500px] h-96 bg-slate-200 animate-pulse" />
            </div>
        );
    }

    if (error || !bannerProducts.length) {
        return (
            <div className="py-2 rounded-md">
                <div className="carousel-item rounded-md sm:h-[500px] h-96 bg-slate-100 flex items-center justify-center px-6 text-center text-slate-600">
                    {error || 'Chưa có sản phẩm nổi bật.'}
                </div>
            </div>
        );
    }

    return (
        <div className="py-2 rounded-md">
            <Swiper
                grabCursor={true}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                effect="fade"
                navigation
                modules={[Pagination, EffectFade, Navigation, Autoplay, Scrollbar]}
                pagination={{ clickable: true }}
                scrollbar={{ draggable: true }}
                slidesPerView={1}
            >
                {bannerProducts.map((item, i) => (
                    <SwiperSlide key={item.productId}>
                        <div className={`carousel-item relative rounded-md sm:h-[500px] h-96 ${colors[i % colors.length]}`}>
                            <div className="flex items-center justify-center h-full">
                                <div className="hidden lg:flex justify-center w-1/2 p-8">
                                    <div className="text-center">
                                        <h3 className="text-3xl text-white font-bold">
                                            {item.brand || 'Sản phẩm nổi bật'}
                                        </h3>
                                        <h1 className="text-5xl text-white font-bold mt-2">
                                            {truncateText(item.productName, 40)}
                                        </h1>
                                        <p className="text-white font-bold mt-4">
                                            {truncateText(item.description, 120)}
                                        </p>
                                        {Number(item.discount) > 0 && (
                                            <p className="text-white mt-2">Giảm {item.discount}%</p>
                                        )}
                                        <Link
                                            className="mt-6 inline-block bg-black text-white py-2 px-4 rounded hover:bg-gray-800"
                                            to={`/products?keyword=${encodeURIComponent(item.productName)}`}
                                        >
                                            Mua ngay
                                        </Link>
                                    </div>
                                </div>

                                <div className="w-full flex justify-center lg:w-1/2 p-4">
                                    <img
                                        src={item.image}
                                        alt={item.productName}
                                        crossOrigin="anonymous"
                                        className="max-h-[420px] w-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default Banner;

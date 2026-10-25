import { Swiper, SwiperSlide } from 'swiper/react';
import {Navigation, Autoplay, EffectFade, Pagination} from 'swiper/modules';
import bannerList from "../../../src/components/utils/index.js";

// Import Swiper styles
import 'swiper/css';
import { Link } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

const colors = ["bg-banner-color1", "bg-banner-color2", "bg-banner-color3"]

const Banner = () => {
  return (
    <div className='py-2 rounded-md'>
        <Swiper grabCursor = {true} autoplay={{delay: 4000, disableOnInteraction: false,}}
                navigation
                modules={[Pagination, EffectFade, Navigation, Autoplay]}
                pagination={{clickable: true}}
                scrollbar= {{draggable: true}}
                slidesPerView={1}>
                    {bannerList.map((item, i) => (
                        <SwiperSlide>
                            <div className={`carousel-item rounded-md sm:h-[500px] h-96 ${colors[i]}`}>
                                <div className='flex items-center justify-center'>
                                    <div className='hidden lg:flex justify-center w-1/2 p-8'>
                                    <div className='text-center'>
                                        <h3 className='text-3xl text-white font-bold'>{item.title}</h3>
                                        <h1 className='text-5xl text-white font-bold mt-2'>{item.subtitle}</h1>
                                        <p className='text-white font-bold mt-4'>{item.description}</p>
                                        <Link className='mt-6 inline-block bg-black text-white py-2 px-4 rounded hover:bg-gray-800'
                                              to="/products">
                                            Shop
                                        </Link>
                                    </div>
                                </div>
                                
                                    <div className='w-full flex justify-center lg:w-1/2 p4'>
                                        <img src={item.image} alt="" />
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
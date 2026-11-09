import { Swiper, SwiperSlide } from 'swiper/react';
import { Link } from 'react-router-dom';
import { railBreakpoints } from '../../data/railBreakpoints';

import 'swiper/css';
import './scss/BannerList.scss';

export const BannerList = ({ bannerList = [] }) => {
  const breakpoints = railBreakpoints.horizontal;

  return (
    <div className="bannerList">
      <Swiper
        slidesPerView={breakpoints[0].slidesPerView}
        spaceBetween={breakpoints[0].spaceBetween}
        breakpoints={breakpoints}
        watchOverflow
        className="banner-swiper"
      >
        {bannerList.map((banner, index) => (
          <SwiperSlide key={`${banner.path}-${index}`}>
            <Link to={banner.path} className="banner-item">
              <img src={banner.img} alt="" />
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
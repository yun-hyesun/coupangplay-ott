import { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { Link } from 'react-router-dom';
import "./scss/BannerList.scss"

// Swiper 기본 스타일 임포트
import 'swiper/css';
import 'swiper/css/pagination';
                        
export const BannerList = ({ bannerList = [] }) => {
  const bannerListRef = useRef(null);
  const [bannerWidth, setBannerWidth] = useState(null);

  useEffect(() => {
    const container = bannerListRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setBannerWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isMobile = bannerWidth !== null && bannerWidth <= 2400;
  return (
    <div className='bannerList' ref={bannerListRef}>
      {isMobile ? (
        /* 모바일 화면일 때: Swiper 슬라이드 적용 */
        <Swiper
          spaceBetween={12}
          slidesPerView="auto"
          observer={true}
          observeParents={true}
          className="banner-swiper"
        >
          {bannerList.map((banner, id) => (
            <SwiperSlide key={id}>
              <Link to={banner.path} className="banner-item">
                <img src={banner.img} alt="" />
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        /* PC 화면일 때: 일반 리스트 (그리드 또는 Flex) */
        <div className="banner-flex">
          {bannerList.map((banner, id) => (
            <Link to={banner.path} key={id} className="banner-item">
              <img src={banner.img} alt="" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

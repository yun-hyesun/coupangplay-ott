import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Autoplay,
  Navigation,
  Pagination,
  A11y,
} from 'swiper/modules';

import { useMovieStore } from '../../store/useMovieStore';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './scss/MainBanner.scss';

export const MainBanner = ({ type = 'all' }) => {
  const bannerContents = useMovieStore(
    (state) => state.bannerContents
  );

  const isBannerLoading = useMovieStore(
    (state) => state.isBannerLoading
  );

  const bannerError = useMovieStore(
    (state) => state.bannerError
  );

  const bannerType = useMovieStore(
    (state) => state.bannerType
  );

  const onFetchBanner = useMovieStore(
    (state) => state.onFetchBanner
  );

  useEffect(() => {
    onFetchBanner(type);
  }, [type, onFetchBanner]);

  if (bannerType !== type || isBannerLoading) {
    return null;
  }

  if (bannerError) {
    return (
      <section className="main-banner main-banner--status">
        <p role="alert">{bannerError}</p>

        <button
          type="button"
          onClick={() => onFetchBanner(type)}
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (bannerContents.length === 0) return null;

  return (
    <section className="main-banner" aria-label="추천 콘텐츠">
      <Swiper
        key={type}
        modules={[Navigation, Pagination, A11y]}
        slidesPerView="auto"
        spaceBetween={20}
        navigation
        pagination={{ clickable: true }}
        // autoplay={{
        //   delay: 5000,
        //   disableOnInteraction: false,
        //   pauseOnMouseEnter: true,
        // }}
        a11y={{
          prevSlideMessage: '이전 배너',
          nextSlideMessage: '다음 배너',
          paginationBulletMessage: '{{index}}번째 배너로 이동',
        }}
      >
        {bannerContents.map((item, index) => {
          const title = item.title || item.name;

          return (
            <SwiperSlide
              key={`${item.media_type}-${item.id}`}
            >
              <Link
                className="main-banner-link"
                to={`/${item.media_type}/${item.id}`}
                aria-label={`${title} 상세보기`}
              >
                <div className="banner-slide-list">
                  <img
                    className="slide-list-image"
                    src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                    alt=""
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />

                  <div className="slide-list-info">
                    <h2 className="info-title">{title}</h2>

                    {item.overview && (
                      <p className="info-description">
                        {item.overview}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};
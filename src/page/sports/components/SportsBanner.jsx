import { A11y, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { SPORTS_BANNERS } from "../../../data/sportsLeagues";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../scss/SportsBanner.scss";

export const SportsBanner = ({ slides = SPORTS_BANNERS }) => {
  if (!slides?.length) return null;

  return (
    <section className="sports-banner" aria-label="스포츠 추천 배너">
      <Swiper
        modules={[Navigation, Pagination, A11y]}
        className="sports-banner__swiper"
        slidesPerView="auto"
        initialSlide={0}
        spaceBetween={20}
        loop={false}
        navigation
        pagination={{ clickable: true }}
        a11y={{
          prevSlideMessage: "이전 스포츠 배너",
          nextSlideMessage: "다음 스포츠 배너",
          paginationBulletMessage: "{{index}}번째 스포츠 배너로 이동",
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <a
              className="sports-banner__slide"
              href="#sports-schedule-title"
              aria-label={slide.alt}
            >
              <img
                className="sports-banner__image"
                src={slide.image}
                alt={slide.alt}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

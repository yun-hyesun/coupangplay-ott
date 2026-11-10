import { A11y, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Link } from "react-router-dom";
import { SPORTS_BANNERS } from "../../../data/sportsLeagues";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../scss/SportsBanner.scss";

const BANNER_DETAILS = {
  "premier-league": {
    eyebrow: "PREMIER LEAGUE",
    title: "PREMIER LEAGUE",
    description: "세계 최고의 무대, 매 순간이 명승부",
    date: "2026/27 시즌 · 경기 일정 및 하이라이트",
    leagueId: "PL",
    logo: "/images/sports/icon/team_logo/premier-league-white.png"
  },
  "formula-one": { eyebrow: "FORMULA 1", title: "FORMULA 1", description: "한계를 넘어서는 레이스의 순간", date: "2026 시즌 · 그랑프리 일정 및 다시보기", leagueId: "f1", logo: "/images/sports/icon/team_logo/f1-white.png" },
  laliga: { eyebrow: "LALIGA", title: "LALIGA", description: "뜨거운 라이벌전과 최고의 플레이", date: "2026/27 시즌 · 경기 일정 및 하이라이트", leagueId: "PD", logo: "/images/sports/icon/team_logo/laliga-white.png" },
};

export const SportsBanner = ({ slides = SPORTS_BANNERS }) => {
  if (!slides?.length) return null;
  return (
    <section className="sports-banner" aria-label="스포츠 추천 배너">
      <Swiper modules={[Navigation, Pagination, A11y]} className="sports-banner__swiper" slidesPerView={1} spaceBetween={20} loop={slides.length > 1} navigation pagination={{ clickable: true }} a11y={{ prevSlideMessage: "이전 스포츠 배너", nextSlideMessage: "다음 스포츠 배너", paginationBulletMessage: "{{index}}번째 스포츠 배너로 이동" }}>
        {slides.map((slide, index) => {
          const detail = BANNER_DETAILS[slide.id] || { eyebrow: "COUPANG PLAY SPORTS", title: slide.alt, description: "스포츠의 모든 순간을 만나보세요", date: "경기 일정 및 하이라이트" };
          return (
            <SwiperSlide key={slide.id}>
              <div className="sports-banner__slide">
                <img className="sports-banner__image" src={slide.image} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
                <div className="sports-banner__content">
                  {/* <span className="sports-banner__eyebrow">{detail.eyebrow}</span> */}
                  <div className="sports-banner__heading">
                    {detail.logo && (
                      <img
                        className="sports-banner__logo"
                        src={detail.logo}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                    <h1 className="sports-banner__title">
                      {detail.title}
                    </h1>
                  </div>
                  <p className="sports-banner__description">{detail.description}</p>
                  <p className="sports-banner__date">{detail.date}</p>
                  <Link
                    className="sports-banner__button"
                    to={detail.leagueId ? `/sports/league/${detail.leagueId}` : "#sports-schedule-title"}
                    state={detail.leagueId ? { leagueTab: "schedule" } : undefined}
                    aria-label={`${slide.alt} 경기 일정 보러가기`}
                  >경기 일정 보러가기 <span aria-hidden="true">→</span></Link>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};

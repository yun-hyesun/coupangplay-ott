import { useId } from "react";
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
    logo: "/images/sports/icon/team_logo/premier-league-white.png",
    logoBounds: [50, 29, 119, 148],
  },
  laliga: {
    eyebrow: "LALIGA",
    title: "LALIGA",
    description: "뜨거운 라이벌전과 최고의 플레이",
    date: "2026/27 시즌 · 경기 일정 및 하이라이트",
    leagueId: "PD",
    logo: "/images/sports/icon/team_logo/laliga-white.png",
    logoBounds: [52, 61, 117, 109],
  },
  nfl: {
    eyebrow: "NFL",
    title: "NFL",
    description: "터치다운 한 번에 뒤집히는 승부",
    date: "2026 시즌 · 경기 일정 및 하이라이트",
    leagueId: "nfl",
    logo: "/images/sports/league-detail/white-logos/nfl.png",
    logoBounds: [63, 48, 94, 129],
  },
};

export const SportsBanner = ({ slides = SPORTS_BANNERS }) => {
  const navigationId = `sports-banner-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!slides?.length) return null;
  return (
    <section className="sports-banner" aria-label="스포츠 추천 배너">
      <Swiper modules={[Navigation, Pagination, A11y]} className="sports-banner__swiper" slidesPerView="auto" spaceBetween={20} loop={false} rewind={false} navigation={{ prevEl: `#${navigationId}-prev`, nextEl: `#${navigationId}-next` }} pagination={{ clickable: true }} a11y={{ prevSlideMessage: "이전 스포츠 배너", nextSlideMessage: "다음 스포츠 배너", paginationBulletMessage: "{{index}}번째 스포츠 배너로 이동" }}>
        {slides.map((slide, index) => {
          const detail = BANNER_DETAILS[slide.id] || { eyebrow: "COUPANG PLAY SPORTS", title: slide.alt, description: "스포츠의 모든 순간을 만나보세요", date: "경기 일정 및 하이라이트" };
          // Normalize the visible artwork inside the existing 220px logo assets.
          const [logoLeft, logoTop, logoWidth, logoHeight] = detail.logoBounds || [0, 0, 220, 220];
          return (
            <SwiperSlide key={slide.id}>
              <div className={`sports-banner__slide sports-banner__slide--${slide.id}`}>
                <img className="sports-banner__image" src={slide.image} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
                <div className="sports-banner__content">
                  {/* <span className="sports-banner__eyebrow">{detail.eyebrow}</span> */}
                  <div className="sports-banner__heading">
                    {detail.logo && (
                      <span
                        className="sports-banner__logo"
                        aria-hidden="true"
                        style={{
                          "--sports-logo-ratio": logoWidth / logoHeight,
                          "--sports-logo-image-width": `${220 / logoWidth * 100}%`,
                          "--sports-logo-image-left": `${-logoLeft / logoWidth * 100}%`,
                          "--sports-logo-image-top": `${-logoTop / logoHeight * 100}%`,
                        }}
                      >
                        <img src={detail.logo} alt="" />
                      </span>
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
      <button id={`${navigationId}-prev`} type="button" className="swiper-button-prev sports-banner__prev" aria-label="이전 스포츠 배너" />
      <button id={`${navigationId}-next`} type="button" className="swiper-button-next sports-banner__next" aria-label="다음 스포츠 배너" />
    </section>
  );
};

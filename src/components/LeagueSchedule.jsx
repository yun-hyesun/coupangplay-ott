import { EmptyMessage, formatKoreanDate, MatchCard } from "./LeagueDetailShared";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

function ScheduleMatchRail({ league, scoresOn, games, tab }) {
  return (
    <Swiper
      className="league-detail__match-carousel"
      role="region"
      aria-label={(tab === "ended" ? "종료" : "예정") + " 경기 목록"}
      modules={[Navigation, A11y]}
      navigation
      slidesPerView="auto"
      spaceBetween={16}
      breakpoints={{ 0: { spaceBetween: 10 }, 601: { spaceBetween: 16 } }}
      watchOverflow
      a11y={{ prevSlideMessage: "이전 경기", nextSlideMessage: "다음 경기" }}
    >
      {games.map((game) => (
        <SwiperSlide key={game.gameId}>
          <MatchCard game={game} leagueId={league.id} scoresOn={scoresOn} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export function LeagueSchedule({ league, dateRange, scoresOn, scheduleState, visibleMatches, activeFixtureTab, onFixtureTabChange }) {
  return (
    <section className="league-detail__section league-detail__fixtures" aria-labelledby="league-detail-schedule-title" aria-describedby="league-detail-schedule-range">
      <div className="league-detail__section-heading">
        <h2 id="league-detail-schedule-title">경기 일정</h2>
      </div>
      <p id="league-detail-schedule-range" className="league-detail__schedule-range">{formatKoreanDate(dateRange.from)} ~ {formatKoreanDate(dateRange.to)} · 한국 시간 (KST)</p>
      <div className="league-detail__schedule-controls">
        <div className="league-detail__segmented" role="group" aria-label="경기 결과 보기">
          <button type="button" className={activeFixtureTab === "upcoming" ? "is-active" : ""} aria-pressed={activeFixtureTab === "upcoming"} onClick={() => onFixtureTabChange("upcoming")}>예정</button>
          <button type="button" className={activeFixtureTab === "ended" ? "is-active" : ""} aria-pressed={activeFixtureTab === "ended"} onClick={() => onFixtureTabChange("ended")}>종료</button>
        </div>
      </div>
      {scheduleState.loading ? (
        <div className="league-detail__match-grid" aria-label="경기 일정 불러오는 중">
          {Array.from({ length: 4 }, (_, index) => <div className="league-detail__match-skeleton" key={index} />)}
        </div>
      ) : visibleMatches.length ? (
        <ScheduleMatchRail
          key={`${league.id}:${activeFixtureTab}:${dateRange.from}`}
          league={league}
          scoresOn={scoresOn}
          games={visibleMatches}
          tab={activeFixtureTab}
        />
      ) : (
        <EmptyMessage>{scheduleState.errors.length ? scheduleState.errors.join(" · ") : (activeFixtureTab === "ended" ? "해당 2주 기간에 종료된 경기가 없습니다." : "해당 2주 기간에 예정되었거나 라이브 중인 경기가 없습니다.")}</EmptyMessage>
      )}
      {!scheduleState.loading && visibleMatches.length > 0 && scheduleState.errors.length > 0 && (
        <p className="league-detail__section-caption" role="status">일부 날짜의 경기 일정을 불러오지 못했습니다.</p>
      )}
    </section>
  );
}

import { EmptyMessage, formatKoreanDate, MatchCard } from "./LeagueDetailShared";

export function LeagueSchedule({ league, today, scoresOn, scheduleState, visibleMatches, activeFixtureTab, onFixtureTabChange }) {
  return (
    <section className="league-detail__section league-detail__fixtures" aria-labelledby="league-detail-schedule-title">
      <div className="league-detail__section-heading">
        <div>
          <h2 id="league-detail-schedule-title">경기 일정</h2>
          <p>{formatKoreanDate(today)} 기준 · 한국 시간 (KST)</p>
        </div>
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
        <div className="league-detail__match-grid">
          {visibleMatches.slice(0, 4).map((game) => <MatchCard key={game.gameId} game={game} leagueId={league.id} scoresOn={scoresOn} />)}
        </div>
      ) : (
        <EmptyMessage>{scheduleState.errors.length ? scheduleState.errors.join(" · ") : (activeFixtureTab === "ended" ? "오늘 종료된 경기가 없습니다." : "오늘 예정된 경기가 없습니다.")}</EmptyMessage>
      )}
    </section>
  );
}

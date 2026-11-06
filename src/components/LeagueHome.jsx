import { BroadcastCard, EmptyMessage } from "./LeagueDetailShared";

export function LeagueHome({ league, scheduleState }) {
  return (
    <section className="league-detail__section league-detail__broadcast" aria-labelledby="league-detail-broadcast-title">
      <div className="league-detail__section-heading">
        <h2 id="league-detail-broadcast-title">프리미엄 리그 중계</h2>
      </div>
      {scheduleState.loading ? (
        <div className="league-detail__broadcast-grid">
          {Array.from({ length: 4 }, (_, index) => <div className="league-detail__broadcast-skeleton" key={index} />)}
        </div>
      ) : scheduleState.games.length ? (
        <div className="league-detail__broadcast-grid">
          {scheduleState.games.slice(0, 4).map((game) => <BroadcastCard key={game.gameId} game={game} leagueId={league.id} />)}
        </div>
      ) : (
        <EmptyMessage>{scheduleState.errors.length ? scheduleState.errors.join(" · ") : "현재 확인할 수 있는 중계 일정이 없습니다."}</EmptyMessage>
      )}
    </section>
  );
}

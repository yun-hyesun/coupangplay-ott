import { BroadcastCard, EmptyMessage } from "./LeagueDetailShared";
import { BROADCAST_LIMIT, selectBroadcastGames } from "../data/leagueBroadcasts";

export function LeagueHome({ league, scheduleState }) {
  const games = selectBroadcastGames(scheduleState.games);
  return (
    <section className="league-detail__section league-detail__broadcast" aria-labelledby="league-detail-broadcast-title">
      <div className="league-detail__section-heading">
        <h2 id="league-detail-broadcast-title">{league.name} 중계</h2>
      </div>
      {scheduleState.loading ? (
        <div className="league-detail__broadcast-grid">
          {Array.from({ length: BROADCAST_LIMIT }, (_, index) => <div className="league-detail__broadcast-skeleton" key={index} />)}
        </div>
      ) : games.length ? (
        <div className="league-detail__broadcast-grid">
          {games.map((game) => <BroadcastCard key={game.gameId} game={game} leagueId={league.id} sport={league.sport} />)}
        </div>
      ) : (
        <EmptyMessage>{scheduleState.errors.length ? scheduleState.errors.join(" · ") : "현재 예정되었거나 라이브 중인 경기가 없습니다."}</EmptyMessage>
      )}
    </section>
  );
}

import { SPORTS_TEAMS_BY_LEAGUE } from "../data/sportsTeams";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const DETAIL_BACKGROUND = "/images/sports/league-detail/detail-matchup-bg.png";

export function normalizeSportsText(value) {
  return String(value || "").normalize("NFKC").replace(/[\s.·_–-]/g, "").toLowerCase();
}

export function formatKoreanDate(dateKey) {
  const date = new Date(dateKey + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatGameTime(value) {
  if (!value) return "시간 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatGameDate(value) {
  if (!value) return "일정 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "일정 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}

export function getGameStatus(status = "") {
  if (/live|in.?play|paused|progress|quarter|halftime|overtime/i.test(status)) {
    return { label: "LIVE", type: "live" };
  }
  if (/finished|full.?time|final|ended|complete/i.test(status)) {
    return { label: "종료", type: "ended" };
  }
  if (/postponed|delayed/i.test(status)) return { label: "연기", type: "scheduled" };
  if (/canceled/i.test(status)) return { label: "취소", type: "scheduled" };
  return { label: "예정", type: "scheduled" };
}

export function findLeagueTeam(leagueId, candidate = {}) {
  const teams = SPORTS_TEAMS_BY_LEAGUE[leagueId] || [];
  const name = candidate.teamName || candidate.name || candidate.nameEn || candidate.team?.name || "";
  const id = candidate.teamId ?? candidate.id;
  return teams.find((team) => id != null && String(team.teamId) === String(id)) ||
    teams.find((team) => normalizeSportsText(team.name) === normalizeSportsText(name)) ||
    teams.find((team) => normalizeSportsText(name) && normalizeSportsText(name).includes(normalizeSportsText(team.name))) ||
    null;
}

export function TeamImage({ team, leagueId, className = "" }) {
  const localTeam = team ? findLeagueTeam(leagueId, team) : null;
  const image = team?.crest || team?.logoPath || localTeam?.logoPath;
  if (!image) return <span className={"league-detail__team-placeholder " + className} aria-hidden="true" />;
  return <img className={className} src={image} alt="" loading="lazy" />;
}

export function EmptyMessage({ children }) {
  return <p className="league-detail__empty" role="status">{children}</p>;
}

export function MatchCard({ game, leagueId, scoresOn }) {
  const status = getGameStatus(game.status);
  const isRace = Boolean(game.raceName);
  const homeName = isRace ? game.raceName : game.home?.name || "홈 팀";
  const awayName = isRace ? "그랑프리" : game.away?.name || "원정 팀";
  const hasScore = scoresOn && status.type === "ended" && game.home?.score != null && game.away?.score != null;

  return (
    <article className="league-detail__match-card">
      <div className="league-detail__match-status-row">
        <span className={"league-detail__status league-detail__status--" + status.type}>
          {status.type === "live" && <span aria-hidden="true">●</span>}
          {status.label}
        </span>
        <span className="league-detail__match-quality">{game.scheduleSegment || game.stage || "경기 일정"}</span>
      </div>
      <div className="league-detail__match-teams">
        <div className="league-detail__match-team league-detail__match-team--home">
          <span>{homeName}</span>
          <TeamImage team={game.home} leagueId={leagueId} />
        </div>
        <div className="league-detail__match-center">
          {hasScore ? (
            <strong>{game.home.score} <i>:</i> {game.away.score}</strong>
          ) : (
            <strong>{formatGameTime(game.utcDate || game.startTime)}</strong>
          )}
          <span>{formatGameDate(game.utcDate || game.startTime)}</span>
        </div>
        <div className="league-detail__match-team league-detail__match-team--away">
          {!isRace && <TeamImage team={game.away} leagueId={leagueId} />}
          <span>{awayName}</span>
        </div>
      </div>
      <div className="league-detail__match-footer">
        <span>{game.venue || game.statusDetail || "한국 시간 기준"}</span>
        <span className="league-detail__match-arrow" aria-hidden="true">›</span>
      </div>
    </article>
  );
}

export function BroadcastCard({ game, leagueId }) {
  const status = getGameStatus(game.status);
  const isRace = Boolean(game.raceName);
  const heading = isRace
    ? game.raceName
    : (game.home?.name || "홈 팀") + " vs " + (game.away?.name || "원정 팀");

  return (
    <article className="league-detail__broadcast-card">
      <div className="league-detail__broadcast-media">
        <img className="league-detail__broadcast-bg" src={DETAIL_BACKGROUND} alt="" />
        <div className="league-detail__broadcast-teams">
          <TeamImage team={game.home} leagueId={leagueId} />
          {!isRace && <span>VS</span>}
          {!isRace && <TeamImage team={game.away} leagueId={leagueId} />}
        </div>
        <span className={"league-detail__status league-detail__status--" + status.type}>
          {status.type === "live" && <span aria-hidden="true">●</span>}
          {status.label}
        </span>
        {status.type !== "ended" && (
          <span className="league-detail__broadcast-time">
            {formatGameDate(game.utcDate || game.startTime)} · {formatGameTime(game.utcDate || game.startTime)}
          </span>
        )}
        <button type="button" className="league-detail__play" aria-label={heading + " 재생"}>
          <span aria-hidden="true" />
        </button>
      </div>
      <div className="league-detail__broadcast-copy">
        <strong>{heading}</strong>
        <span>{game.competitionName || "프리미엄 리그 중계"}</span>
      </div>
    </article>
  );
}

export function VideoCard({ video, rank, badge = "하이라이트" }) {
  return (
    <article className="league-detail__video-card">
      {rank != null && <span className="league-detail__video-rank">{rank}</span>}
      <div className="league-detail__video-main">
        <div className="league-detail__video-media">
          <img src={video.image} alt="" loading="lazy" />
          <span className="league-detail__video-badge"><span aria-hidden="true">▶</span> {badge}</span>
          <span className="league-detail__play" aria-hidden="true"><span /></span>
          {video.duration && <span className="league-detail__duration">{video.duration}</span>}
        </div>
        <h3>{video.title}</h3>
        {video.meta && <p>{video.meta}</p>}
      </div>
    </article>
  );
}

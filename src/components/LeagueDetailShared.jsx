import { SPORTS_TEAMS_BY_LEAGUE } from "../data/sportsTeams";
import { formatBroadcastDate, getBroadcastStatus } from "../data/leagueBroadcasts";
import "./content/scss/ContentCard.scss";

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
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.month}월 ${parts.day}일 (${parts.weekday})`;
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

function LiveBadge({ label }) {
  return (
    <span className="contentCard-badge live league-detail__live-badge" aria-label={label}>
      <i aria-hidden="true"><span /></i>LIVE
    </span>
  );
}

export function MatchCard({ game, leagueId, scoresOn }) {
  const status = getGameStatus(game.status);
  const isRace = Boolean(game.raceName);
  const homeName = isRace ? game.raceName : game.home?.name || "홈 팀";
  const awayName = isRace ? "그랑프리" : game.away?.name || "원정 팀";
  const hasScore = scoresOn && status.type === "ended" && game.home?.score != null && game.away?.score != null;
  const quality = ["4K", "HDR"].includes(game.broadcastQuality) ? game.broadcastQuality : null;

  return (
    <article className="league-detail__match-card" data-match-status={status.type}>
      {status.type === "live" ? <LiveBadge label="라이브 경기" /> : (
        <span className={"league-detail__match-badge league-detail__match-badge--" + status.type} aria-label={status.label}>
          {status.label}
        </span>
      )}
      <div className="league-detail__match-teams">
        <div className="league-detail__match-team league-detail__match-team--home">
          <TeamImage team={game.home} leagueId={leagueId} />
          <span title={homeName}>{homeName}</span>
        </div>
        <div className="league-detail__match-center">
          {hasScore ? (
            <strong>{game.home.score} <i>:</i> {game.away.score}</strong>
          ) : (
            <strong>{formatGameTime(game.utcDate || game.startTime)}</strong>
          )}
          <span>{formatGameDate(game.utcDate || game.startTime || game.dateKey)}</span>
        </div>
        <div className="league-detail__match-team league-detail__match-team--away">
          {!isRace && <TeamImage team={game.away} leagueId={leagueId} />}
          <span title={awayName}>{awayName}</span>
        </div>
      </div>
      <div className="league-detail__match-action" aria-hidden="true">
        <span className="league-detail__match-action-icon"><img src={"/images/sports/league-detail/schedule-" + (status.type === "scheduled" ? "plus" : "play") + ".svg"} alt="" /></span>
        {quality && <span className="league-detail__match-quality">{quality}</span>}
      </div>
    </article>
  );
}

export function BroadcastCard({ game, leagueId }) {
  const isLive = getBroadcastStatus(game.status) === "live";
  const startTime = formatBroadcastDate(game.utcDate || game.startTime);
  const thumbnail = isLive && (game.broadcastThumbnail || game.thumbnail);
  const isRace = Boolean(game.raceName);
  const heading = isRace
    ? game.raceName
    : (game.home?.name || "홈 팀") + " vs " + (game.away?.name || "원정 팀");

  return (
    <article className="league-detail__broadcast-card" data-broadcast-status={isLive ? "live" : "scheduled"}>
      <div className="league-detail__broadcast-media">
        <img className="league-detail__broadcast-bg" src={thumbnail || DETAIL_BACKGROUND} alt="" />
        {!thumbnail && <div className="league-detail__broadcast-teams">
          <TeamImage team={game.home} leagueId={leagueId} />
          {!isRace && <span>VS</span>}
          {!isRace && <TeamImage team={game.away} leagueId={leagueId} />}
        </div>}
        {isLive ? <>
          <LiveBadge label="라이브 중계" />
          <span className="league-detail__broadcast-play" aria-hidden="true">
            <span><img src="/images/sports/league-detail/broadcast-play.svg" alt="" /></span>
          </span>
        </> : <div className="league-detail__broadcast-overlay">
          <time dateTime={game.utcDate || game.startTime}>{startTime}</time>
        </div>}
      </div>
      <div className="league-detail__broadcast-copy">
        <strong>{heading}</strong>
        <span>{startTime}</span>
      </div>
    </article>
  );
}

function HighlightBadge({ kind = "highlight" }) {
  const assets = "/images/sports/league-detail/popular/";
  const feedAssets = "/images/sports/league-detail/videos/";
  if (kind === "replay") return (
    <span className="league-detail__replay-badge" aria-label="다시보기">
      <span className="league-detail__replay-symbol" aria-hidden="true">
        <span><img src={feedAssets + "replay-symbol.svg"} alt="" /></span>
        <img src={feedAssets + "replay-symbol-overlay.svg"} alt="" />
        <img src={feedAssets + "replay-symbol-overlay.svg"} alt="" />
      </span>다시보기
    </span>
  );
  const recommend = kind === "recommend";
  return (
    <span className={"league-detail__highlight-badge" + (recommend ? " league-detail__highlight-badge--recommend" : "")} aria-label={recommend ? "추천 영상" : "하이라이트"}>
      <img className="league-detail__highlight-bg" src={recommend ? feedAssets + "recommend-bg.svg" : assets + "highlight-bg.svg"} alt="" />
      <span className="league-detail__highlight-symbol" aria-hidden="true"><img src={assets + "highlight-symbol.svg"} alt="" /></span>
      <span className="league-detail__highlight-symbol-overlay" aria-hidden="true">
        <img src={assets + "highlight-symbol-overlay.svg"} alt="" />
        <img src={assets + "highlight-symbol-overlay.svg"} alt="" />
      </span>
      <img className="league-detail__highlight-label" src={recommend ? feedAssets + "recommend-label.svg" : assets + "highlight-label.svg"} alt="" />
    </span>
  );
}

export function VideoCard({ video, rank, badge = "하이라이트", variant }) {
  const ranked = rank != null;
  const feed = variant === "feed";
  const VideoMain = video.url ? "a" : "div";
  const views = video.viewCount == null ? "" : `조회수 ${new Intl.NumberFormat("ko-KR").format(video.viewCount)}회`;
  const videoTooltip = views ? `${video.title}\n${views}` : video.title;
  return (
    <article className={"league-detail__video-card" + (ranked ? " league-detail__video-card--ranked" : "") + (feed ? " league-detail__video-card--feed" : "") + (rank >= 10 ? " league-detail__video-card--double" : "")}>
      {ranked && <span className="league-detail__video-rank" aria-label={rank + "위"}>{rank}</span>}
      <VideoMain
        className="league-detail__video-main"
        href={video.url || undefined}
        target={video.url ? "_blank" : undefined}
        rel={video.url ? "noopener noreferrer" : undefined}
        aria-label={video.url ? `${video.title} · ${views} · YouTube에서 새 탭으로 보기` : undefined}
        title={video.url ? videoTooltip : undefined}
      >
        <div className="league-detail__video-media">
          <img src={video.image} alt="" loading="lazy" />
          {!ranked && !feed && <span className="league-detail__video-badge"><span aria-hidden="true">▶</span> {badge}</span>}
          {ranked || feed ? <span className={feed ? "league-detail__feed-play" : "league-detail__popular-play"} aria-hidden="true"><span><img src={feed ? "/images/sports/league-detail/videos/video-play.svg" : "/images/sports/league-detail/popular/video-play.svg"} alt="" /></span></span> : <span className="league-detail__play" aria-hidden="true"><span /></span>}
          {ranked && video.quality && <span className="league-detail__video-quality">{video.quality}</span>}
          {video.duration && <span className="league-detail__duration">{video.duration}</span>}
        </div>
        {(ranked || feed) && <HighlightBadge kind={feed ? video.kind : "highlight"} />}
        <h3 title={videoTooltip}>{video.title}</h3>
        {!ranked && video.meta && <p>{video.meta}</p>}
      </VideoMain>
    </article>
  );
}

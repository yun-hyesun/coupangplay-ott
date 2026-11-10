import { useEffect, useMemo, useRef, useState, useId} from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "./scss/Sports.scss";

import {
  DEFAULT_SELECTED_LEAGUE_IDS,
  SPORTS_CATEGORIES,
  SPORTS_FEATURED_LEAGUE_IDS,
  SPORTS_LEAGUES,
} from "../../data/sportsLeagues";
import {
  SPORTS_HIGHLIGHTS,
  SPORTS_LIVE_POSTERS,
  SPORTS_MOMENTS,
  SPORTS_PASS_CONTENT,
  SPORTS_RECOMMENDATIONS,
  SPORTS_REPLAYS,
  SPORTS_TOGETHER,
} from "../../data/sportsPageContent";
import { SportsBanner } from "./components/SportsBanner";
import { SportsSettingsModal } from "./components/SportsSettingsModal";
import { MatchRelatedVideos } from "../../components/MatchRelatedVideos";
import { LiveBadge } from "../../components/LeagueDetailShared";
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll";
import { useScheduleMatchVideos } from "../../hooks/useScheduleMatchVideos";
import { getScheduleUnitLabel } from "../../data/leagueScheduleUnits";
import { getYouTubeVideoId } from "../../data/youtubeVideoId";
import { getMatchVideoKey } from "../../data/matchRelatedVideos";
import { SPORTS_TEAMS_BY_LEAGUE } from "../../data/sportsTeams";
import { useAuthStore } from "../../store/useAuthStore";
import { getF1RacesForDate } from "../../service/f1Service";
import { auth } from "../../firebase/firebase";
import { useProfileStore } from "../../store/useProfileStore";
import { useWatchlistStore } from "../../store/useWatchlistStore";
import {
  getFootballScheduleForDate,
  getFootballLiveMatches,
  getKleagueMatchesForDate,
  getNbaGamesForSeoulDate,
} from "../../service/sportsService";

const SHOW_LIVE_SECTION = false;
const LEAGUE_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-leagues";
const TEAM_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-teams";
const VALID_SPORTS_LEAGUE_IDS = new Set(SPORTS_LEAGUES.map((league) => league.id));
const VALID_SPORTS_TEAM_IDS = new Set(Object.values(SPORTS_TEAMS_BY_LEAGUE).flat().map((team) => team.id));
const SEOUL_TIME_ZONE = "Asia/Seoul";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getSeoulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function readSelectedLeagueIds() {
  try {
    const stored = window.localStorage.getItem(LEAGUE_SUBSCRIPTIONS_STORAGE_KEY);
    if (stored === null) return DEFAULT_SELECTED_LEAGUE_IDS;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id) => typeof id === "string" && VALID_SPORTS_LEAGUE_IDS.has(id)))].slice(0, 10)
      : DEFAULT_SELECTED_LEAGUE_IDS;
  } catch {
    return DEFAULT_SELECTED_LEAGUE_IDS;
  }
}

function shiftDate(dateKey, amount) {
  const parts = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromKey(dateKey) {
  return new Date(dateKey + "T00:00:00Z");
}

function formatMonth(dateKey) {
  const date = dateFromKey(dateKey);
  return date.getUTCFullYear() + "년 " + (date.getUTCMonth() + 1) + "월";
}

function formatDateForNote(dateKey) {
  const date = dateFromKey(dateKey);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatGameTime(startTime) {
  if (!startTime) return "시간 미정";
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getScheduleSubLabel(game) {
  return getScheduleUnitLabel(game);
}

function getGameStatus(status = "") {
  if (/postponed|delayed/i.test(status)) return { label: "연기", modifier: "scheduled" };
  if (/canceled/i.test(status)) return { label: "취소", modifier: "scheduled" };
  if (/suspended/i.test(status)) return { label: "중단", modifier: "scheduled" };
  if (/live|in.?play|paused|progress|quarter|halftime|overtime/i.test(status)) {
    return { label: "LIVE", modifier: "live" };
  }
  if (/finished|full.?time|final|ended|complete/i.test(status)) {
    return { label: "종료", modifier: "ended" };
  }
  return { label: "예정", modifier: "scheduled" };
}

function isLive(status = "") {
  return getGameStatus(status).modifier === "live";
}

function getLeague(id) {
  return SPORTS_LEAGUES.find((league) => league.id === id);
}

function getLeagueAbbreviation(league) {
  return league.shortName || league.id.toUpperCase().replace("KLEAGUE-", "K");
}

function SectionTitle({ id, title, action }) {
  return (
    <div className="sports-section__heading">
      <h2 id={id}>{title}</h2>
      {action}
    </div>
  );
}

function TeamCrest({ team }) {
  if (!team?.crest) return null;
  return <img src={team.crest} alt="" loading="lazy" />;
}

function SportsVideoCard({ card, badge, live = false }) {
  const league = card.competitionCode ? getLeague(card.competitionCode) : null;
  const category = card.category || league?.name || card.competitionName || "스포츠";
  const videoId = getYouTubeVideoId(card);
  const Card = videoId ? Link : "article";
  const playbackProps = videoId ? {
    to: `/watch/sports/${encodeURIComponent(videoId)}`,
    state: { title: card.title, returnTo: "/sports" },
    "aria-label": `${card.title} 재생`,
  } : {};

  return (
    <Card className={"sports-video-card" + (live ? " sports-video-card--live" : " sports-video-card--editorial")} {...playbackProps}>
      <div className="sports-video-card__media">
        <img src={card.image} alt="" loading="lazy" />
        {badge && (
          <span className={"sports-video-card__badge" + (live ? " is-live" : "")}>
            {live ? <span aria-hidden="true">●</span> : <span aria-hidden="true">▶</span>}
            {badge}
          </span>
        )}
        <span className="sports-video-card__play" aria-hidden="true" />
        {card.duration && (
          <span className="sports-video-card__duration">{card.duration}</span>
        )}
      </div>

      <div className="sports-video-card__details">
        {live && (
          <span className="sports-video-card__league-logo" aria-hidden="true">
            {league?.logoPath ? (
              <img src={league.logoPath} alt="" />
            ) : (
              <span>{getLeagueAbbreviation(league || { id: "live" })}</span>
            )}
          </span>
        )}
        <div className="sports-video-card__copy">
          <p className="sports-video-card__category">{category}</p>
          <h3>{card.title}</h3>
          {card.meta && (
            <p className="sports-video-card__meta">
              {card.meta}
              {card.rating ? " · ★ " + card.rating : ""}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function VideoSection({ id, title, cards, layout = "grid", badge }) {
  const gridClass =
    layout === "rail"
      ? "sports-video-grid sports-video-grid--rail"
      : "sports-video-grid";

  return (
    <section className="sports-section" aria-labelledby={id}>
      <SectionTitle id={id} title={title} />
      <div className={gridClass}>
        {cards.map((card, index) => (
          <SportsVideoCard
            key={card.title + "-" + index}
            card={card}
            badge={badge}
          />
        ))}
      </div>
    </section>
  );
}

function ScheduleMatch({ game, scoresOn, expanded, onToggle, relatedVideos }) {
  const navigate = useNavigate();
  const detailsId = useId();
  const status = getGameStatus(game.status);
  const isEnded = status.modifier === "ended";
  const playAction = status.modifier === "live";
  const hasRelatedVideos = Boolean(relatedVideos?.length);
  const isScheduled = status.modifier === "scheduled";
  const watchlist = useWatchlistStore((state) => state.watchlist);
  const ownerKey = useWatchlistStore((state) => state.ownerKey);
  const onAddWatchlist = useWatchlistStore((state) => state.onAddWatchlist);
  const onRemoveWatchlist = useWatchlistStore((state) => state.onRemoveWatchlist);
  const currentProfile = useProfileStore((state) => state.currentProfile);

  const [saving, setSaving] = useState(false);

  const matchId = game.gameId ?? game.id;

  const favoriteContent = {
    id: `${game.competitionCode || game.leagueId || "sports"}_${matchId}`,
    media_type: "sports",
    title: `${game.home?.name || "홈 팀"} vs ${game.away?.name || "원정 팀"}`,
    leagueId: game.competitionCode || game.leagueId || null,
    startTime: game.utcDate || game.startTime || null,
    homeName: game.home?.name || "홈 팀",
    awayName: game.away?.name || "원정 팀"
  };

  const currentOwnerKey =
    auth.currentUser && currentProfile
      ? `${auth.currentUser.uid}_${currentProfile.id}`
      : null;

  const isFavorite =
    ownerKey === currentOwnerKey &&
    watchlist.some(
      (item) =>
        item.media_type === "sports" &&
        String(item.id) === favoriteContent.id
    );

  const handleFavorite = async (event) => {
    event.stopPropagation();

    if (saving) return;

    if (!auth.currentUser || !currentProfile) {
      alert("로그인 후 프로필을 선택해 주세요.");
      return;
    }

    if (matchId == null) {
      alert("경기 ID가 없습니다.");
      return;
    }

    if (ownerKey !== currentOwnerKey) {
      alert("찜 목록을 불러온 후 다시 시도해 주세요.");
      return;
    }

    setSaving(true);

    try {
      const success = isFavorite
        ? await onRemoveWatchlist(favoriteContent)
        : await onAddWatchlist(favoriteContent);

      if (!success) {
        alert("찜하기 처리에 실패했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };
  const detailsExpanded = !playAction && expanded && (!isEnded || hasRelatedVideos);
  const liveVideoId = playAction ? getYouTubeVideoId({ videoId: game.videoId, url: game.broadcastUrl || game.videoUrl }) : "";
  const scheduleSubLabel = getScheduleSubLabel(game);
  const hasScore =
    scoresOn &&
    status.modifier !== "scheduled" &&
    game.home.score != null &&
    game.away.score != null;

  return (
    <div className={"sports-fixture-wrap" + (isEnded ? " sports-fixture-wrap--ended" : "") + (detailsExpanded ? " is-expanded" : "")}>
      <article className="sports-fixture">
        <div className="sports-fixture__status">
          {playAction ? (
            <LiveBadge label="라이브 경기" className="sports-fixture__live-badge" />
          ) : (
            <span className={"sports-status sports-status--" + status.modifier}>
              {status.label}
            </span>
          )}

          <span className="sports-quality">
            {game.quality || game.competitionCode || "경기"}
          </span>

          {isEnded && hasRelatedVideos && (
            <span className="sports-fixture__highlight-badge">
              하이라이트
            </span>
          )}
        </div>

        <div className="sports-fixture__team sports-fixture__team--home">
          <span>{game.home.name}</span>
          <TeamCrest team={game.home} />
        </div>

        <div className="sports-fixture__center">
          {hasScore ? (
            <div className="sports-fixture__score">
              <strong>{game.home.score}</strong>
              <span>
                {formatGameTime(game.utcDate || game.startTime)}
                {scheduleSubLabel && <small>{scheduleSubLabel}</small>}
              </span>
              <strong>{game.away.score}</strong>
            </div>
          ) : (
            <div className="sports-fixture__time">
              {/* <strong>VS</strong> */}
              <span>
                {formatGameTime(game.utcDate || game.startTime)}
                {scheduleSubLabel && <small>{scheduleSubLabel}</small>}
              </span>
            </div>
          )}
        </div>

        <div className="sports-fixture__team sports-fixture__team--away">
          <TeamCrest team={game.away} />
          <span>{game.away.name}</span>
        </div>
        {isScheduled && (
          <button
            type="button"
            className="sports-fixture__action sports-fixture__favorite-button"
            onClick={handleFavorite}
            disabled={saving || matchId == null}
            aria-label={isFavorite ? "경기 찜 해제" : "경기 찜하기"}
            aria-pressed={isFavorite}
            title={isFavorite ? "찜 해제" : "찜하기"}
          >
            <img
              className="sports-fixture__favorite-icon"
              src={`/images/sports/league-detail/schedule-${isFavorite ? "check" : "plus"}.svg`}
              alt=""
            />
          </button>
        )}
        {!isScheduled && (!isEnded || hasRelatedVideos) && (<button
          type="button"
          className={"sports-fixture__action" + (playAction ? " is-active" : "")}
          aria-label={playAction ? (liveVideoId ? "라이브 경기 재생" : "라이브 중계 미연결") : isEnded ? `${game.home.name} vs ${game.away.name} 관련 영상 ${detailsExpanded ? "접기" : "펼치기"}` : detailsExpanded ? "경기 정보 접기" : "경기 정보 펼치기"}
          aria-expanded={playAction ? undefined : detailsExpanded}
          aria-controls={detailsExpanded ? detailsId : undefined}
          disabled={playAction && !liveVideoId}
          title={playAction && !liveVideoId ? "아직 연결된 라이브 중계 영상이 없습니다." : undefined}
          onClick={playAction ? () => {
            if (liveVideoId) navigate(`/watch/sports/${encodeURIComponent(liveVideoId)}`, {
              state: { title: `${game.home.name} vs ${game.away.name} LIVE`, returnTo: "/sports" },
            });
          } : onToggle}
        >
          {playAction ? "▶" : (
            <img
              className="sports-fixture__expand-icon"
              src={isEnded ? "/images/sports/league-detail/schedule/related-collapse.svg" : "/images/sports/icon/sports-accordion-arrow.svg"}
              alt=""
              aria-hidden="true"
            />
          )}
        </button>)}
      </article>

      {detailsExpanded && (isEnded ? (
        <MatchRelatedVideos
          key={[game.gameId, game.utcDate || game.startTime, game.matchday, game.home.name, game.away.name].join(":")}
          game={game}
          id={detailsId}
          initialVideos={relatedVideos}
        />
      ) : (
        <div id={detailsId} className="sports-fixture__extra">
          <span>{game.competitionName || "리그 경기"}</span>
          <span>{game.stage || game.matchday ? game.stage || game.matchday + " 라운드" : "경기 정보"}</span>
          {game.venue && <span>{game.venue}</span>}
          {game.winnerName && <span>우승자 {game.winnerName}</span>}
          <span>한국 시간 {formatGameTime(game.utcDate || game.startTime)}</span>
        </div>
      ))}
    </div>
  );
}

export const Sports = () => {
  const navigate = useNavigate();
  const currentProfile = useProfileStore((state) => state.currentProfile);
  const onLoadWatchlist = useWatchlistStore((state) => state.onLoadWatchlist);

  useEffect(() => {
    if (auth.currentUser && currentProfile?.id) {
      onLoadWatchlist();
    }
  }, [currentProfile?.id, onLoadWatchlist]);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const canShowSubscriptions = Boolean(user && !authLoading);
  const {
  scrollRef: leagueScrollRef,
  isDragging: isLeagueDragging,
  onPointerDown: onLeaguePointerDown,
  onClickCapture: onLeagueClickCapture,
  onDragStart: onLeagueDragStart,
} = useHorizontalDragScroll();
  const featuredRailRef = useRef(null);
  const calendarRailRef = useRef(null);
  const scrollRail = (ref, direction) => {
    const element = ref.current;
    if (!element) return;
    const card = element.querySelector(":scope > *");
    const gap = parseFloat(getComputedStyle(element).gap) || 0;
    const step = card ? card.getBoundingClientRect().width + gap : 160;
    const count = Math.max(1, Math.floor(element.clientWidth / step));
    element.scrollBy({ left: direction * step * count, behavior: "smooth" });
  };
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState(readSelectedLeagueIds);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState(() => {
    try {
      const stored = window.localStorage.getItem(TEAM_SUBSCRIPTIONS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === "string" && VALID_SPORTS_TEAM_IDS.has(id))
        : [];
    } catch {
      return [];
    }
  });
  const [selectedDate, setSelectedDate] = useState(() => getSeoulDateKey());
  const [scoresOn, setScoresOn] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [expandedGameIds, setExpandedGameIds] = useState([]);
  const [liveState, setLiveState] = useState({
    games: [],
    loading: true,
    error: "",
  });
  const [scheduleState, setScheduleState] = useState({
    games: [],
    loading: true,
    errors: [],
  });
  const endedGames = scheduleState.games.filter(game => getGameStatus(game.status).modifier === "ended");
  const scheduleMatchVideos = useScheduleMatchVideos(endedGames, selectedDate);

  const visibleLeagues = useMemo(() => {
    if (activeCategory === "전체") return SPORTS_LEAGUES;
    if (activeCategory === "축구") {
      return SPORTS_LEAGUES.filter(
        (league) => league.sport === "축구" && league.scope === "국내",
      );
    }
    if (activeCategory === "해외축구") {
      return SPORTS_LEAGUES.filter(
        (league) => league.sport === "축구" && league.scope === "해외",
      );
    }
    return SPORTS_LEAGUES.filter((league) => league.sport === activeCategory);
  }, [activeCategory]);

  const featuredLeagues = useMemo(
    () =>
      [...new Set([...SPORTS_FEATURED_LEAGUE_IDS, "f1", "BL1", "nfl", "kleague-1", "FL1"])].map((id) => getLeague(id)).filter(Boolean),
    [],
  );

  const calendarDays = useMemo(
    () => Array.from({ length: 63 }, (_, index) => shiftDate(selectedDate, index - 31)),
    [selectedDate],
  );

  useEffect(() => {
    if (!SHOW_LIVE_SECTION) return;
    let isCurrent = true;

    async function loadLiveGames() {
      const [footballResult, nbaResult] = await Promise.allSettled([
        getFootballLiveMatches(),
        getNbaGamesForSeoulDate(getSeoulDateKey()),
      ]);

      if (!isCurrent) return;

      const liveGames = [];
      if (footballResult.status === "fulfilled") {
        footballResult.value
          .filter((game) => isLive(game.status))
          .forEach((game) => {
            liveGames.push({
              ...game,
              image:
                SPORTS_LIVE_POSTERS[game.competitionCode] ||
                SPORTS_LIVE_POSTERS.default,
              title: game.home.name + " vs " + game.away.name,
              category: game.competitionName || getLeague(game.competitionCode)?.name,
              meta: "LIVE · 경기 중",
              quality: "LIVE",
            });
          });
      }

      if (nbaResult.status === "fulfilled") {
        nbaResult.value
          .filter((game) => isLive(game.status))
          .forEach((game) => {
            liveGames.push({
              ...game,
              competitionCode: "nba",
              image: SPORTS_LIVE_POSTERS.nba,
              title: game.home.name + " vs " + game.away.name,
              category: "NBA",
              meta: "LIVE · " + (game.status || "경기 중"),
              quality: "LIVE",
            });
          });
      }

      const bothFailed =
        footballResult.status === "rejected" && nbaResult.status === "rejected";
      setLiveState({
        games: liveGames,
        loading: false,
        error: bothFailed
          ? "실시간 경기 정보를 불러오지 못했습니다."
          : "",
      });
    }

    loadLiveGames();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    let isLoading = false;

    async function loadSchedule() {
      if (isLoading) return;
      isLoading = true;
      setScheduleState((prev) => ({
      ...prev,
      loading: true,
      errors: [],
      }));
      const results = await Promise.allSettled([
        getFootballScheduleForDate(selectedDate),
        getNbaGamesForSeoulDate(selectedDate),
        getKleagueMatchesForDate(selectedDate),
        getF1RacesForDate(selectedDate),
      ]);
      isLoading = false;

      if (!isCurrent) return;

      const games = [];
      const errors = [];
      const providers = ["해외 축구·NFL", "NBA", "K리그", "F1"];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (index === 0) {
            games.push(...result.value.games);
            if (result.value.errors.length) {
              errors.push("해외 축구·NFL 일부 일정을 불러오지 못했습니다: " + result.value.errors.join(" · "));
            }
          } else {
            games.push(...result.value);
          }
          return;
        }

        errors.push(
          providers[index] + ": " +
          (result.reason?.message || "일정을 불러오지 못했습니다."),
        );
      });

      games.sort(
        (first, second) => {
          const livePriority = Number(isLive(second.status)) - Number(isLive(first.status));
          return livePriority ||
            new Date(first.utcDate || first.startTime) -
            new Date(second.utcDate || second.startTime);
        },
      );

      setScheduleState({ games, loading: false, errors });
    }

    loadSchedule();
    const refreshInterval = selectedDate === getSeoulDateKey()
      ? window.setInterval(loadSchedule, 60000)
      : null;

    return () => {
      isCurrent = false;
      if (refreshInterval != null) window.clearInterval(refreshInterval);
    };
  }, [selectedDate]);

  const openSettingsModal = () => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setIsSettingsModalOpen(true);
  };

  const toggleLeague = (league) => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSelectedLeagueIds((current) => {
      if (current.includes(league.id)) {
        return current.filter((leagueId) => leagueId !== league.id);
      }
      if (current.length >= 10) return current;
      return [...current, league.id];
    });
  };

  const toggleTeam = (teamId) => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSelectedTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : current.length < 10
          ? [...current, teamId]
          : current,
    );
  };

  const toggleExpandedGame = (gameId) => {
    setExpandedGameIds((current) =>
      current.includes(gameId)
        ? current.filter((id) => id !== gameId)
        : [...current, gameId],
    );
  };

  useEffect(() => {
    if (!canShowSubscriptions) return;
    try {
      window.localStorage.setItem(
        LEAGUE_SUBSCRIPTIONS_STORAGE_KEY,
        JSON.stringify(selectedLeagueIds),
      );
    } catch {
      // Keep the current selection in memory when local storage is unavailable.
    }
  }, [selectedLeagueIds, canShowSubscriptions]);

  useEffect(() => {
    if (!canShowSubscriptions) return;
    try {
      window.localStorage.setItem(
        TEAM_SUBSCRIPTIONS_STORAGE_KEY,
        JSON.stringify(selectedTeamIds),
      );
    } catch {
      // Continue without persistence when local storage is unavailable.
    }
  }, [selectedTeamIds, canShowSubscriptions]);

  const renderSchedule = () => {
    if (scheduleState.loading) {
      return (
        <p className="sports-data-message" role="status">
          {formatDateForNote(selectedDate)} 경기 정보를 불러오는 중입니다.
        </p>
      );
    }

    if (scheduleState.games.length === 0 && scheduleState.errors.length > 0) {
      return (
        <p className="sports-data-message sports-data-message--error" role="alert">
          경기 정보를 불러오지 못했습니다. {scheduleState.errors.join(" · ")}
        </p>
      );
    }

    if (scheduleState.games.length === 0) {
      return (
        <p className="sports-data-message">
          선택한 날짜에 예정된 경기가 없습니다.
        </p>
      );
    }

    return (
      <>
        {scheduleState.errors.length > 0 && (
          <p className="sports-data-message sports-data-message--error" role="status">
            일부 경기 정보를 불러오지 못했습니다. {scheduleState.errors.join(" · ")}
          </p>
        )}
        <div className="sports-fixtures">
          {(showAllSchedule ? scheduleState.games : scheduleState.games.slice(0, 10)).map((game) => (
            <ScheduleMatch
              key={game.gameId}
              game={{
                ...game,
                quality: game.competitionName || game.competitionCode,
              }}
              scoresOn={scoresOn}
              relatedVideos={scheduleMatchVideos[getMatchVideoKey(game)]}
              expanded={expandedGameIds.includes(game.gameId)}
              onToggle={() => toggleExpandedGame(game.gameId)}
            />
          ))}
        </div>
      </>
    );
  };

  useEffect(() => {
    const rail = calendarRailRef.current;
    if (!rail) return;
    const selected = Array.from(rail.querySelectorAll(".sports-calendar-day"))
      .find((item) => item.dataset.date === selectedDate);
    if (!selected) return;
    rail.scrollLeft = selected.offsetLeft - rail.offsetLeft - (rail.clientWidth - selected.offsetWidth) / 2;
  }, [selectedDate, calendarDays]);

  const changeSelectedDate = (amount) => {
    setSelectedDate((date) => shiftDate(date, amount));
    setExpandedGameIds([]);
    setShowAllSchedule(false);
  };

  return (
    <main className="sports-page">
      <SportsBanner />

      <section
        className="sports-section sports-section--leagues"
        aria-labelledby="sports-leagues-title"
      >
        <SectionTitle id="sports-leagues-title" title="스포츠 리그" />
        <div className="sports-league-controls">
          <div className="sports-category-tabs" role="group" aria-label="종목별 리그 필터">
            {SPORTS_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                className={activeCategory === category ? "is-active" : ""}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sports-outline-button"
            aria-expanded={isSettingsModalOpen}
            disabled={authLoading}
            onClick={openSettingsModal}
          >
            전체보기
          </button>
        </div>
        <div className="sports-league-list-wrap">
          <button
            type="button"
            className="sports-league-add"
            aria-label="관심 리그 선택"
            aria-expanded={isSettingsModalOpen}
            disabled={authLoading}
            onClick={openSettingsModal}
          >
            +
          </button>
          <div
            className={
              "sports-league-list" +
              (isLeagueDragging ? " is-dragging" : "")
            }
            ref={leagueScrollRef}
            tabIndex={0}
            aria-label="리그 목록"
            onPointerDown={onLeaguePointerDown}
            onClickCapture={onLeagueClickCapture}
            onDragStart={onLeagueDragStart}
          >
            {visibleLeagues.map((league) => {
              const selected = canShowSubscriptions && selectedLeagueIds.includes(league.id);
              return (
                <Link
                  key={league.id}
                  to={`/sports/league/${encodeURIComponent(league.id)}`}
                  className={
                    "sports-league-chip" +
                    (selected ? " is-selected" : "")
                  }
                  style={league.accent ? { "--sports-chip-color": league.accent } : undefined}
                  aria-label={league.name + " 상세 페이지"}
                >
                  {league.logoPath ? (
                    <img src={league.logoPath} alt="" loading="lazy" draggable={false} />
                  ) : (
                    <span className="sports-league-fallback" aria-hidden="true">
                      {getLeagueAbbreviation(league)}
                    </span>
                  )}
                  {selected && (
                    <span className="sports-league-chip__check">
                      <img src="/images/sports/icon/check_w.svg" alt="" draggable={false} />
                    </span>
                  )}
                  <span className="sr-only">{league.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/*
      <section
        className="sports-section sports-section--live"
        aria-labelledby="sports-live-title"
      >
        <SectionTitle id="sports-live-title" title="지금 방송 중" />
        {liveState.loading ? (
          <p className="sports-data-message" role="status">
            실시간 경기 정보를 불러오는 중입니다.
          </p>
        ) : liveState.games.length > 0 ? (
          <div className="sports-video-grid sports-video-grid--live">
            {liveState.games.slice(0, 4).map((game, index) => (
              <SportsVideoCard
                key={game.gameId || game.title + "-" + index}
                card={game}
                badge="LIVE"
                live
              />
            ))}
          </div>
        ) : (
          <p className="sports-data-message">
            {liveState.error || "현재 방송 중인 경기가 없습니다."}
          </p>
        )}
      </section>
      */}

      <section
        className="sports-section sports-section--main-leagues"
        aria-labelledby="sports-featured-title"
      >
        <SectionTitle id="sports-featured-title" title="주요 리그" />
        <div className="sports-rail-shell sports-rail-shell--featured">
          <button type="button" className="sports-rail-nav sports-rail-nav--prev" aria-label="이전 주요 리그" onClick={() => scrollRail(featuredRailRef, -1)}>‹</button>
          <div className="sports-featured-leagues" ref={featuredRailRef} tabIndex={0} aria-label="주요 리그 목록">
          {featuredLeagues.map((league) => (
            <article className="sports-featured-league" key={league.id}>
              <Link
                className="sports-featured-league__emblem"
                to={`/sports/league/${encodeURIComponent(league.id)}`}
                aria-label={`${league.name} 상세 페이지`}
              >
                <span className="sports-featured-league__logo">
                  {league.logoPath ? (
                    <img src={league.logoPath} alt="" loading="lazy" />
                  ) : (
                    <span>{getLeagueAbbreviation(league)}</span>
                  )}
                </span>
              </Link>
              <h3>{league.name}</h3>
              <p className="sports-featured-league__type">{league.sport} · {league.scope}</p>
              <p className="sports-featured-league__caption">경기 일정 · 하이라이트</p>
            </article>
          ))}
          </div>
          <button type="button" className="sports-rail-nav sports-rail-nav--next" aria-label="다음 주요 리그" onClick={() => scrollRail(featuredRailRef, 1)}>›</button>
        </div>
      </section>

      <section
        className="sports-section sports-section--schedule"
        aria-labelledby="sports-schedule-title"
      >
        <div className="sports-schedule-heading">
          <SectionTitle id="sports-schedule-title" title="오늘의 경기 일정" />
          <div className="sports-schedule-actions">
            {scheduleState.games.length > 10 && !scheduleState.loading && (
              <button type="button" className="sports-schedule-expand" aria-expanded={showAllSchedule} onClick={() => setShowAllSchedule((value) => !value)}>
                {showAllSchedule ? "접기" : `전체보기 (${scheduleState.games.length}경기)`}
              </button>
            )}
            <button
              type="button"
              className={"sports-score-toggle" + (scoresOn ? " is-on" : "")}
              aria-pressed={scoresOn}
              onClick={() => setScoresOn((value) => !value)}
            >
              점수 {scoresOn ? "ON" : "OFF"}
            </button>
          </div>
        </div>
        <p className="sports-schedule-note">
          {formatDateForNote(selectedDate)} 기준 · 한국 시간 (KST) · 축구, NFL, NBA, K리그, F1 일정
        </p>

        <div className="sports-calendar-month">
          <button
            type="button"
            className="sports-calendar-previous"
            aria-label="이전 날짜"
            onClick={() => changeSelectedDate(-1)}
          >
            ‹
          </button>
          <span className="sports-calendar-date">
            <strong>{formatMonth(selectedDate)}</strong>
            <img
              className="sports-calendar-icon"
              src="/images/icon/DesignSystem_Icon02/icon-calendar_month.svg"
              alt=""
              aria-hidden="true"
            />
          </span>
          <div className="sports-calendar-tools">
            <button
              type="button"
              className="sports-calendar-next"
              aria-label="다음 날짜"
              onClick={() => changeSelectedDate(1)}
            >
              ›
            </button>
            <button
              type="button"
              className="sports-calendar-recent"
              onClick={() => { setSelectedDate(getSeoulDateKey()); setShowAllSchedule(false); setExpandedGameIds([]); }}
            >
              최근
            </button>
          </div>
        </div>

        <div className="sports-rail-shell sports-rail-shell--calendar" role="group" aria-label="경기 날짜 선택">
          <button type="button" className="sports-rail-nav sports-rail-nav--prev" aria-label="이전 날짜 보기" onClick={() => changeSelectedDate(-1)}>‹</button>
          <div className="sports-calendar-days" ref={calendarRailRef} aria-label="선택 날짜를 중심으로 표시">
          {calendarDays.map((dateKey) => {
            const date = dateFromKey(dateKey);
            const weekday = WEEKDAYS[date.getUTCDay()];
            const beforeMonthStart = dateKey < selectedDate.slice(0, 7) + "-01";
            return (
              <button
                type="button"
                key={dateKey}
                data-date={dateKey}
                disabled={beforeMonthStart}
                aria-disabled={beforeMonthStart}
                className={
                  "sports-calendar-day" +
                  (selectedDate === dateKey ? " is-selected" : "") +
                  (beforeMonthStart ? " is-unavailable" : "")
                }
                aria-pressed={selectedDate === dateKey}
                onClick={() => { setSelectedDate(dateKey); setShowAllSchedule(false); setExpandedGameIds([]); }}
              >
                <span>{dateKey === getSeoulDateKey() ? "오늘" : weekday}</span>
                <strong>{date.getUTCDate()}</strong>
              </button>
            );
          })}
          </div>
          <button type="button" className="sports-rail-nav sports-rail-nav--next" aria-label="다음 날짜 보기" onClick={() => changeSelectedDate(1)}>›</button>
        </div>

        {renderSchedule()}
      </section>

      <VideoSection
        id="sports-highlights-title"
        title="스포츠 하이라이트"
        cards={SPORTS_HIGHLIGHTS}
        layout="rail"
        badge="하이라이트"
      />

      <VideoSection
        id="sports-together-title"
        title="지금, 함께 보는 경기"
        cards={SPORTS_TOGETHER}
        badge="추천 영상"
      />

      <aside className="sports-promo" aria-label="엘클라시코 경기 안내">
        <img
          src="/images/sports/campaign/el-clasico.png"
          alt="라리가 엘클라시코 바르셀로나와 레알 마드리드 경기 안내"
          loading="lazy"
        />
      </aside>

      <VideoSection
        id="sports-moments-title"
        title="스포츠의 모든 순간"
        cards={SPORTS_MOMENTS}
        badge="추천 영상"
      />

      <VideoSection
        id="sports-pass-title"
        title="스포츠 패스로 더 다양하게"
        cards={SPORTS_PASS_CONTENT}
        badge="추천 영상"
      />

      <VideoSection
        id="sports-recommendations-title"
        title="스포츠 팬을 위한 추천"
        cards={SPORTS_RECOMMENDATIONS}
        badge="추천 영상"
      />

      <aside className="sports-nba-banner" aria-label="NBA 정규 시즌 안내">
        <img
          src="/images/sports/campaign/nba-season.png"
          alt="8년 연속 바뀐 왕좌, 새 시즌의 시작. NBA 정규 시즌 시청하기"
          loading="lazy"
        />
      </aside>

      <VideoSection
        id="sports-replays-title"
        title="주요 경기 다시보기"
        cards={SPORTS_REPLAYS}
        badge="추천 영상"
      />

      <SportsSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        selectedLeagueIds={canShowSubscriptions ? selectedLeagueIds : []}
        onToggleLeague={toggleLeague}
        onReorderLeagues={(ids) => { if (canShowSubscriptions) setSelectedLeagueIds(ids); }}
        selectedTeamIds={canShowSubscriptions ? selectedTeamIds : []}
        onToggleTeam={toggleTeam}
        onReorderTeams={(ids) => { if (canShowSubscriptions) setSelectedTeamIds(ids); }}
      />
    </main>
  );
};

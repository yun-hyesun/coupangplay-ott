import { useEffect, useMemo, useState } from "react";
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
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll";
import { SPORTS_TEAMS_BY_LEAGUE } from "../../data/sportsTeams";
import { getF1RacesForDate } from "../../service/f1Service";
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

function formatMatchday(matchday) {
  const value = String(matchday ?? "").trim();
  const round = /^\d+$/.test(value)
    ? value
    : value.match(/(?:regular season|matchday|round|week)\s*[-:#]?\s*(\d+)/i)?.[1];
  return round ? `${round}라운드` : "";
}

function getBasketballScheduleLabel(game) {
  return game.scheduleSegment || "";
}

function getScheduleSubLabel(game) {
  return game.competitionCode === "nba"
    ? getBasketballScheduleLabel(game)
    : game.scheduleSegment || formatMatchday(game.matchday);
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

  return (
    <article className={"sports-video-card" + (live ? " sports-video-card--live" : " sports-video-card--editorial")}>
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
    </article>
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

function ScheduleMatch({ game, scoresOn, expanded, onToggle }) {
  const status = getGameStatus(game.status);
  const scheduleSubLabel = getScheduleSubLabel(game);
  const hasScore =
    scoresOn &&
    status.modifier !== "scheduled" &&
    game.home.score != null &&
    game.away.score != null;

  return (
    <div className={"sports-fixture-wrap" + (expanded ? " is-expanded" : "")}>
      <article className="sports-fixture">
        <div className="sports-fixture__status">
          <span className={"sports-status sports-status--" + status.modifier}>
            {status.label}
          </span>
          <span className="sports-quality">
            {game.quality || game.competitionCode || "경기"}
          </span>
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

        <button
          type="button"
          className={"sports-fixture__action" + (status.modifier === "live" ? " is-active" : "")}
          aria-label={expanded ? "경기 정보 접기" : "경기 정보 펼치기"}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {status.modifier === "live" ? "▶" : (
            <img
              className="sports-fixture__expand-icon"
              src="/images/sports/icon/sports-accordion-arrow.svg"
              alt=""
              aria-hidden="true"
            />
          )}
        </button>
      </article>

      {expanded && (
        <div className="sports-fixture__extra">
          <span>{game.competitionName || "리그 경기"}</span>
          <span>{game.stage || game.matchday ? game.stage || game.matchday + " 라운드" : "경기 정보"}</span>
          {game.venue && <span>{game.venue}</span>}
          {game.winnerName && <span>우승자 {game.winnerName}</span>}
          <span>한국 시간 {formatGameTime(game.utcDate || game.startTime)}</span>
        </div>
      )}
    </div>
  );
}

export const Sports = () => {
  const leagueListDrag = useHorizontalDragScroll();
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
      SPORTS_FEATURED_LEAGUE_IDS.map((id) => getLeague(id)).filter(Boolean),
    [],
  );

  const calendarDays = useMemo(
    () =>
      Array.from({ length: 13 }, (_, index) =>
        shiftDate(selectedDate, index - 6),
      ),
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
    setScheduleState({ games: [], loading: true, errors: [] });

    async function loadSchedule() {
      if (isLoading) return;
      isLoading = true;
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
        (first, second) =>
          new Date(first.utcDate || first.startTime) -
          new Date(second.utcDate || second.startTime),
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

  const toggleLeague = (league) => {
    setSelectedLeagueIds((current) => {
      if (current.includes(league.id)) {
        return current.filter((leagueId) => leagueId !== league.id);
      }
      if (current.length >= 10) return current;
      return [...current, league.id];
    });
  };

  const toggleTeam = (teamId) => {
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
    try {
      window.localStorage.setItem(
        LEAGUE_SUBSCRIPTIONS_STORAGE_KEY,
        JSON.stringify(selectedLeagueIds),
      );
    } catch {
      // Keep the current selection in memory when local storage is unavailable.
    }
  }, [selectedLeagueIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TEAM_SUBSCRIPTIONS_STORAGE_KEY,
        JSON.stringify(selectedTeamIds),
      );
    } catch {
      // Continue without persistence when local storage is unavailable.
    }
  }, [selectedTeamIds]);

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
          {scheduleState.games.map((game) => (
            <ScheduleMatch
              key={game.gameId}
              game={{
                ...game,
                quality: game.competitionName || game.competitionCode,
              }}
              scoresOn={scoresOn}
              expanded={expandedGameIds.includes(game.gameId)}
              onToggle={() => toggleExpandedGame(game.gameId)}
            />
          ))}
        </div>
      </>
    );
  };

  const changeSelectedDate = (amount) => {
    setSelectedDate((date) => shiftDate(date, amount));
    setExpandedGameIds([]);
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
            onClick={() => setIsSettingsModalOpen(true)}
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
            onClick={() => setIsSettingsModalOpen(true)}
          >
            +
          </button>
          <div
            className={
              "sports-league-list" +
              (leagueListDrag.isDragging ? " is-dragging" : "")
            }
            ref={leagueListDrag.scrollRef}
            tabIndex={0}
            aria-label="리그 목록"
            onPointerDown={leagueListDrag.onPointerDown}
            onClickCapture={leagueListDrag.onClickCapture}
            onDragStart={leagueListDrag.onDragStart}
          >
            {visibleLeagues.map((league) => {
              const selected = selectedLeagueIds.includes(league.id);
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
        <div className="sports-featured-leagues">
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
              <p>경기 일정과 영상 보기</p>
              <Link
                to={`/sports/league/${encodeURIComponent(league.id)}`}
              >
                리그 둘러보기 <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section
        className="sports-section sports-section--schedule"
        aria-labelledby="sports-schedule-title"
      >
        <div className="sports-schedule-heading">
          <SectionTitle id="sports-schedule-title" title="오늘의 경기 일정" />
          <div className="sports-schedule-actions">
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
              onClick={() => setSelectedDate(getSeoulDateKey())}
            >
              최근
            </button>
          </div>
        </div>

        <div className="sports-calendar-days" role="group" aria-label="경기 날짜 선택">
          <button
            type="button"
            className="sports-calendar-days__arrow"
            aria-label="이전 주"
            onClick={() => changeSelectedDate(-7)}
          >
            ‹
          </button>
          {calendarDays.map((dateKey) => {
            const date = dateFromKey(dateKey);
            const weekday = WEEKDAYS[date.getUTCDay()];
            return (
              <button
                type="button"
                key={dateKey}
                className={
                  "sports-calendar-day" +
                  (selectedDate === dateKey ? " is-selected" : "")
                }
                aria-pressed={selectedDate === dateKey}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span>{dateKey === getSeoulDateKey() ? "오늘" : weekday}</span>
                <strong>{date.getUTCDate()}</strong>
              </button>
            );
          })}
          <button
            type="button"
            className="sports-calendar-days__arrow"
            aria-label="다음 주"
            onClick={() => changeSelectedDate(7)}
          >
            ›
          </button>
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
        selectedLeagueIds={selectedLeagueIds}
        onToggleLeague={toggleLeague}
        onReorderLeagues={setSelectedLeagueIds}
        selectedTeamIds={selectedTeamIds}
        onToggleTeam={toggleTeam}
        onReorderTeams={setSelectedTeamIds}
      />
    </main>
  );
};

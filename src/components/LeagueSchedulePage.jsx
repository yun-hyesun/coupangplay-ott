import { useEffect, useId, useMemo, useRef, useState } from "react";
import { findLeagueTeam, formatGameDate, formatGameTime, getGameStatus, TeamImage } from "./LeagueDetailShared";
import { MatchRelatedVideos } from "./MatchRelatedVideos";
import { SportsCalendarDialog, SportsCalendarNavButton } from "./SportsCalendarDialog";
import { findScheduleMatch, getCalendarDays, getRecentScheduleGame, getRoundWindow, getScheduleDateWindow, getScheduleRounds, getScheduleSeason, getSeasonRange, groupScheduleGames } from "../data/leagueScheduleView";
import { getScheduleGameDate } from "../data/leagueScheduleRange";
import { getScheduleUnit } from "../data/leagueScheduleUnits";
import { getMatchVideoKey } from "../data/matchRelatedVideos";
import { useScheduleMatchVideos } from "../hooks/useScheduleMatchVideos";
import { getLeagueSeasonSchedule } from "../service/leagueScheduleService";
import { findSportsTeam } from "../data/sportsTeams";
import { auth } from "../firebase/firebase";
import { useAuthStore } from "../store/useAuthStore";
import { useProfileStore } from "../store/useProfileStore";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { Link } from "react-router-dom";
import { getSportsLiveWatchDestination } from "../page/watch/watchMedia";
import "./scss/LeagueSchedulePage.scss";

const ASSETS = "/images/sports/league-detail/schedule/";
const EMPTY_GAMES = [];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ScheduleArrow({ direction = "next" }) {
  return direction === "previous"
    ? <span className="league-schedule__previous" aria-hidden="true"><img src={ASSETS + "previous.svg"} alt="" /></span>
    : <img src={ASSETS + "next.svg"} alt="" aria-hidden="true" />;
}

function getScheduleWatchlistContent(game, league) {
  const homeName = game.raceName || game.home?.name || "홈 팀";
  const awayName = game.raceName ? "그랑프리" : game.away?.name || "원정 팀";
  return {
    id: `${league.id}_${game.gameId ?? game.id}`,
    media_type: "sports",
    title: game.raceName || `${homeName} vs ${awayName}`,
    leagueId: league.id,
    sport: league.sport,
    startTime: game.utcDate || game.startTime || null,
    homeName,
    awayName,
    homeTeamId: game.home?.teamId ?? game.home?.id ?? null,
    awayTeamId: game.away?.teamId ?? game.away?.id ?? null,
    homeLogo: game.home?.crest || game.home?.logoPath || null,
    awayLogo: game.away?.crest || game.away?.logoPath || null,
    thumbnail: game.broadcastThumbnail || game.thumbnail || null,
    raceName: game.raceName || null,
  };
}

function findWatchlistedMatch(watchlist, game, leagueId) {
  const contentId = `${leagueId}_${game.gameId ?? game.id}`;
  return watchlist.find(item => item.media_type === "sports" && String(item.id) === contentId)
    || watchlist.find(item => item.media_type === "sports" && item.leagueId === leagueId && findScheduleMatch([game], {
      utcDate: item.startTime,
      home: { id: item.homeTeamId, name: item.homeName },
      away: { id: item.awayTeamId, name: item.awayName },
      raceName: item.raceName || (leagueId === "f1" ? item.homeName || item.title : undefined),
    }, leagueId)) || null;
}

function ScheduleCalendar({ date, today, leagueId, games, season, loading, hasError, onSelect, onClose }) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const [seasonResults, setSeasonResults] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [year, number] = month.split("-").map(Number);
  const days = getCalendarDays(month);
  const seasons = [...new Set(days.map(day => getScheduleSeason(leagueId, day)))];
  const extraSeasons = seasons.filter(value => value !== season);
  const requestKey = JSON.stringify([leagueId, extraSeasons, attempt]);
  const daysWithGames = new Set(seasons.flatMap(value => value === season ? games : seasonResults[`${leagueId}:${value}`]?.games || [])
    .map(getScheduleGameDate).filter(Boolean));
  const calendarLoading = seasons.includes(season) && loading || extraSeasons.some(value => !seasonResults[`${leagueId}:${value}`]);
  const calendarError = seasons.includes(season) && hasError || extraSeasons.some(value => seasonResults[`${leagueId}:${value}`]?.error);
  const currentYear = Number(today.slice(0, 4));
  const shiftMonth = offset => setMonth(new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7));
  useEffect(() => {
    const controller = new AbortController();
    const [calendarLeagueId, requiredSeasons, retry] = JSON.parse(requestKey);
    requiredSeasons.forEach(value => {
      const key = `${calendarLeagueId}:${value}`;
      getLeagueSeasonSchedule(calendarLeagueId, value, { signal: controller.signal, force: retry > 0 }).then(data => {
        if (!controller.signal.aborted) setSeasonResults(previous => ({ ...previous, [key]: {
          games: data.games, error: data.errors.length > 0 || Boolean(data.warning),
        } }));
      }).catch(() => {
        if (!controller.signal.aborted) setSeasonResults(previous => ({ ...previous, [key]: { games: [], error: true } }));
      });
    });
    return () => controller.abort();
  }, [requestKey]);

  return (
    <SportsCalendarDialog label="경기 일정 날짜 선택" onClose={onClose}>
        <div className="sports-calendar__heading">
          <SportsCalendarNavButton previous label="달력 이전 달" disabled={month <= "2010-01"} onClick={() => shiftMonth(-1)} />
          <div className="sports-calendar__month">
            <select aria-label="달력 연도" value={year} onChange={event => setMonth(`${event.target.value}-${String(number).padStart(2, "0")}`)}>
              {Array.from({ length: currentYear - 2010 + 2 }, (_, index) => currentYear + 1 - index).map(value => <option key={value} value={value}>{value}년</option>)}
            </select>
            <select aria-label="달력 월" value={number} onChange={event => setMonth(`${year}-${event.target.value.padStart(2, "0")}`)}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}월</option>)}
            </select>
          </div>
          <SportsCalendarNavButton label="달력 다음 달" disabled={month >= `${currentYear + 1}-12`} onClick={() => shiftMonth(1)} />
        </div>
        <p className="sports-calendar__notice" role="status">
          {calendarLoading ? "경기 일정이 있는 날짜를 확인하고 있습니다." : calendarError ? "일부 일정을 확인하지 못했습니다. 확인된 경기 날짜만 선택할 수 있습니다." : "경기가 있는 날짜만 선택할 수 있습니다."}
          {calendarError && extraSeasons.some(value => seasonResults[`${leagueId}:${value}`]?.error) && <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button>}
        </p>
        <div className="sports-calendar__grid" aria-busy={calendarLoading}>
          {WEEKDAYS.map(day => <span className="sports-calendar__weekday" key={day}>{day}</span>)}
          {days.map(day => {
            const hasGames = daysWithGames.has(day);
            return <button type="button" key={day} disabled={!hasGames} aria-label={`${day}, ${hasGames ? "경기 있음" : "선택 불가"}`} aria-pressed={hasGames && day === date}
              aria-current={day === today ? "date" : undefined} className={(day.slice(0, 7) !== month ? "is-outside " : "") + (hasGames ? "has-games" : "")}
              onClick={() => { if (hasGames) { onSelect(day, getScheduleSeason(leagueId, day)); onClose(); } }}>{Number(day.slice(-2))}</button>;
          })}
        </div>
    </SportsCalendarDialog>
  );
}

function ScheduleMatchRow({ game, league, scoresOn, selectedTeamIds, saved, saving = false, onToggleSaved, relatedVideos, focused = false, autoExpand = false }) {
  const detailsId = useId();
  const matchRef = useRef(null);
  const [expanded, setExpanded] = useState(autoExpand);
  const status = getGameStatus(game.status);
  const hasRelatedVideos = status.type === "ended" && Boolean(relatedVideos?.length);
  const canExpand = status.type === "ended" && (hasRelatedVideos || saved || focused || autoExpand);
  const detailsExpanded = canExpand && expanded;
  const unit = getScheduleUnit(game);
  const isMyTeam = (team) => {
    if (!team) return false;
    const localTeam = findSportsTeam(league.id, team) || findLeagueTeam(league.id, team);
    return selectedTeamIds.includes(team.id) || selectedTeamIds.includes(localTeam?.id);
  };
  const homeIsMyTeam = isMyTeam(game.home);
  const awayIsMyTeam = isMyTeam(game.away);
  const homeScore = game.home?.score ?? null;
  const awayScore = game.away?.score ?? null;
  const quality = ["4K", "HDR"].includes(game.broadcastQuality) ? game.broadcastQuality : "";
  const homeName = game.raceName || game.home?.name || "홈 팀";
  const awayName = game.raceName ? (game.venue || "그랑프리") : game.away?.name || "원정 팀";
  const title = `${homeName} vs ${awayName}`;
  const liveDestination = getSportsLiveWatchDestination(game, { leagueId: league.id, returnTo: `/sports/league/${league.id}`, returnTab: "schedule" });
  useEffect(() => {
    if (!focused) return undefined;
    const scrollToMatch = () => {
      matchRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      matchRef.current?.querySelector("article")?.focus({ preventScroll: true });
    };
    let settledFrame;
    const frame = window.requestAnimationFrame(() => {
      scrollToMatch();
      settledFrame = window.requestAnimationFrame(scrollToMatch);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(settledFrame);
    };
  }, [focused]);
  return (
    <div ref={matchRef} className="league-schedule__match-wrap" data-expanded={detailsExpanded || undefined} data-focused-match={focused || undefined}>
    <article className="league-schedule__match" tabIndex={focused ? -1 : undefined} data-match-status={status.type} data-my-team-home={homeIsMyTeam || undefined} data-my-team-away={awayIsMyTeam || undefined} aria-label={`${title}, ${status.label}`}>
      <div className="league-schedule__badges">
        <span className={`league-schedule__badge league-schedule__badge--${status.type}`}>
          {status.type === "live" && <img src={ASSETS + "live.svg"} alt="" />} {status.label}
        </span>
        {quality && <span className="league-schedule__quality">{quality}</span>}
        {hasRelatedVideos && <span className="league-schedule__badge league-schedule__badge--video">관련 영상</span>}
      </div>
      <div className="league-schedule__matchup">
        <div className="league-schedule__team league-schedule__team--home"><span title={homeName}>{homeName}</span><TeamImage team={game.home} leagueId={league.id} /></div>
        <div className="league-schedule__center">
          <strong className="league-schedule__score" aria-label={scoresOn && homeScore != null ? `홈 ${homeScore}점` : undefined}>{scoresOn ? homeScore ?? "" : ""}</strong>
          <div className="league-schedule__time"><time dateTime={game.utcDate || game.startTime}>{formatGameTime(game.utcDate || game.startTime)}</time><span>{unit?.label || game.stage || league.name}</span></div>
          <strong className="league-schedule__score league-schedule__score--away" aria-label={scoresOn && awayScore != null ? `원정 ${awayScore}점` : undefined}>{scoresOn ? awayScore ?? "" : ""}</strong>
        </div>
        <div className="league-schedule__team league-schedule__team--away">{!game.raceName && <TeamImage team={game.away} leagueId={league.id} />}<span title={awayName}>{awayName}</span></div>
      </div>
      <div className="league-schedule__actions">
        {status.type === "scheduled" ? <button type="button" className="league-schedule__action" aria-label={`${title} 경기 ${saved ? "찜 해제" : "찜하기"}`} aria-pressed={saved} disabled={saving || (game.gameId ?? game.id) == null} onClick={() => onToggleSaved(game)}>
          <img src={ASSETS + (saved ? "check.svg" : "plus.svg")} alt="" />
        </button> : status.type === "live" ? <Link className="league-schedule__action is-live" {...liveDestination} aria-label={`${title} LIVE 화면으로 이전 경기 영상 보기`}><img src={ASSETS + "play.svg"} alt="" /></Link>
          : canExpand && <button type="button" className="league-schedule__action league-schedule__action--expand" onClick={() => setExpanded(value => !value)}
            aria-label={`${title} 관련 영상 ${detailsExpanded ? "접기" : "펼치기"}`} aria-expanded={detailsExpanded} aria-controls={detailsExpanded ? detailsId : undefined}>
            <img src={ASSETS + "related-collapse.svg"} alt="" />
          </button>}
      </div>
    </article>
    {detailsExpanded && <MatchRelatedVideos game={game} id={detailsId} initialVideos={relatedVideos} returnTab="schedule" />}
    </div>
  );
}

export function LeagueSchedulePage({ league, scoresOn, today, selectedTeams = [], initialMatch = null, expandInitialMatch = true }) {
  const user = useAuthStore(state => state.user);
  const authLoading = useAuthStore(state => state.loading);
  const currentProfile = useProfileStore(state => state.currentProfile);
  const { watchlist, ownerKey, loading: watchlistLoading, onLoadWatchlist } = useWatchlistStore();
  const currentUid = auth.currentUser?.uid || user?.uid;
  const currentOwnerKey = currentUid && currentProfile?.id ? `${currentUid}_${currentProfile.id}` : null;
  const isCurrentWatchlist = Boolean(!authLoading && currentOwnerKey && ownerKey === currentOwnerKey);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const currentSeason = getScheduleSeason(league.id, today);
  const initialDate = initialMatch && getScheduleGameDate(initialMatch);
  const initialSeason = initialDate ? getScheduleSeason(league.id, initialDate) : currentSeason;
  const [season, setSeason] = useState(initialSeason);
  const [mode, setMode] = useState(initialMatch ? "date" : "round");
  const [selection, setSelection] = useState(null);
  const [followingInitialMatch, setFollowingInitialMatch] = useState(Boolean(initialMatch));
  const [roundOffset, setRoundOffset] = useState(0);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const key = `${league.id}:${season}:${attempt}`;
  const loading = result?.key !== key;
  const scheduleGames = loading ? EMPTY_GAMES : result.games;
  const focusedGame = useMemo(() => followingInitialMatch && initialMatch ? findScheduleMatch(scheduleGames, initialMatch, league.id) || (initialDate && initialMatch.status ? initialMatch : null) : null,
    [scheduleGames, initialMatch, initialDate, league.id, followingInitialMatch]);
  const games = useMemo(() => focusedGame && !scheduleGames.includes(focusedGame) ? [...scheduleGames, focusedGame] : scheduleGames,
    [scheduleGames, focusedGame]);
  const rounds = useMemo(() => getScheduleRounds(games), [games]);
  const recentGame = useMemo(() => getRecentScheduleGame(games, today), [games, today]);
  const currentSelection = selection?.season === season ? selection : null;
  const initialGameDate = followingInitialMatch ? getScheduleGameDate(focusedGame || {}) || initialDate : null;
  const round = currentSelection?.round || getScheduleUnit(followingInitialMatch && focusedGame || recentGame || {})?.value || rounds[0]?.value || "";
  const requestedDate = currentSelection?.date || initialGameDate || (season === currentSeason ? today : getScheduleGameDate(recentGame || {}) || getSeasonRange(league.id, season).from);
  const dateWindow = useMemo(() => getScheduleDateWindow(games, requestedDate), [games, requestedDate]);
  const dateKey = initialGameDate && !currentSelection ? initialGameDate : dateWindow.selectedDate || requestedDate;
  const dateOnly = !loading && games.length > 0 && !rounds.length;
  const viewMode = dateOnly ? "date" : mode;
  const roundWindow = getRoundWindow(rounds, round, roundOffset);
  const groups = useMemo(() => groupScheduleGames(games, { mode: viewMode, dateKey, round }).map(group => ({
    ...group, matches: group.matches.map(game => ({ ...game, competitionCode: league.id, competitionName: league.name })),
  })), [games, viewMode, dateKey, round, league.id, league.name]);
  const endedGames = groups.flatMap(group => group.matches).filter(game => getGameStatus(game.status).type === "ended");
  const scheduleMatchVideos = useScheduleMatchVideos(endedGames, `${key}:${viewMode}:${dateKey}:${round}`);
  const selectedTeamIds = selectedTeams.map(team => team.id);
  const seasonRange = getSeasonRange(league.id, season);
  const label = viewMode === "round" ? seasonRange.label : `${Number(dateKey.slice(0, 4))}년 ${Number(dateKey.slice(5, 7))}월`;

  useEffect(() => {
    const controller = new AbortController();
    getLeagueSeasonSchedule(league.id, season, { signal: controller.signal, force: attempt > 0 }).then(data => {
      if (!controller.signal.aborted) setResult({ ...data, key });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, games: [], errors: [error.message || "경기 일정을 불러오지 못했습니다."] });
    });
    return () => controller.abort();
  }, [league.id, season, attempt, key]);

  useEffect(() => {
    if (authLoading || !auth.currentUser || !currentOwnerKey) return;
    if (useWatchlistStore.getState().ownerKey !== currentOwnerKey) onLoadWatchlist();
  }, [authLoading, currentOwnerKey, onLoadWatchlist]);

  function selectDate(date, year = getScheduleSeason(league.id, date)) {
    setFollowingInitialMatch(false);
    const game = games.find(game => getScheduleGameDate(game) === date);
    setSeason(year);
    setSelection({ season: year, date, round: year === season ? getScheduleUnit(game || {})?.value || round : "" });
    setRoundOffset(0);
    if (viewMode === "round" && !game) setMode("date");
  }

  function shiftPeriod(offset) {
    setFollowingInitialMatch(false);
    if (viewMode === "round") { setSeason(value => value + offset); setSelection(null); setRoundOffset(0); }
    else {
      const date = new Date(`${dateKey}T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + offset, 1);
      selectDate(date.toISOString().slice(0, 10));
    }
  }

  async function toggleSaved(game) {
    if (savingRef.current) return;
    const user = auth.currentUser;
    const profile = useProfileStore.getState().currentProfile;
    if (!user?.uid || !profile?.id) {
      alert("로그인 후 프로필을 선택해 주세요.");
      return;
    }
    if ((game.gameId ?? game.id) == null) return;

    const expectedOwnerKey = `${user.uid}_${profile.id}`;
    savingRef.current = true;
    setSaving(true);
    try {
      if (useWatchlistStore.getState().ownerKey !== expectedOwnerKey) await onLoadWatchlist();
      if (auth.currentUser?.uid !== user.uid || useProfileStore.getState().currentProfile?.id !== profile.id) return;
      const store = useWatchlistStore.getState();
      if (store.ownerKey !== expectedOwnerKey) {
        alert("찜 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const savedItem = findWatchlistedMatch(store.watchlist, game, league.id);
      const success = savedItem
        ? await store.onRemoveWatchlist(savedItem)
        : await store.onAddWatchlist(getScheduleWatchlistContent(game, league));
      if (!success) alert("찜 목록을 변경하지 못했습니다. 다시 시도해 주세요.");
    } catch {
      alert("찜 목록을 변경하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="league-schedule" aria-labelledby="league-schedule-page-title">
      <h2 className="league-schedule__sr-only" id="league-schedule-page-title">{league.name} 경기 일정</h2>
      <div className="league-schedule__toolbar">
        <div className="league-schedule__modes" role="group" aria-label="경기 일정 조회 방식">
          <button type="button" aria-pressed={viewMode === "date"} onClick={() => setMode("date")}>날짜별</button>
          <button type="button" aria-pressed={viewMode === "round"} disabled={dateOnly} onClick={() => setMode("round")}>라운드별</button>
        </div>
        <div className="league-schedule__period">
          <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "이전 시즌" : "이전 달"} disabled={season <= 2010} onClick={() => shiftPeriod(-1)}><ScheduleArrow direction="previous" /></button>
          <h3 aria-live="polite">{label}</h3>
          <button className="league-schedule__icon-button" type="button" aria-label="경기 날짜 선택" aria-haspopup="dialog" onClick={() => setCalendarOpen(true)}><img src={ASSETS + "calendar.svg"} alt="" /></button>
          <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "다음 시즌" : "다음 달"} disabled={season > currentSeason} onClick={() => shiftPeriod(1)}><ScheduleArrow /></button>
        </div>
        <div className="league-schedule__recent-wrap"><button className="league-schedule__recent" type="button" onClick={() => { setFollowingInitialMatch(false); setSeason(currentSeason); setSelection(null); setRoundOffset(0); }}>최근</button></div>
      </div>
      <div className="league-schedule__selector" role="group" aria-label={viewMode === "round" ? "라운드 선택" : "날짜 선택"}>
        <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "이전 라운드 묶음" : "이전 경기 날짜 묶음"} disabled={viewMode === "round" ? !roundWindow.hasPrevious : !dateWindow.hasPrevious}
          onClick={() => viewMode === "round" ? setRoundOffset(value => value - 5) : dateWindow.previousDate && selectDate(dateWindow.previousDate)}><ScheduleArrow direction="previous" /></button>
        <div className="league-schedule__options">
          {viewMode === "round" ? (roundWindow.items.length ? roundWindow.items.map(option => <button type="button" key={option.value} aria-label={option.label} aria-pressed={round === option.value}
            onClick={() => { setFollowingInitialMatch(false); setSelection({ season, date: dateKey, round: option.value }); setRoundOffset(0); }}><strong>{option.kind === "round" ? `${option.number}R` : option.label}</strong><span>{option.kind === "round" ? "정규 리그" : "경기 일정"}</span></button>)
            : <span className="league-schedule__selector-loading">{loading ? "경기 라운드를 불러오는 중입니다." : "조회된 라운드가 없습니다."}</span>)
            : dateWindow.items.length ? dateWindow.items.map(date => <button type="button" key={date} aria-label={date} aria-pressed={date === dateKey} aria-current={date === today ? "date" : undefined} onClick={() => selectDate(date)}>
              <strong>{Number(date.slice(-2))}</strong><span>{date === today ? "오늘" : WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]}</span></button>)
              : <span className="league-schedule__selector-loading">{loading ? "경기 날짜를 불러오는 중입니다." : "조회된 경기 날짜가 없습니다."}</span>}
        </div>
        <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "다음 라운드 묶음" : "다음 경기 날짜 묶음"} disabled={viewMode === "round" ? !roundWindow.hasNext : !dateWindow.hasNext}
          onClick={() => viewMode === "round" ? setRoundOffset(value => value + 5) : dateWindow.nextDate && selectDate(dateWindow.nextDate)}><ScheduleArrow /></button>
      </div>
      <p className="league-schedule__timezone">한국시간 기준</p>
      <div className="league-schedule__results" aria-busy={loading}>
        {loading ? <div className="league-schedule__loading" role="status"><span className="league-schedule__sr-only">경기 일정을 불러오는 중입니다.</span>{[0, 1, 2].map(index => <div key={index} />)}</div>
          : groups.map(group => <section className="league-schedule__date-group" key={group.date} aria-label={group.date}>
            <h3><time dateTime={group.date}>{formatGameDate(`${group.date}T00:00:00+09:00`)}</time></h3>
            {group.matches.map(game => {
              const focused = Boolean(followingInitialMatch && focusedGame && String(game.gameId) === String(focusedGame.gameId));
              const saved = isCurrentWatchlist && Boolean(findWatchlistedMatch(watchlist, game, league.id));
              return <ScheduleMatchRow key={game.gameId} game={game} league={league} scoresOn={scoresOn} selectedTeamIds={selectedTeamIds} saved={saved} saving={authLoading || watchlistLoading || saving} onToggleSaved={toggleSaved} relatedVideos={scheduleMatchVideos[getMatchVideoKey(game)]} focused={focused} autoExpand={focused && expandInitialMatch} />;
            })}
          </section>)}
        {!loading && !groups.length && <p className="league-schedule__empty" role="status">{result.errors.length ? "경기 일정을 불러오지 못했습니다." : "선택한 조건에 등록된 경기가 없습니다."}</p>}
        {!loading && followingInitialMatch && !focusedGame && <p className="league-schedule__empty" role="status">선택한 경기의 최신 일정을 찾지 못했습니다. 경기 일정이 변경되었거나 아직 공개되지 않았을 수 있습니다.</p>}
        {!loading && (result.errors.length > 0 || result.warning) && <div className="league-schedule__error" role="status"><p>{result.warning || (games.length ? "일부 경기 일정을 불러오지 못했습니다." : "현재 경기 일정을 확인할 수 없습니다. 잠시 후 다시 조회해 주세요.")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></div>}
      </div>
      {calendarOpen && <ScheduleCalendar date={dateKey} today={today} leagueId={league.id} games={games} season={season} loading={loading} hasError={!loading && result.errors.length > 0} onSelect={selectDate} onClose={() => setCalendarOpen(false)} />}
    </section>
  );
}

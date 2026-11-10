import { useEffect, useId, useMemo, useState } from "react";
import { findLeagueTeam, formatGameDate, formatGameTime, getGameStatus, TeamImage } from "./LeagueDetailShared";
import { MatchRelatedVideos } from "./MatchRelatedVideos";
import { SportsCalendarDialog, SportsCalendarNavButton } from "./SportsCalendarDialog";
import { getCalendarDays, getRecentScheduleGame, getRoundWindow, getScheduleDateWindow, getScheduleRounds, getScheduleSeason, getSeasonRange, groupScheduleGames } from "../data/leagueScheduleView";
import { getScheduleGameDate } from "../data/leagueScheduleRange";
import { getScheduleUnit } from "../data/leagueScheduleUnits";
import { getMatchVideoKey } from "../data/matchRelatedVideos";
import { useScheduleMatchVideos } from "../hooks/useScheduleMatchVideos";
import { getLeagueSeasonSchedule } from "../service/leagueScheduleService";
import { findSportsTeam } from "../data/sportsTeams";
import "./scss/LeagueSchedulePage.scss";

const ASSETS = "/images/sports/league-detail/schedule/";
const SAVED_MATCHES_KEY = "coupangplay:sports:saved-matches";
const EMPTY_GAMES = [];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ScheduleArrow({ direction = "next" }) {
  return direction === "previous"
    ? <span className="league-schedule__previous" aria-hidden="true"><img src={ASSETS + "previous.svg"} alt="" /></span>
    : <img src={ASSETS + "next.svg"} alt="" aria-hidden="true" />;
}

function readSavedMatches() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_MATCHES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(value => typeof value === "string") : [];
  } catch { return []; }
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

function ScheduleMatchRow({ game, league, scoresOn, selectedTeamIds, saved, onToggleSaved, relatedVideos }) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const status = getGameStatus(game.status);
  const hasRelatedVideos = status.type === "ended" && Boolean(relatedVideos?.length);
  const detailsExpanded = hasRelatedVideos && expanded;
  const unit = getScheduleUnit(game);
  const isMyTeam = (team) => {
    if (!team) return false;
    const localTeam = findSportsTeam(league.id, team) || findLeagueTeam(league.id, team);
    return selectedTeamIds.includes(team.id) || selectedTeamIds.includes(localTeam?.id);
  };
  const homeIsMyTeam = isMyTeam(game.home);
  const awayIsMyTeam = isMyTeam(game.away);
  const hasScores = scoresOn && ["live", "ended"].includes(status.type) && game.home?.score != null && game.away?.score != null;
  const quality = ["4K", "HDR"].includes(game.broadcastQuality) ? game.broadcastQuality : "";
  const homeName = game.raceName || game.home?.name || "홈 팀";
  const awayName = game.raceName ? (game.venue || "그랑프리") : game.away?.name || "원정 팀";
  const title = `${homeName} vs ${awayName}`;
  const liveUrl = game.broadcastUrl || "https://www.coupangplay.com/";
  return (
    <div className="league-schedule__match-wrap" data-expanded={detailsExpanded || undefined}>
    <article className="league-schedule__match" data-match-status={status.type} data-my-team-home={homeIsMyTeam || undefined} data-my-team-away={awayIsMyTeam || undefined} aria-label={`${title}, ${status.label}`}>
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
          <strong className="league-schedule__score" aria-label={hasScores ? `홈 ${game.home.score}점` : undefined}>{hasScores ? game.home.score : ""}</strong>
          <div className="league-schedule__time"><time dateTime={game.utcDate || game.startTime}>{formatGameTime(game.utcDate || game.startTime)}</time><span>{unit?.label || game.stage || league.name}</span></div>
          <strong className="league-schedule__score league-schedule__score--away" aria-label={hasScores ? `원정 ${game.away.score}점` : undefined}>{hasScores ? game.away.score : ""}</strong>
        </div>
        <div className="league-schedule__team league-schedule__team--away">{!game.raceName && <TeamImage team={game.away} leagueId={league.id} />}<span title={awayName}>{awayName}</span></div>
      </div>
      <div className="league-schedule__actions">
        {status.type === "scheduled" ? <button type="button" className="league-schedule__action" aria-label={`${title} 경기 찜하기`} aria-pressed={saved} onClick={() => onToggleSaved(game.gameId)}>
          <img src={ASSETS + (saved ? "check.svg" : "plus.svg")} alt="" />
        </button> : status.type === "live" ? <a className="league-schedule__action is-live" href={liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`${title} 쿠팡플레이에서 중계 보기`}><img src={ASSETS + "play.svg"} alt="" /></a>
          : hasRelatedVideos && <button type="button" className="league-schedule__action league-schedule__action--expand" onClick={() => setExpanded(value => !value)}
            aria-label={`${title} 관련 영상 ${detailsExpanded ? "접기" : "펼치기"}`} aria-expanded={detailsExpanded} aria-controls={detailsExpanded ? detailsId : undefined}>
            <img src={ASSETS + "related-collapse.svg"} alt="" />
          </button>}
      </div>
    </article>
    {detailsExpanded && <MatchRelatedVideos game={game} id={detailsId} initialVideos={relatedVideos} returnTab="schedule" />}
    </div>
  );
}

export function LeagueSchedulePage({ league, scoresOn, today, selectedTeams = [] }) {
  const currentSeason = getScheduleSeason(league.id, today);
  const [season, setSeason] = useState(currentSeason);
  const [mode, setMode] = useState("round");
  const [selection, setSelection] = useState(null);
  const [roundOffset, setRoundOffset] = useState(0);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [savedMatches, setSavedMatches] = useState(readSavedMatches);
  const key = `${league.id}:${season}:${attempt}`;
  const loading = result?.key !== key;
  const games = loading ? EMPTY_GAMES : result.games;
  const rounds = useMemo(() => getScheduleRounds(games), [games]);
  const recentGame = useMemo(() => getRecentScheduleGame(games, today), [games, today]);
  const currentSelection = selection?.season === season ? selection : null;
  const round = currentSelection?.round || getScheduleUnit(recentGame || {})?.value || rounds[0]?.value || "";
  const requestedDate = currentSelection?.date || (season === currentSeason ? today : getScheduleGameDate(recentGame || {}) || getSeasonRange(league.id, season).from);
  const dateWindow = useMemo(() => getScheduleDateWindow(games, requestedDate), [games, requestedDate]);
  const dateKey = dateWindow.selectedDate || requestedDate;
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
    try { window.localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(savedMatches)); } catch { /* Keep local selections in memory. */ }
  }, [savedMatches]);

  function selectDate(date, year = getScheduleSeason(league.id, date)) {
    const game = games.find(game => getScheduleGameDate(game) === date);
    setSeason(year);
    setSelection({ season: year, date, round: year === season ? getScheduleUnit(game || {})?.value || round : "" });
    setRoundOffset(0);
    if (viewMode === "round" && !game) setMode("date");
  }

  function shiftPeriod(offset) {
    if (viewMode === "round") { setSeason(value => value + offset); setSelection(null); setRoundOffset(0); }
    else {
      const date = new Date(`${dateKey}T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + offset, 1);
      selectDate(date.toISOString().slice(0, 10));
    }
  }

  function toggleSaved(id) { setSavedMatches(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); }

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
        <div className="league-schedule__recent-wrap"><button className="league-schedule__recent" type="button" onClick={() => { setSeason(currentSeason); setSelection(null); setRoundOffset(0); }}>최근</button></div>
      </div>
      <div className="league-schedule__selector" role="group" aria-label={viewMode === "round" ? "라운드 선택" : "날짜 선택"}>
        <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "이전 라운드 묶음" : "이전 경기 날짜 묶음"} disabled={viewMode === "round" ? !roundWindow.hasPrevious : !dateWindow.hasPrevious}
          onClick={() => viewMode === "round" ? setRoundOffset(value => value - 5) : dateWindow.previousDate && selectDate(dateWindow.previousDate)}><ScheduleArrow direction="previous" /></button>
        <div className="league-schedule__options">
          {viewMode === "round" ? (roundWindow.items.length ? roundWindow.items.map(option => <button type="button" key={option.value} aria-label={option.label} aria-pressed={round === option.value}
            onClick={() => { setSelection({ season, date: dateKey, round: option.value }); setRoundOffset(0); }}><strong>{option.kind === "round" ? `${option.number}R` : option.label}</strong><span>{option.kind === "round" ? "정규 리그" : "경기 일정"}</span></button>)
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
            {group.matches.map(game => <ScheduleMatchRow key={game.gameId} game={game} league={league} scoresOn={scoresOn} selectedTeamIds={selectedTeamIds} saved={savedMatches.includes(game.gameId)} onToggleSaved={toggleSaved} relatedVideos={scheduleMatchVideos[getMatchVideoKey(game)]} />)}
          </section>)}
        {!loading && !groups.length && <p className="league-schedule__empty" role="status">{result.errors.length ? "경기 일정을 불러오지 못했습니다." : "선택한 조건에 등록된 경기가 없습니다."}</p>}
        {!loading && (result.errors.length > 0 || result.warning) && <div className="league-schedule__error" role="status"><p>{result.warning || (games.length ? "일부 경기 일정을 불러오지 못했습니다." : "현재 경기 일정을 확인할 수 없습니다. 잠시 후 다시 조회해 주세요.")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></div>}
      </div>
      {calendarOpen && <ScheduleCalendar date={dateKey} today={today} leagueId={league.id} games={games} season={season} loading={loading} hasError={!loading && result.errors.length > 0} onSelect={selectDate} onClose={() => setCalendarOpen(false)} />}
    </section>
  );
}

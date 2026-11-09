import { useEffect, useMemo, useRef, useState } from "react";
import { findLeagueTeam, formatGameDate, formatGameTime, getGameStatus, TeamImage } from "./LeagueDetailShared";
import { getCalendarDays, getRecentScheduleGame, getRoundWindow, getScheduleRounds, getScheduleSeason, getSeasonRange, groupScheduleGames } from "../data/leagueScheduleView";
import { getScheduleGameDate, shiftScheduleDate } from "../data/leagueScheduleRange";
import { getScheduleUnit } from "../data/leagueScheduleUnits";
import { getLeagueSeasonSchedule } from "../service/leagueScheduleService";
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

function ScheduleCalendar({ date, today, leagueId, games, onSelect, onClose }) {
  const dialog = useRef(null);
  const [month, setMonth] = useState(date.slice(0, 7));
  const [year, number] = month.split("-").map(Number);
  const daysWithGames = useMemo(() => new Set(games.map(getScheduleGameDate)), [games]);
  const days = getCalendarDays(month);
  const currentYear = Number(today.slice(0, 4));
  const shiftMonth = offset => setMonth(new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7));
  useEffect(() => { dialog.current.showModal(); }, []);

  return (
    <dialog className="league-schedule__calendar" ref={dialog} aria-labelledby="schedule-calendar-title" onCancel={onClose} onClose={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="league-schedule__calendar-content">
        <h2 className="league-schedule__sr-only" id="schedule-calendar-title">경기 일정 날짜 선택</h2>
        <div className="league-schedule__calendar-heading">
          <button type="button" className="league-schedule__icon-button" aria-label="달력 이전 달" disabled={month <= "2010-01"} onClick={() => shiftMonth(-1)}><ScheduleArrow direction="previous" /></button>
          <div className="league-schedule__calendar-month">
            <select aria-label="달력 연도" value={year} onChange={event => setMonth(`${event.target.value}-${String(number).padStart(2, "0")}`)}>
              {Array.from({ length: currentYear - 2010 + 2 }, (_, index) => currentYear + 1 - index).map(value => <option key={value} value={value}>{value}년</option>)}
            </select>
            <select aria-label="달력 월" value={number} onChange={event => setMonth(`${year}-${event.target.value.padStart(2, "0")}`)}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}월</option>)}
            </select>
          </div>
          <button type="button" className="league-schedule__icon-button" aria-label="달력 다음 달" disabled={month >= `${currentYear + 1}-12`} onClick={() => shiftMonth(1)}><ScheduleArrow /></button>
        </div>
        <div className="league-schedule__calendar-grid">
          {WEEKDAYS.map(day => <span className="league-schedule__weekday" key={day}>{day}</span>)}
          {days.map(day => <button type="button" key={day} aria-label={`${day}${daysWithGames.has(day) ? ", 경기 있음" : ""}`} aria-pressed={day === date}
            aria-current={day === today ? "date" : undefined} className={(day.slice(0, 7) !== month ? "is-outside " : "") + (daysWithGames.has(day) ? "has-games" : "")}
            onClick={() => { onSelect(day, getScheduleSeason(leagueId, day)); onClose(); }}>{Number(day.slice(-2))}</button>)}
        </div>
        <button className="league-schedule__calendar-close" type="button" onClick={onClose}>닫기</button>
      </div>
    </dialog>
  );
}

function ScheduleMatchRow({ game, league, scoresOn, selectedTeamIds, saved, onToggleSaved, onViewVideos }) {
  const status = getGameStatus(game.status);
  const unit = getScheduleUnit(game);
  const personal = [game.home, game.away].some(team => team && selectedTeamIds.includes(findLeagueTeam(league.id, team)?.id || team.id));
  const hasScores = scoresOn && ["live", "ended"].includes(status.type) && game.home?.score != null && game.away?.score != null;
  const quality = ["4K", "HDR"].includes(game.broadcastQuality) ? game.broadcastQuality : "";
  const homeName = game.raceName || game.home?.name || "홈 팀";
  const awayName = game.raceName ? (game.venue || "그랑프리") : game.away?.name || "원정 팀";
  const title = `${homeName} vs ${awayName}`;
  const knownVideo = game.highlightUrl || game.broadcastUrl;
  const liveUrl = game.broadcastUrl || "https://www.coupangplay.com/";
  return (
    <article className="league-schedule__match" data-match-status={status.type} data-my-team={personal || undefined} aria-label={`${title}, ${status.label}`}>
      <div className="league-schedule__badges">
        <span className={`league-schedule__badge league-schedule__badge--${status.type}`}>
          {status.type === "live" && <img src={ASSETS + "live.svg"} alt="" />} {status.label}
        </span>
        {quality && <span className="league-schedule__quality">{quality}</span>}
        {status.type === "ended" && knownVideo && <span className="league-schedule__badge league-schedule__badge--video">하이라이트</span>}
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
        </button> : status.type === "live" || knownVideo ? <a className={`league-schedule__action${status.type === "live" ? " is-live" : ""}`} href={status.type === "live" ? liveUrl : knownVideo} target="_blank" rel="noopener noreferrer" aria-label={`${title} ${status.type === "live" ? "쿠팡플레이에서 중계 보기" : "하이라이트 보기"}`}><img src={ASSETS + "play.svg"} alt="" /></a>
          : <button type="button" className="league-schedule__action" onClick={onViewVideos} aria-label={`${title} 리그 경기 영상 보기`}><img src={ASSETS + "play.svg"} alt="" /></button>}
      </div>
    </article>
  );
}

export function LeagueSchedulePage({ league, scoresOn, today, selectedTeams = [], onViewVideos }) {
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
  const dateKey = currentSelection?.date || (season === currentSeason ? today : getScheduleGameDate(recentGame || {}) || getSeasonRange(league.id, season).from);
  const dateOnly = !loading && games.length > 0 && !rounds.length;
  const viewMode = dateOnly ? "date" : mode;
  const roundWindow = getRoundWindow(rounds, round, roundOffset);
  const groups = useMemo(() => groupScheduleGames(games, { mode: viewMode, dateKey, round }), [games, viewMode, dateKey, round]);
  const selectedTeamIds = selectedTeams.map(team => team.id);
  const seasonRange = getSeasonRange(league.id, season);
  const dates = Array.from({ length: 7 }, (_, index) => shiftScheduleDate(dateKey, index - 3));
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
        <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "이전 라운드 묶음" : "이전 주"} disabled={viewMode === "round" && !roundWindow.hasPrevious}
          onClick={() => viewMode === "round" ? setRoundOffset(value => value - 5) : selectDate(shiftScheduleDate(dateKey, -7))}><ScheduleArrow direction="previous" /></button>
        <div className="league-schedule__options">
          {viewMode === "round" ? (roundWindow.items.length ? roundWindow.items.map(option => <button type="button" key={option.value} aria-label={option.label} aria-pressed={round === option.value}
            onClick={() => { setSelection({ season, date: dateKey, round: option.value }); setRoundOffset(0); }}><strong>{option.kind === "round" ? `${option.number}R` : option.label}</strong><span>{option.kind === "round" ? "정규 리그" : "경기 일정"}</span></button>)
            : <span className="league-schedule__selector-loading">{loading ? "경기 라운드를 불러오는 중입니다." : "조회된 라운드가 없습니다."}</span>)
            : dates.map(date => <button type="button" key={date} aria-label={date} aria-pressed={date === dateKey} aria-current={date === today ? "date" : undefined} onClick={() => selectDate(date)}>
              <strong>{Number(date.slice(-2))}</strong><span>{date === today ? "오늘" : WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]}</span></button>)}
        </div>
        <button className="league-schedule__icon-button" type="button" aria-label={viewMode === "round" ? "다음 라운드 묶음" : "다음 주"} disabled={viewMode === "round" && !roundWindow.hasNext}
          onClick={() => viewMode === "round" ? setRoundOffset(value => value + 5) : selectDate(shiftScheduleDate(dateKey, 7))}><ScheduleArrow /></button>
      </div>
      <p className="league-schedule__timezone">한국시간 기준</p>
      <div className="league-schedule__results" aria-busy={loading}>
        {loading ? <div className="league-schedule__loading" role="status"><span className="league-schedule__sr-only">경기 일정을 불러오는 중입니다.</span>{[0, 1, 2].map(index => <div key={index} />)}</div>
          : groups.map(group => <section className="league-schedule__date-group" key={group.date} aria-label={group.date}>
            <h3><time dateTime={group.date}>{formatGameDate(`${group.date}T00:00:00+09:00`)}</time></h3>
            {group.matches.map(game => <ScheduleMatchRow key={game.gameId} game={game} league={league} scoresOn={scoresOn} selectedTeamIds={selectedTeamIds} saved={savedMatches.includes(game.gameId)} onToggleSaved={toggleSaved} onViewVideos={onViewVideos} />)}
          </section>)}
        {!loading && !groups.length && <p className="league-schedule__empty" role="status">{result.errors.length ? "경기 일정을 불러오지 못했습니다." : "선택한 조건에 등록된 경기가 없습니다."}</p>}
        {!loading && (result.errors.length > 0 || result.warning) && <div className="league-schedule__error" role="status"><p>{result.warning || (games.length ? "일부 경기 일정을 불러오지 못했습니다." : "현재 경기 일정을 확인할 수 없습니다. 잠시 후 다시 조회해 주세요.")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></div>}
      </div>
      {calendarOpen && <ScheduleCalendar date={dateKey} today={today} leagueId={league.id} games={games} onSelect={selectDate} onClose={() => setCalendarOpen(false)} />}
    </section>
  );
}

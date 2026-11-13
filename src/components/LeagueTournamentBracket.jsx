import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getGameStatus, TeamImage } from "./LeagueDetailShared";
import { buildTournamentBracket } from "../data/leagueTournamentBracket";
import { getScheduleBrowseRange, getScheduleSeason, getSeasonRange, isScheduleDateInRange } from "../data/leagueScheduleView";
import { getScheduleGameDate } from "../data/leagueScheduleRange";
import { getLeagueSeasonSchedule } from "../service/leagueScheduleService";
import "./scss/LeagueTournamentBracket.scss";

const EMPTY_GAMES = [];
const CARD_HEIGHT = 128;
const ROW_STEP = 152;
const slotY = (firstRound, size, index) => ROW_STEP * (firstRound / size * index + (firstRound / size - 1) / 2);
const dateKey = value => getScheduleGameDate({ utcDate: value });
const shortDate = value => dateKey(value)?.slice(5).replace("-", ".") || "";

function roundDates(round, showEmptySlots) {
  const dates = round.slots.flatMap(tie => tie?.games.map(game => game.utcDate || game.startTime) || []).filter(Boolean).sort();
  if (!dates.length) return showEmptySlots ? "" : "진행 경기 없음";
  const first = shortDate(dates[0]), last = shortDate(dates.at(-1));
  return first === last ? first : `${first} – ${last}`;
}

function Trophy() {
  return <svg viewBox="0 0 80 88" fill="none" aria-hidden="true">
    <path d="M22 12h36v23c0 16-8 24-18 24s-18-8-18-24V12Z" fill="url(#tournament-cup)" stroke="currentColor" strokeWidth="2" />
    <path d="M22 18H10v9c0 12 7 19 17 19M58 18h12v9c0 12-7 19-17 19M40 59v16M26 79h28M31 74h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m40 25 3.3 6.7 7.4 1.1-5.4 5.2 1.3 7.4L40 42l-6.6 3.4 1.3-7.4-5.4-5.2 7.4-1.1L40 25Z" fill="currentColor" opacity=".6" />
    <defs><linearGradient id="tournament-cup" x1="22" y1="12" x2="61" y2="56" gradientUnits="userSpaceOnUse"><stop stopColor="#9cb5c9" stopOpacity=".5" /><stop offset="1" stopColor="#26394b" stopOpacity=".2" /></linearGradient></defs>
  </svg>;
}

function BracketMatch({ tie, size, top, league, scoresOn, browseRange }) {
  const teams = tie?.teams || [null, null];
  const state = tie?.live ? "LIVE" : tie?.completed ? "종료" : tie ? getGameStatus(tie.game.status).label : "대진 미정";
  const showWinner = scoresOn && Boolean(tie?.winnerKey);
  const hasPenalties = scoresOn && tie?.completed && teams.every(team => team?.shootoutScore != null);
  const playedLegs = tie?.games.filter(game => /^(FINISHED|IN_PLAY|LIVE)/.test(game.status || "")).length || 0;
  const scoreLabel = tie?.twoLegged ? tie.scoresAreAggregate ? "합계" : playedLegs ? "1차전" : "홈·원정" : "";
const unknownName = "진출팀 미정";
    const title = teams.map(team => team?.name || unknownName).join(" vs ");
  const canOpen = tie && isScheduleDateInRange(getScheduleGameDate(tie.game), browseRange);
  const Match = canOpen ? Link : "article";
  return <div className="tournament-bracket__slot" style={{ top }}>
    <Match className={"tournament-bracket__match" + (!tie ? " is-undecided" : "") + (tie?.live ? " is-live" : "")}
      {...(canOpen ? { to: `/sports/league/${league.id}`, state: { leagueTab: "schedule", scheduleMatch: tie.game, expandScheduleMatch: true } } : {})}
      aria-label={`${size === 2 ? "결승" : `${size}강`} ${tie ? `${title}, ${state}` : "대진 미정"}${canOpen ? ", 경기 일정 보기" : ""}`}>
      <div className="tournament-bracket__match-meta"><span className={tie?.live ? "is-live" : ""}>{tie ? state : ""}</span><span>{[scoreLabel, hasPenalties ? "승부차기" : ""].filter(Boolean).join(" · ")}</span></div>
      <div className="tournament-bracket__teams">
        {teams.map((team, teamIndex) => <div className={"tournament-bracket__team" + (showWinner ? team?.key === tie.winnerKey ? " is-winner" : " is-loser" : "")} key={team?.key || teamIndex}>
          {team ? <TeamImage team={team} leagueId={league.id} /> : <span className="tournament-bracket__unknown" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3.5 5v6.2c0 5 3.5 8.8 8.5 10.8 5-2 8.5-5.8 8.5-10.8V5L12 2Z" /></svg></span>}
          <span className="tournament-bracket__team-name" title={team?.name}>{team?.name || unknownName}</span>
          {scoresOn && team?.score != null && <strong className="tournament-bracket__score">{team.score}</strong>}
          {hasPenalties && <span className="tournament-bracket__penalty" aria-label={`승부차기 ${team.shootoutScore}점`}>({team.shootoutScore})</span>}
          {showWinner && team?.key === tie.winnerKey && <span className="tournament-bracket__winner-mark" aria-label="승리">✓</span>}
        </div>)}
      </div>
    </Match>
  </div>;
}

export function LeagueTournamentBracket({ league, today, scoresOn, startRound = 8, fullPage = false, onShowAll }) {
  const [season, setSeason] = useState(() => getScheduleSeason(league.id, today));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${league.id}:${season}:${attempt}`;
  const loading = result?.key !== key;
  const games = loading ? EMPTY_GAMES : result.games;
  const checkedAt = loading ? 0 : result.checkedAt;
  const bracket = useMemo(() => buildTournamentBracket(games, { leagueId: league.id, season, now: checkedAt, startRound }), [games, league.id, season, checkedAt, startRound]);
  const firstRound = bracket.rounds[0].size;
  const boardHeight = ROW_STEP * (firstRound / 2 - 1) + CARD_HEIGHT;
  const finalY = slotY(firstRound, 2, 0);
  const currentSeason = getScheduleSeason(league.id, today);
  const browseRange = getScheduleBrowseRange(today, league.id);
  const minSeason = getScheduleSeason(league.id, browseRange.from);
  const maxSeason = getScheduleSeason(league.id, browseRange.to);
  const seasonLabel = getSeasonRange(league.id, season).label;
  const hasError = !loading && Boolean(result.errors?.length || result.warning);
  const showEmptySlots = league.id === "carabao";
  const showBracket = bracket.publishedTies > 0 || (showEmptySlots && !loading && !hasError);

  useEffect(() => {
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || controller.signal.aborted) return;
      refreshing = true;
      try {
        const data = await getLeagueSeasonSchedule(league.id, season, { signal: controller.signal, force: attempt > 0 });
        if (!controller.signal.aborted) setResult({ ...data, key, checkedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, games: [], checkedAt: Date.now(), errors: [error.message || "대진표를 불러오지 못했습니다."] });
      } finally {
        refreshing = false;
      }
    };
    refresh();
    const timer = season >= currentSeason ? window.setInterval(refresh, 60000) : null;
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [league.id, season, attempt, key, currentSeason]);

  return <section className={"league-detail__section tournament-bracket" + (fullPage ? " tournament-bracket--page" : "")} aria-labelledby="league-tournament-bracket-title" aria-busy={loading}>
    <div className="league-detail__section-heading tournament-bracket__heading">
      <div><h2 id="league-tournament-bracket-title">리그 순위</h2><p>{firstRound}강부터 우승까지{showEmptySlots ? "" : " 진행 중·종료 경기"}</p></div>
      <div className="tournament-bracket__controls">
      {onShowAll && <button type="button" className="league-detail__standings-more" onClick={onShowAll}>전체보기 <span aria-hidden="true">›</span></button>}
      <div className="tournament-bracket__season" role="group" aria-label="리그 순위 시즌 선택">
        <button type="button" aria-label="이전 시즌 대진표" disabled={season <= minSeason} onClick={() => setSeason(value => value - 1)}>‹</button>
        <strong aria-live="polite">{seasonLabel}</strong>
        <button type="button" aria-label="다음 시즌 대진표" disabled={season >= maxSeason} onClick={() => setSeason(value => value + 1)}>›</button>
      </div>
      </div>
    </div>
    {loading && <p className="tournament-bracket__notice" role="status">대진표를 불러오는 중입니다.</p>}
    {hasError && <div className="tournament-bracket__notice" role="status"><span>{result.warning || (bracket.publishedTies ? "일부 대진을 불러오지 못했습니다." : "대진표를 불러오지 못했습니다. 다시 조회해 주세요.")}</span><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></div>}
    {!showEmptySlots && !loading && !hasError && !bracket.publishedTies && <p className="tournament-bracket__notice">이 시즌에는 진행 중이거나 종료된 {firstRound}강 이후 경기가 없습니다.</p>}
    {showBracket && <>
    <div className="tournament-bracket__scroll" tabIndex={0} role="region" aria-label={`${league.name} ${seasonLabel} 시즌 ${bracket.rounds.map(round => round.label).join("·")}·우승 대진표`}>
      <div className="tournament-bracket__grid" style={{ "--bracket-height": `${boardHeight}px`, "--bracket-rounds": bracket.rounds.length,
        "--bracket-min-width": `${bracket.rounds.length === 3 ? 920 : bracket.rounds.length * 240 + (bracket.rounds.length - 1) * 72}px` }}>
        {bracket.rounds.map((round, roundIndex) => <div className="tournament-bracket__round" key={round.size} data-bracket-round={round.size}>
          <div className="tournament-bracket__round-heading"><h3>{round.label}</h3><span>{roundDates(round, showEmptySlots)}</span></div>
          <div className="tournament-bracket__matches">
            {round.size === 2 && (showEmptySlots || round.slots.some(Boolean)) && <div className="tournament-bracket__trophy" style={{ top: finalY - 104 }}><Trophy /></div>}
            {round.slots.map((tie, index) => (tie || showEmptySlots) && <BracketMatch key={tie?.id || `${round.size}:${index}`} tie={tie} size={round.size} top={slotY(firstRound, round.size, index)} league={league} scoresOn={scoresOn} browseRange={browseRange} />)}
            {roundIndex < bracket.rounds.length - 1 && <svg className="tournament-bracket__connectors" viewBox={`0 0 72 ${boardHeight}`} preserveAspectRatio="none" aria-hidden="true">
              {round.connections.filter(connection => showEmptySlots || connection.confirmed).map(connection => {
                const from = slotY(firstRound, round.size, connection.from) + CARD_HEIGHT / 2;
                const to = slotY(firstRound, round.size / 2, connection.to) + CARD_HEIGHT / 2;
                return <path key={`${connection.from}:${connection.to}`} d={`M0 ${from} H36 V${to} H72`} className={connection.confirmed ? "is-confirmed" : "is-pending"} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>}
            {round.size === 2 && scoresOn && bracket.champion && <div className="tournament-bracket__champion" style={{ top: finalY + CARD_HEIGHT + 22 }}><span>우승</span><TeamImage team={bracket.champion} leagueId={league.id} /><strong>{bracket.champion.name}</strong></div>}
          </div>
        </div>)}
      </div>
    </div>
    <p className="tournament-bracket__legend"><span />진출 대진 {showEmptySlots && <><span className="is-pending" />대진 미정</>}<span className="tournament-bracket__timezone">한국시간 기준</span></p>
    </>}
  </section>;
}

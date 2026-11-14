import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import "./scss/LeagueDetail.scss";

import { LeagueHeader } from "../../components/LeagueHeader";
import { LeagueHome } from "../../components/LeagueHome";
import { LeagueSchedule } from "../../components/LeagueSchedule";
import { LeagueSchedulePage } from "../../components/LeagueSchedulePage";
import { LeagueStandings } from "../../components/LeagueStandings";
import { LeagueTournamentBracket } from "../../components/LeagueTournamentBracket";
import { LeagueVideos } from "../../components/LeagueVideos";
import { LeagueVideoFeed } from "../../components/LeagueVideoFeed";
import { findLeagueTeam, normalizeSportsText } from "../../components/LeagueDetailShared";
import { SportsSettingsModal } from "./components/SportsSettingsModal";
import { SPORTS_LEAGUE_BY_ID } from "../../data/sportsLeagues";
import { getLeagueHeaderStyle, getLeagueTheme } from "../../data/leagueHeaderTheme";
import { useLeagueHeaderScroll } from "../../hooks/useLeagueHeaderScroll";
import { SPORTS_TEAMS_BY_LEAGUE } from "../../data/sportsTeams";
import {
  SPORTS_HIGHLIGHTS,
  SPORTS_MOMENTS,
  SPORTS_PASS_CONTENT,
  SPORTS_RECOMMENDATIONS,
  SPORTS_REPLAYS,
  SPORTS_TOGETHER,
} from "../../data/sportsPageContent";
import {
  getFootballMatches,
  getFootballScheduleForDate,
  getKleagueMatchesForDate,
  getKleagueStandings,
  getNbaGamesForSeoulDate,
  getNbaStandings,
  getNflStandings,
  getMatchesForRange,
  getFootballStandings,
  supportsFootballStandings,
} from "../../service/sportsService";
import { getLeagueSeasonSchedule, getLeagueSeasonsSchedule } from "../../service/leagueScheduleService";
import { getScheduleBrowseRange, getScheduleSeason } from "../../data/leagueScheduleView";
import { isKnockoutLeague } from "../../data/leagueTournamentBracket";
import { useAuthStore } from "../../store/useAuthStore";
import { loadLeagueBroadcasts } from "../../data/leagueBroadcasts";
import { getNearestScheduleRange, getScheduleGameDate, getScheduleRange, loadScheduleDates, selectScheduleMatches } from "../../data/leagueScheduleRange";

const LEAGUE_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-leagues";
const MAX_LEAGUE_SUBSCRIPTIONS = 10;
const TEAM_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-teams";
const SEOUL_TIME_ZONE = "Asia/Seoul";
const EMPTY_SCHEDULE = { games: [], loading: true, errors: [] };
const EMPTY_STANDINGS = { rows: [], loading: true, error: "" };
const SEASON_FIXTURE_LEAGUES = new Set(["PL", "PD", "BL1", "FL1", "DED", "ELC", "carabao", "dfb", "concacaf-champions-cup"]);
const NEAREST_FIXTURE_LEAGUES = new Set(["carabao", "dfb", "concacaf-champions-cup"]);
const VIDEO_LIBRARY = [
  ...SPORTS_HIGHLIGHTS,
  ...SPORTS_TOGETHER,
  ...SPORTS_MOMENTS,
  ...SPORTS_PASS_CONTENT,
  ...SPORTS_RECOMMENDATIONS,
  ...SPORTS_REPLAYS,
];

function getSeoulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return value.year + "-" + value.month + "-" + value.day;
}

async function loadLeagueSchedule(league, dateKey) {
  if (SEASON_FIXTURE_LEAGUES.has(league.id)) {
    const data = await getLeagueSeasonSchedule(league.id, getScheduleSeason(league.id, dateKey));
    return { ...data, games: data.games.filter(game => getScheduleGameDate(game) === dateKey) };
  }

  if (league.id === "nba") return { games: await getNbaGamesForSeoulDate(dateKey), errors: [] };

  if (league.id === "kleague-1" || league.id === "kleague-2") {
    const games = await getKleagueMatchesForDate(dateKey);
    return {
      games: games.filter((game) => game.competitionCode === league.id),
      errors: [],
    };
  }

  if (league.id === "nfl") {
    const result = await getFootballScheduleForDate(dateKey);
    return {
      games: result.games.filter((game) => game.competitionCode === league.id),
      errors: result.errors.filter((message) => /NFL/i.test(message)),
    };
  }

  return { games: await getFootballMatches(league.id, dateKey), errors: [] };
}

function loadHomeSeasonSchedule(leagueId, dateKey, options) {
  const season = getScheduleSeason(leagueId, dateKey);
  if (leagueId !== "concacaf-champions-cup") return getLeagueSeasonSchedule(leagueId, season, options);
  const lastSeason = getScheduleSeason(leagueId, getScheduleBrowseRange(dateKey, leagueId).to);
  const seasons = Array.from({ length: lastSeason - season + 1 }, (_, index) => season + index);
  return getLeagueSeasonsSchedule(leagueId, seasons, options);
}

function getLeagueVideos(league) {
  const aliases = new Set([
    normalizeSportsText(league.name),
    normalizeSportsText(league.shortName),
    normalizeSportsText(league.id),
  ].filter(Boolean));
  const teamNames = (SPORTS_TEAMS_BY_LEAGUE[league.id] || [])
    .map((team) => normalizeSportsText(team.name))
    .filter((name) => name.length >= 2);
  const seen = new Set();

  return VIDEO_LIBRARY.filter((video) => {
    const key = video.image + "|" + video.title;
    if (seen.has(key)) return false;
    const title = normalizeSportsText(video.title);
    const belongsToLeague = [...aliases].some((alias) => alias && title.includes(alias)) ||
      teamNames.some((name) => title.includes(name));
    if (belongsToLeague) seen.add(key);
    return belongsToLeague;
  });
}

function readSubscribedTeamIds() {
  try {
    const stored = window.localStorage.getItem(TEAM_SUBSCRIPTIONS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readSubscribedLeagueIds() {
  try {
    const stored = window.localStorage.getItem(LEAGUE_SUBSCRIPTIONS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export const LeagueDetail = () => {
  const { leagueId } = useParams();
  const pageRef = useLeagueHeaderScroll(leagueId);
  const location = useLocation();
  useEffect(() => {
    if (location.hash !== "#league-detail-schedule-title") return;
    const scrollToSchedule = () => document.getElementById("league-detail-schedule-title")?.scrollIntoView({ block: "start", behavior: "instant" });
    const frame = window.requestAnimationFrame(scrollToSchedule);
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, leagueId]);

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const league = SPORTS_LEAGUE_BY_ID[leagueId];
  const leagueTeams = useMemo(() => SPORTS_TEAMS_BY_LEAGUE[leagueId] || [], [leagueId]);
  const showBracket = isKnockoutLeague(leagueId);
  const showStandings = leagueTeams.length !== 1 && !showBracket;
  const showTournamentStandings = leagueId === "carabao";
  const showStandingsTab = showStandings || showTournamentStandings;
  const [today, setToday] = useState(() => getSeoulDateKey());
  const [tabSelection, setTabSelection] = useState(null);
  const navigationTab = ["home", "videos", "schedule", "standings"].includes(location.state?.leagueTab) ? location.state.leagueTab : "home";
  const requestedTab = tabSelection?.key === location.key ? tabSelection.tab : navigationTab;
  const activeTab = requestedTab === "standings" && !showStandingsTab ? "home" : requestedTab;
  const [activeFixtureTab, setActiveFixtureTab] = useState("upcoming");
  const [scoresOn, setScoresOn] = useState(true);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);
  const [broadcastState, setBroadcastState] = useState({ games: [], loading: true, errors: [] });
  const [standingsResult, setStandingsResult] = useState(null);
  const [subscribedTeamIds, setSubscribedTeamIds] = useState(readSubscribedTeamIds);
  const [subscribedLeagueIds, setSubscribedLeagueIds] = useState(readSubscribedLeagueIds);
  const scheduleRange = useMemo(() => getScheduleRange(today, activeFixtureTab), [today, activeFixtureTab]);
  const scheduleKey = `${leagueId}:${activeFixtureTab}:${scheduleRange.from}:${scheduleRange.to}`;
  const scheduleState = scheduleResult?.key === scheduleKey ? scheduleResult : EMPTY_SCHEDULE;
  const standingsState = standingsResult?.leagueId === leagueId ? standingsResult : EMPTY_STANDINGS;

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getSeoulDateKey()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEAGUE_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscribedLeagueIds));
    } catch {
      // Keep the current selection in memory when local storage is unavailable.
    }
  }, [subscribedLeagueIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TEAM_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscribedTeamIds));
    } catch {
      // Keep the current selection in memory when local storage is unavailable.
    }
  }, [subscribedTeamIds]);

  useEffect(() => {
    if (!league || activeTab !== "home") return undefined;
    const controller = new AbortController();
    const { from, to } = scheduleRange;
    const sameSeason = getScheduleSeason(league.id, from) === getScheduleSeason(league.id, to);
    const request = NEAREST_FIXTURE_LEAGUES.has(league.id)
      ? loadHomeSeasonSchedule(league.id, today, { signal: controller.signal })
      : SEASON_FIXTURE_LEAGUES.has(league.id) && sameSeason
        ? getLeagueSeasonSchedule(league.id, getScheduleSeason(league.id, from), { signal: controller.signal })
        : league.id.startsWith("kleague-")
          ? loadScheduleDates({ from, to, signal: controller.signal, loadSchedule: (date) => loadLeagueSchedule(league, date) })
          : getMatchesForRange(league.id, from, to, { signal: controller.signal });
    request
      .then((result) => {
        if (!controller.signal.aborted) {
          setScheduleResult({ ...result, key: scheduleKey, loading: false });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setScheduleResult({
            key: scheduleKey,
            games: [],
            loading: false,
            errors: [error?.message || "경기 일정을 불러오지 못했습니다."],
          });
        }
      });

    return () => controller.abort();
  }, [league, scheduleRange, scheduleKey, activeTab, today]);

  useEffect(() => {
    if (!league || !showStandings || ["videos", "schedule"].includes(activeTab)) return undefined;
    let isCurrent = true;

    const loadStandings = async () => {
      try {
        let rows = [];
        if (league.id === "nba") rows = await getNbaStandings();
        else if (league.id === "nfl") rows = await getNflStandings();
        else if (league.id === "kleague-1") rows = await getKleagueStandings("1");
        else if (league.id === "kleague-2") rows = await getKleagueStandings("2");
        else if (supportsFootballStandings(league.id)) rows = await getFootballStandings(league.id);
        if (isCurrent) setStandingsResult({ leagueId: league.id, rows, loading: false, error: "" });
      } catch (error) {
        if (isCurrent) {
          setStandingsResult({ leagueId: league.id, rows: [], loading: false, error: error?.message || "순위 정보를 불러오지 못했습니다." });
        }
      }
    };

    loadStandings();
    return () => { isCurrent = false; };
  }, [league, activeTab, showStandings]);

  useEffect(() => {
    if (!league || activeTab !== "home") return undefined;
    const controller = new AbortController();
    let refreshing = false;
    const refreshBroadcasts = async () => {
      if (refreshing || controller.signal.aborted) return;
      refreshing = true;
      try {
        const result = await loadLeagueBroadcasts({
          dateKey: today,
          loadSchedule: (dateKey) => loadLeagueSchedule(league, dateKey),
          loadSeasonSchedule: NEAREST_FIXTURE_LEAGUES.has(league.id)
            ? () => loadHomeSeasonSchedule(league.id, today, { signal: controller.signal })
            : undefined,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setBroadcastState({ ...result, leagueId: league.id });
      } finally {
        refreshing = false;
      }
    };
    refreshBroadcasts();
    const timer = window.setInterval(refreshBroadcasts, 60000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [league, today, activeTab]);

  const allLeagueVideos = useMemo(() => league ? getLeagueVideos(league) : [], [league]);
  const selectedTeams = useMemo(
    () => leagueTeams.filter((team) => subscribedTeamIds.includes(team.id)),
    [leagueTeams, subscribedTeamIds],
  );
  const visibleScheduleRange = useMemo(() => NEAREST_FIXTURE_LEAGUES.has(leagueId) && !scheduleState.loading
    ? getNearestScheduleRange(scheduleState.games, today, activeFixtureTab) : scheduleRange,
  [leagueId, scheduleState.loading, scheduleState.games, today, activeFixtureTab, scheduleRange]);
  const visibleMatches = useMemo(() => selectScheduleMatches(scheduleState.games, visibleScheduleRange, activeFixtureTab), [activeFixtureTab, scheduleState.games, visibleScheduleRange]);

  if (!league) {
    return (
      <main className="league-detail league-detail--not-found">
        <div className="league-detail__not-found-card">
          <h1>리그 정보를 찾을 수 없습니다.</h1>
          <Link to="/sports">스포츠 메인으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  const accent = getLeagueTheme(league);
  const isMyLeague = Boolean(user && subscribedLeagueIds.includes(league.id));
  const handleToggleMyLeague = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const nextLeagueIds = isMyLeague
      ? subscribedLeagueIds.filter((id) => id !== league.id)
      : [...subscribedLeagueIds, league.id];

    if (!isMyLeague && subscribedLeagueIds.length >= MAX_LEAGUE_SUBSCRIPTIONS) {
      window.alert("리그는 최대 10개까지 구독할 수 있습니다.");
      return;
    }

    setSubscribedLeagueIds(nextLeagueIds);
    try {
      window.localStorage.setItem(LEAGUE_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(nextLeagueIds));
    } catch {
      // Keep the updated selection in memory when local storage is unavailable.
    }
  };
  const handleToggleLeague = (selectedLeague) => {
    const isSelected = subscribedLeagueIds.includes(selectedLeague.id);
    if (!isSelected && subscribedLeagueIds.length >= MAX_LEAGUE_SUBSCRIPTIONS) return;
    setSubscribedLeagueIds(isSelected
      ? subscribedLeagueIds.filter((id) => id !== selectedLeague.id)
      : [...subscribedLeagueIds, selectedLeague.id]);
  };
  const handleToggleTeam = (teamId) => {
    const isSelected = subscribedTeamIds.includes(teamId);
    if (!isSelected && subscribedTeamIds.length >= MAX_LEAGUE_SUBSCRIPTIONS) return;
    setSubscribedTeamIds(isSelected
      ? subscribedTeamIds.filter((id) => id !== teamId)
      : [...subscribedTeamIds, teamId]);
  };
  const handleOpenTeamSettings = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setIsTeamSettingsOpen(true);
  };
  const isBasketball = league.sport === "농구";
  const standingsRows = standingsState.rows.map((row) => {
    const team = findLeagueTeam(league.id, row);
    return {
      ...row,
      teamName: row.teamName || row.name || team?.name || "팀",
      logoPath: row.crest || row.logoPath || team?.logoPath,
    };
  });
  const hasStandingsApi = supportsFootballStandings(league.id) || ["nba", "nfl", "kleague-1", "kleague-2"].includes(league.id);
  const fallbackTeams = standingsRows.length || hasStandingsApi ? [] : leagueTeams.slice(0, 20).map((team) => ({
    teamName: team.name,
    logoPath: team.logoPath,
    rank: null,
    points: null,
    played: null,
    win: null,
    draw: null,
    loss: null,
    goalsFor: null,
    goalsAgainst: null,
    goalDiff: null,
    winPct: null,
    gamesBehind: null,
  }));
  const tableRows = standingsRows.length ? standingsRows : fallbackTeams;
  const tableNote = standingsRows.length && league.id === "nfl"
    ? `ESPN 기준 ${standingsRows[0].season || "현재"} 시즌 AFC·NFC 컨퍼런스 순위`
    : standingsRows.length && league.id === "acle"
    ? `ESPN 기준 ${standingsRows[0].season}-${String(standingsRows[0].season + 1).slice(-2)} 시즌 동부·서부 지역별 리그 스테이지 순위`
    : standingsRows.length && league.id === "acl2"
    ? `ESPN 기준 ${standingsRows[0].season}-${String(standingsRows[0].season + 1).slice(-2)} 시즌 조별 리그 순위`
    : standingsRows.length && league.id === "mls"
    ? `ESPN 기준 ${standingsRows[0].season} 시즌 동부·서부 컨퍼런스 순위`
    : standingsRows.length && supportsFootballStandings(league.id)
    ? `${standingsRows[0].sourceProvider === "espn" ? "ESPN" : "Football-Data"} 기준 현재 시즌 종합 순위`
    : (fallbackTeams.length ? "순위 통계가 연결되기 전까지 프로젝트에 저장된 팀 목록을 표시합니다." : "");
  const tableColumns = isBasketball
    ? ["순위", "팀", "승률", "경기", "승", "패", "승차"]
    : league.id === "nfl" ? ["순위", "팀", "경기", "승", "패", "무", "승률", "득점", "실점", "득실차"]
    : ["순위", "팀", "승점", "경기", "승", "무", "패", "득점", "실점", "득실차"];
  const standingsProps = { league, standingsState, tableRows, tableNote, tableColumns, isBasketball };
  const changeTab = tabId => {
    setTabSelection({ key: location.key, tab: tabId });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <main ref={pageRef} className="league-detail" data-sport={league.sport} data-league={league.id} style={{ "--league-accent": accent, ...getLeagueHeaderStyle(league) }}>
      <div className="league-detail__hero-shell">
        <LeagueHeader
          league={league}
          scoresOn={scoresOn}
          showStandings={showStandingsTab}
          showScoreToggle={activeTab === "standings" ? showTournamentStandings : activeTab !== "home" || activeFixtureTab === "ended"}
          onToggleScores={() => setScoresOn((value) => !value)}
          isMyLeague={isMyLeague}
          onToggleMyLeague={handleToggleMyLeague}
          onOpenTeamSettings={handleOpenTeamSettings}
          selectedLeagueCount={user ? subscribedLeagueIds.length : 0}
          selectedTeams={user ? selectedTeams : []}
          activeTab={activeTab}
          onTabChange={changeTab}
        />
      </div>
      {activeTab === "videos" ? <LeagueVideoFeed key={league.id} league={league} scoresOn={scoresOn} subscribedTeamIds={user ? subscribedTeamIds : []} /> : activeTab === "schedule" ? <LeagueSchedulePage
        key={`${league.id}:${location.key}`}
        league={league}
        scoresOn={scoresOn}
        today={today}
        selectedTeams={user ? selectedTeams : []}
        initialMatch={location.state?.scheduleMatch?.competitionCode === league.id ? location.state.scheduleMatch : null}
        expandInitialMatch={location.state?.expandScheduleMatch !== false}
      /> : activeTab === "standings" ? showTournamentStandings ? <LeagueTournamentBracket
        key={league.id}
        league={league}
        today={today}
        scoresOn={scoresOn}
        startRound={32}
        fullPage
      /> : <LeagueStandings
        {...standingsProps}
        fullPage
        tableRows={standingsRows}
        tableNote={standingsRows.length ? tableNote : ""}
      /> : <>
      <LeagueHome league={league} scheduleState={broadcastState.leagueId === league.id ? broadcastState : { games: [], loading: true, errors: [] }} />
      <LeagueSchedule
        league={league}
        dateRange={visibleScheduleRange}
        scoresOn={scoresOn}
        scheduleState={scheduleState}
        visibleMatches={visibleMatches}
        activeFixtureTab={activeFixtureTab}
        onFixtureTabChange={setActiveFixtureTab}
      />
      <LeagueVideos
        league={league}
        allLeagueVideos={allLeagueVideos}
        selectedTeams={user ? selectedTeams : []}
        onOpenTeamSettings={handleOpenTeamSettings}
      />
      {showStandings && <LeagueStandings
        {...standingsProps}
        onShowAll={standingsRows.length > 10 ? () => changeTab("standings") : undefined}
      />}
      {showBracket && <LeagueTournamentBracket key={league.id} league={league} today={today} scoresOn={scoresOn}
        onShowAll={showTournamentStandings ? () => changeTab("standings") : undefined} />}
      </>}
      <SportsSettingsModal
        isOpen={isTeamSettingsOpen}
        initialTab="teams"
        initialCategory={league.sport || "추천"}
        initialExpandedLeagueId={league.id}
        title="마이 팀 설정"
        onClose={() => setIsTeamSettingsOpen(false)}
        selectedLeagueIds={subscribedLeagueIds}
        onToggleLeague={handleToggleLeague}
        onReorderLeagues={setSubscribedLeagueIds}
        selectedTeamIds={subscribedTeamIds}
        onToggleTeam={handleToggleTeam}
        onReorderTeams={setSubscribedTeamIds}
      />
    </main>
  );
};

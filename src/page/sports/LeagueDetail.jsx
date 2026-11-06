import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./scss/LeagueDetail.scss";

import { LeagueHeader } from "../../components/LeagueHeader";
import { LeagueHome } from "../../components/LeagueHome";
import { LeagueSchedule } from "../../components/LeagueSchedule";
import { LeagueStandings } from "../../components/LeagueStandings";
import { LeagueVideos } from "../../components/LeagueVideos";
import { EmptyMessage, findLeagueTeam, getGameStatus, normalizeSportsText } from "../../components/LeagueDetailShared";
import { SportsSettingsModal } from "./components/SportsSettingsModal";
import { SPORTS_LEAGUE_BY_ID } from "../../data/sportsLeagues";
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
} from "../../service/sportsService";
import { getF1RacesForDate } from "../../service/f1Service";
import { useAuthStore } from "../../store/useAuthStore";

const LEAGUE_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-leagues";
const MAX_LEAGUE_SUBSCRIPTIONS = 10;
const TEAM_SUBSCRIPTIONS_STORAGE_KEY = "coupangplay:sports:subscribed-teams";
const SEOUL_TIME_ZONE = "Asia/Seoul";
function getCompactHeaderScrollThreshold() {
  if (window.innerWidth <= 600) return 174;
  if (window.innerWidth <= 850) return 184;
  return 219;
}
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
  if (league.id === "f1") return { games: await getF1RacesForDate(dateKey), errors: [] };
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

const LEAGUE_HEADER_COLORS = {
  PL: "#321852",
  nba: "#174d9c",
  f1: "#e60012",
  PD: "#ff515d",
  "kleague-1": "#ff80b4",
  "kleague-2": "#315da7",
  BL1: "#d71920",
  BL2: "#d71920",
  mls: "#000000",
  nfl: "#d11322",
  FL1: "#075ce5",
  ELC: "#47246f",
  FAC: "#d80b22",
  carabao: "#d91f32",
  dfb: "#00bb75",
  "copa-del-rey": "#ff4b00",
  "coupe-de-france": "#2549a1",
  "concacaf-champions-cup": "#263a65",
  acle: "#cf1833",
  acl2: "#315da7",
  "super-lig": "#df2433",
  PD2: "#ff515d",
};

function getLeagueTheme(league) {
  if (league.accent) return league.accent;
  if (LEAGUE_HEADER_COLORS[league.id]) return LEAGUE_HEADER_COLORS[league.id];
  if (league.sport === "농구") return "#173c68";
  if (league.sport === "레이싱") return "#3a1720";
  if (league.sport === "미식축구" || league.sport === "일반") return "#1b314d";
  return "#391548";
}

export const LeagueDetail = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const league = SPORTS_LEAGUE_BY_ID[leagueId];
  const [today] = useState(() => getSeoulDateKey());
  const [activeTab, setActiveTab] = useState("home");
  const [activeFixtureTab, setActiveFixtureTab] = useState("upcoming");
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [scoresOn, setScoresOn] = useState(true);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [scheduleState, setScheduleState] = useState({ games: [], loading: true, errors: [] });
  const [standingsState, setStandingsState] = useState({ rows: [], loading: true, error: "" });
  const [subscribedTeamIds, setSubscribedTeamIds] = useState(readSubscribedTeamIds);
  const [subscribedLeagueIds, setSubscribedLeagueIds] = useState(readSubscribedLeagueIds);

  useEffect(() => {
    const updateCompactHeader = () => {
      setIsCompactHeader(window.scrollY >= getCompactHeaderScrollThreshold());
    };

    updateCompactHeader();
    window.addEventListener("scroll", updateCompactHeader, { passive: true });
    window.addEventListener("resize", updateCompactHeader, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateCompactHeader);
      window.removeEventListener("resize", updateCompactHeader);
    };
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
    if (!league) return undefined;
    let isCurrent = true;
    setScheduleState({ games: [], loading: true, errors: [] });

    loadLeagueSchedule(league, today)
      .then((result) => {
        if (isCurrent) {
          const games = [...(result.games || [])].sort((first, second) =>
            new Date(first.utcDate || first.startTime || 0) - new Date(second.utcDate || second.startTime || 0),
          );
          setScheduleState({ games, loading: false, errors: result.errors || [] });
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setScheduleState({
            games: [],
            loading: false,
            errors: [error?.message || "경기 일정을 불러오지 못했습니다."],
          });
        }
      });

    return () => { isCurrent = false; };
  }, [league, today]);

  useEffect(() => {
    if (!league) return undefined;
    let isCurrent = true;
    setStandingsState({ rows: [], loading: true, error: "" });

    const loadStandings = async () => {
      try {
        let rows = [];
        if (league.id === "nba") rows = await getNbaStandings();
        else if (league.id === "kleague-1") rows = await getKleagueStandings("1");
        else if (league.id === "kleague-2") rows = await getKleagueStandings("2");
        if (isCurrent) setStandingsState({ rows, loading: false, error: "" });
      } catch (error) {
        if (isCurrent) {
          setStandingsState({ rows: [], loading: false, error: error?.message || "순위 정보를 불러오지 못했습니다." });
        }
      }
    };

    loadStandings();
    return () => { isCurrent = false; };
  }, [league]);

  const allLeagueVideos = useMemo(() => league ? getLeagueVideos(league) : [], [league]);
  const leagueTeams = useMemo(() => SPORTS_TEAMS_BY_LEAGUE[leagueId] || [], [leagueId]);
  const selectedTeams = useMemo(
    () => leagueTeams.filter((team) => subscribedTeamIds.includes(team.id)),
    [leagueTeams, subscribedTeamIds],
  );
  const visibleMatches = useMemo(() => scheduleState.games.filter((game) => {
    const status = getGameStatus(game.status).type;
    return activeFixtureTab === "ended" ? status === "ended" : status !== "ended";
  }), [activeFixtureTab, scheduleState.games]);
  const videoGroups = useMemo(() => selectedTeams.map((team) => ({
    team,
    videos: allLeagueVideos.filter((video) => normalizeSportsText(video.title).includes(normalizeSportsText(team.name))).slice(0, 4),
  })).filter((group) => group.videos.length > 0), [allLeagueVideos, selectedTeams]);

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
  const fallbackTeams = standingsRows.length ? [] : leagueTeams.slice(0, 10).map((team) => ({
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
  const tableNote = standingsRows.length || !fallbackTeams.length
    ? ""
    : "순위 통계가 연결되기 전까지 프로젝트에 저장된 팀 목록을 표시합니다.";
  const tableColumns = isBasketball
    ? ["순위", "팀", "승률", "경기", "승", "패", "승차"]
    : ["순위", "팀", "승점", "경기", "승", "무", "패", "득점", "실점", "득실차"];

  return (
    <main className={"league-detail" + (isCompactHeader ? " has-compact-header" : "")} data-sport={league.sport} data-league={league.id} style={{ "--league-accent": accent, "--league-header-color": accent }}>
      <div className="league-detail__hero-shell">
        <LeagueHeader
          league={league}
          scoresOn={scoresOn}
          onToggleScores={() => setScoresOn((value) => !value)}
          isMyLeague={isMyLeague}
          onToggleMyLeague={handleToggleMyLeague}
          onOpenTeamSettings={handleOpenTeamSettings}
          selectedLeagueCount={subscribedLeagueIds.length}
          selectedTeams={selectedTeams}
          isCompact={isCompactHeader}
          activeTab={activeTab}
          onTabChange={(tabId, targetId) => {
            setActiveTab(tabId);
            if (targetId) document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
      <LeagueHome league={league} scheduleState={scheduleState} />
      <LeagueSchedule
        league={league}
        today={today}
        scoresOn={scoresOn}
        scheduleState={scheduleState}
        visibleMatches={visibleMatches}
        activeFixtureTab={activeFixtureTab}
        onFixtureTabChange={setActiveFixtureTab}
      />
      <LeagueVideos
        league={league}
        allLeagueVideos={allLeagueVideos}
        videoGroups={videoGroups}
        selectedTeams={selectedTeams}
      />
      <LeagueStandings
        league={league}
        standingsState={standingsState}
        tableRows={tableRows}
        tableNote={tableNote}
        tableColumns={tableColumns}
        isBasketball={isBasketball}
      />
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

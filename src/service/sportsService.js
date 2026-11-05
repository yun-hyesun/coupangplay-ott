import { KLEAGUE_LEAGUES } from "../data/kleagueLeagues";
import { findSportsTeam, SPORTS_TEAMS_BY_LEAGUE } from "../data/sportsTeams";

// ===================== K리그 (kleague.com) =====================
// 개발 중에는 vite 프록시(/kleague → www.kleague.com)를 거칩니다.
const KLEAGUE_BASE = "/kleague";
const kleagueScheduleCache = new Map();
const KLEAGUE_SCHEDULE_CACHE_MS = 5 * 60 * 1000;

const getTeamLogosByLeague = (leagueIds) =>
  new Map(
    leagueIds.flatMap((leagueId) =>
      (SPORTS_TEAMS_BY_LEAGUE[leagueId] || []).map((team) => [
        team.id.split(":").slice(1).join(":"),
        team.logoPath,
      ]),
    ),
  );

const kleagueTeamLogos = getTeamLogosByLeague(["kleague-1", "kleague-2"]);

// 리그별 순위 (순위 데이터가 곧 팀 목록입니다)
export async function getKleagueStandings(leagueId) {
  // leagueId는 쿼리스트링으로 보내야 합니다 (body로 보내면 항상 K리그1이 옵니다)
  const res = await fetch(`${KLEAGUE_BASE}/record/teamRank.do?leagueId=${leagueId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`K리그 순위 오류: ${res.status}`);

  const json = await res.json();
  if (json.resultCode !== "200") throw new Error(json.resultMsg);

  return json.data.teamRank.flatMap((t) => {
    const team = findSportsTeam(`kleague-${leagueId}`, { teamId: t.teamId, name: t.teamName });
    if (!team) return [];
    return [{
    teamId: t.teamId,
    teamName: team.name,
    rank: t.rank,
    points: t.gainPoint,
    played: t.gameCount,
    win: t.winCnt,
    draw: t.tieCnt,
    loss: t.lossCnt,
    goalsFor: t.gainGoal,
    goalsAgainst: t.lossGoal,
    goalDiff: t.gapCnt,
    form: [t.game01, t.game02, t.game03, t.game04, t.game05, t.game06].filter(Boolean),
    homepage: t.homepage,
    }];
  });
}

// K리그1·2 전체를 한 번에
export async function getAllKleagueStandings() {
  return Promise.all(
    KLEAGUE_LEAGUES.map(async (l) => ({
      leagueId: l.id,
      leagueName: l.name,
      teams: await getKleagueStandings(l.id),
    }))
  );
}

async function getKleagueScheduleMonth(leagueId, year, month) {
  const cacheKey = `${leagueId}:${year}-${month}`;
  const cached = kleagueScheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.time < KLEAGUE_SCHEDULE_CACHE_MS) {
    return cached.data;
  }

  const response = await fetch(`${KLEAGUE_BASE}/getScheduleList.do`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      leagueId,
      teamId: "",
      year: String(year),
      month: String(month),
      ticketYn: "",
    }),
  });
  if (!response.ok) throw new Error(`K리그 일정 오류: ${response.status}`);

  const json = await response.json();
  if (json.resultCode !== "200") {
    throw new Error(json.resultMsg || "K리그 일정 조회에 실패했습니다.");
  }

  const schedule = json.data?.scheduleList;
  if (!Array.isArray(schedule)) {
    throw new Error("K리그 일정 응답 형식이 올바르지 않습니다.");
  }

  kleagueScheduleCache.set(cacheKey, { data: schedule, time: Date.now() });
  return schedule;
}

function normalizeKleagueMatch(match) {
  const matchDate = String(match.gameDate || "").replaceAll(".", "-");
  const matchTime = /^\d{2}:\d{2}$/.test(match.gameTime || "")
    ? match.gameTime + ":00"
    : "";
  const utcDate = matchTime
    ? new Date(`${matchDate}T${matchTime}+09:00`).toISOString()
    : null;
  const statusCode = String(match.gameStatus || "").toUpperCase();
  const isLive = /^(1H|2H|H1|H2|HT|ET|PEN|LIVE|IN_PLAY)$/.test(statusCode);
  const isFinished = match.endYn === "Y" || statusCode === "FE";
  const hasStarted = isLive || isFinished;
  const leagueId = String(match.leagueId);
  const league = KLEAGUE_LEAGUES.find((item) => item.id === leagueId);
  const homeTeam = findSportsTeam(`kleague-${leagueId}`, { teamId: match.homeTeam, name: match.homeTeamName });
  const awayTeam = findSportsTeam(`kleague-${leagueId}`, { teamId: match.awayTeam, name: match.awayTeamName });
  if (!league || !homeTeam || !awayTeam) return null;

  return {
    gameId: `kleague-${leagueId}-${match.gameId}`,
    competitionCode: `kleague-${leagueId}`,
    competitionName: league.name,
    matchday: match.roundId,
    stage: match.codeName || "",
    status: isFinished ? "FINISHED" : isLive ? "IN_PLAY" : "SCHEDULED",
    utcDate,
    home: {
      teamId: match.homeTeam,
      name: homeTeam.name,
      crest: kleagueTeamLogos.get(match.homeTeam),
      score: hasStarted && match.homeGoal != null ? Number(match.homeGoal) : null,
    },
    away: {
      teamId: match.awayTeam,
      name: awayTeam.name,
      crest: kleagueTeamLogos.get(match.awayTeam),
      score: hasStarted && match.awayGoal != null ? Number(match.awayGoal) : null,
    },
  };
}

export async function getKleagueMatchesForDate(seoulDate) {
  const [year, month] = seoulDate.split("-");
  const results = await Promise.allSettled(
    KLEAGUE_LEAGUES.map((league) =>
      getKleagueScheduleMonth(league.id, year, Number(month)),
    ),
  );
  const successfulResults = results.filter((result) => result.status === "fulfilled");
  const schedules = successfulResults
    .flatMap((result) => result.value);

  if (successfulResults.length === 0) {
    const failure = results.find((result) => result.status === "rejected");
    throw failure?.reason || new Error("K리그 경기 일정을 불러오지 못했습니다.");
  }

  return schedules
    .filter((match) => String(match.gameDate || "").replaceAll(".", "-") === seoulDate)
    .map(normalizeKleagueMatch)
    .filter(Boolean)
    .sort((first, second) => new Date(first.utcDate) - new Date(second.utcDate));
}

// ===================== NBA (API Ninjas) =====================
// 개발 중에는 vite 프록시(/nba → api.api-ninjas.com/v1)를 거칩니다.
// 프록시가 X-Api-Key를 붙여 주므로 키는 프런트 코드에 넣지 않습니다.
const NBA_BASE = "/nba";

// 월 호출 한도가 있어서 간단한 메모리 캐시를 둡니다 (새로고침하면 초기화)
const nbaCache = new Map();
const CACHE_MS = 5 * 60 * 1000; // 5분

async function nbaFetch(path, params = {}) {
  const query = new URLSearchParams({ league: "nba", ...params }).toString();
  const cacheKey = `${path}?${query}`;

  const cached = nbaCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;

  const res = await fetch(`${NBA_BASE}${path}?${query}`);
  if (!res.ok) throw new Error(`NBA API 오류: ${res.status}`);
  const data = await res.json();

  nbaCache.set(cacheKey, { time: Date.now(), data });
  return data;
}

// 팀 목록
export async function getNbaTeams() {
  const teams = await nbaFetch("/sportsteams");
  return teams.flatMap((t) => {
    const team = findSportsTeam("nba", { teamId: t.team_id, name: t.name });
    if (!team) return [];
    return [{
    teamId: t.team_id,
    name: team.name,
    nameEn: t.name,
    abbr: t.abbreviation,
    conference: t.conference,
    division: t.division,
    }];
  });
}

// 순위 (league_rank 순)
export async function getNbaStandings() {
  const rows = await nbaFetch("/sportsstandings");
  return rows
    .flatMap((r) => {
      const team = findSportsTeam("nba", { teamId: r.team.team_id, name: r.team.name });
      if (!team) return [];
      return [{
      teamId: r.team.team_id,
      name: team.name,
      nameEn: r.team.name,
      abbr: r.team.abbreviation,
      conference: r.conference,
      rank: r.league_rank,
      conferenceRank: r.conference_rank,
      played: r.games_played,
      win: r.wins,
      loss: r.losses,
      winPct: r.win_pct,
      gamesBehind: r.games_behind,
      streak: r.streak,
      last10: r.last_10,
      }];
    })
    .sort((a, b) => a.rank - b.rank);
}

// 해외 축구·NFL·NBA 일정은 ESPN, F1은 Jolpica, K리그 일정과 NBA 순위는 기존 연결을 사용합니다.
export {
  getEspnFootballMatches as getFootballMatches,
  getAllEspnFootballMatches as getAllFootballMatches,
  getEspnFootballScheduleForDate as getFootballScheduleForDate,
  getEspnNbaGamesForSeoulDate as getNbaGamesForSeoulDate,
  getEspnNbaGamesForSeoulDate as getNbaGames,
  getEspnFootballTeams as getFootballTeams,
  getEspnFootballLiveMatches as getFootballLiveMatches,
} from "./espnService";

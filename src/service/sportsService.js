import { KLEAGUE_LEAGUES } from "../data/kleagueLeagues";
import { getNbaTeamName } from "../data/nbaTeamNameKo";

// ===================== K리그 (kleague.com) =====================
// 개발 중에는 vite 프록시(/kleague → www.kleague.com)를 거칩니다.
const KLEAGUE_BASE = "/kleague";

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

  return json.data.teamRank.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName, // 영문, 한글은 getKleagueTeamName으로 변환
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
  }));
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
  return teams.map((t) => ({
    teamId: t.team_id,
    name: getNbaTeamName(t.team_id, t.name),
    nameEn: t.name,
    abbr: t.abbreviation,
    conference: t.conference,
    division: t.division,
  }));
}

// 순위 (league_rank 순)
export async function getNbaStandings() {
  const rows = await nbaFetch("/sportsstandings");
  return rows
    .map((r) => ({
      teamId: r.team.team_id,
      name: getNbaTeamName(r.team.team_id, r.team.name),
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
    }))
    .sort((a, b) => a.rank - b.rank);
}

// 경기 (date: "YYYY-MM-DD", 미국 동부시간 기준. 생략하면 오늘)
export async function getNbaGames(date) {
  const games = await nbaFetch("/sportsgames", date ? { date } : {});
  return games.map((g) => ({
    gameId: g.game_id,
    date: g.date,
    startTime: g.start_time, // UTC, 화면에서 한국 시간으로 변환
    status: g.status,
    home: { teamId: g.home_team.team_id,name: getNbaTeamName(g.home_team.team_id, g.home_team.name), score: g.home_score },
    away: { teamId: g.away_team.team_id, name: getNbaTeamName(g.away_team.team_id, g.away_team.name), score: g.away_score },
    winner: g.winner,
  }));
}
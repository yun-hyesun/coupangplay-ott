import { findSportsTeam } from "../data/sportsTeams";
import { ESPN_LEAGUE_PATHS } from "../data/espnLeagues";
import espnTeamNames from "../data/espnTeamNames.json";

const COMPETITIONS = new Set(["PL", "PD", "BL1", "FL1", "DED", "ELC"]);
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();
const pending = new Map();

export const supportsFootballStandings = (leagueId) => COMPETITIONS.has(leagueId);

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStanding(leagueId, row, sourceProvider = "football-data") {
  const rank = numberOrNull(row.position);
  if (!Number.isInteger(rank) || rank < 1 || row.team?.id == null || !row.team?.name) {
    throw new Error("리그 순위의 팀 또는 순위 정보가 올바르지 않습니다.");
  }
  const team = findSportsTeam(leagueId, { teamId: row.team.id, name: row.team.name });
  return {
    sourceProvider,
    teamId: row.team.id,
    teamName: team?.name || row.team.shortName || row.team.name,
    logoPath: team?.logoPath || row.team.crest || "",
    rank,
    points: numberOrNull(row.points),
    played: numberOrNull(row.playedGames),
    win: numberOrNull(row.won),
    draw: numberOrNull(row.draw),
    loss: numberOrNull(row.lost),
    goalsFor: numberOrNull(row.goalsFor),
    goalsAgainst: numberOrNull(row.goalsAgainst),
    goalDiff: numberOrNull(row.goalDifference),
  };
}

async function requestJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw Object.assign(new Error(`리그 순위 API 조회 오류: ${response.status}`), { canFallback: response.status === 429 || response.status >= 500 });
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw Object.assign(new Error("리그 순위 조회 시간이 초과되었습니다.", { cause: error }), { canFallback: true });
    if (error instanceof TypeError) error.canFallback = true;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadEspnStandings(leagueId) {
  const data = await requestJson(`/espn-standings/${ESPN_LEAGUE_PATHS[leagueId]}/standings`);
  const tables = [];
  const collect = (node) => {
    if (Array.isArray(node.standings?.entries)) tables.push(node.standings.entries);
    for (const child of node.children || []) collect(child);
  };
  collect(data);
  if (!tables.length) throw new Error("ESPN 리그 순위 응답 형식이 올바르지 않습니다.");
  return tables.flat().map((entry) => {
    const stats = Object.fromEntries((entry.stats || []).map((stat) => [stat.name, stat.value]));
    const remote = entry.team || {};
    // ESPN ID를 Football-Data ID로 비교하지 않고 기존 팀명 번역을 재사용합니다.
    const team = findSportsTeam(leagueId, { name: espnTeamNames.soccer[String(remote.id)] || remote.displayName || remote.name });
    return normalizeStanding(leagueId, {
      position: stats.rank ?? entry.note?.rank,
      team: { id: team?.teamId ?? (remote.id == null ? null : `espn:${remote.id}`), name: team?.name || remote.displayName || remote.name, shortName: team?.name || remote.shortDisplayName, crest: team?.logoPath || remote.logos?.[0]?.href },
      playedGames: stats.gamesPlayed, won: stats.wins, draw: stats.ties, lost: stats.losses,
      points: stats.points, goalsFor: stats.pointsFor, goalsAgainst: stats.pointsAgainst, goalDifference: stats.pointDifferential,
    }, "espn");
  });
}

async function loadStandings(leagueId) {
  let data;
  try {
    data = await requestJson(`/football-data/competitions/${leagueId}/standings`);
  } catch (error) {
    if (!error.canFallback) throw error;
    try {
      return await loadEspnStandings(leagueId);
    } catch (fallbackError) {
      throw new Error(`${error.message} · ESPN 순위 대체 조회도 실패했습니다.`, { cause: fallbackError });
    }
  }
  if (data.competition?.code && data.competition.code !== leagueId) {
    throw new Error("요청한 리그와 순위 데이터가 일치하지 않습니다.");
  }
  const standings = Array.isArray(data.standings) ? data.standings : [];
  const total = standings.find((standing) => standing.type === "TOTAL" && standing.stage === "REGULAR_SEASON") ||
    standings.find((standing) => standing.type === "TOTAL");
  if (!Array.isArray(total?.table)) throw new Error("리그 종합 순위 응답 형식이 올바르지 않습니다.");
  return total.table.map((row) => normalizeStanding(leagueId, row));
}

export async function getFootballStandings(leagueId) {
  if (!supportsFootballStandings(leagueId)) throw new RangeError("현재 지원하지 않는 리그 순위입니다.");
  const cached = cache.get(leagueId);
  if (cached && Date.now() < cached.expiresAt) return cached.rows;
  if (pending.has(leagueId)) return pending.get(leagueId);

  const request = (async () => {
    const allRows = await loadStandings(leagueId);
    const rows = allRows.filter((row) => row.rank <= 10).sort((first, second) => first.rank - second.rank);
    cache.set(leagueId, { rows, expiresAt: Date.now() + CACHE_MS });
    return rows;
  })();

  pending.set(leagueId, request);
  try {
    return await request;
  } finally {
    pending.delete(leagueId);
  }
}

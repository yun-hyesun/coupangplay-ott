import { ESPN_LEAGUE_PATHS } from "../data/espnLeagues";
import espnTeamNames from "../data/espnTeamNames.json";
import { SPORTS_LEAGUE_BY_ID } from "../data/sportsLeagues";
import { findSportsTeam } from "../data/sportsTeams";

const ESPN_BASE = "/espn";
const cache = new Map();
const pending = new Map();
const SEOUL_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new RangeError("경기 조회 날짜가 올바르지 않습니다.");
  }
  return date;
}

function getSeoulDateKey(value = new Date()) {
  const values = Object.fromEntries(
    SEOUL_DATE_FORMAT.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getQueryDates(seoulDate) {
  const previous = parseDateKey(seoulDate);
  previous.setUTCDate(previous.getUTCDate() - 1);
  // ESPN은 미국 날짜로 묶인 경기까지 반환합니다. 두 날짜를 개별 조회한 뒤
  // UTC 시작 시각을 한국 날짜로 변환하여 필터링합니다.
  return [previous.toISOString().slice(0, 10), seoulDate];
}

async function espnFetch(path, params, expectedField) {
  const query = new URLSearchParams(params).toString();
  const key = `${path}?${query}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (pending.has(key)) return pending.get(key);

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${ESPN_BASE}/${key}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`ESPN 조회 오류: ${response.status}`);
      const data = await response.json();
      if (expectedField === "events" && !Array.isArray(data.events)) {
        throw new Error("ESPN 경기 응답 형식이 올바르지 않습니다.");
      }
      if (expectedField === "teams" && !Array.isArray(data.sports?.[0]?.leagues?.[0]?.teams)) {
        throw new Error("ESPN 팀 응답 형식이 올바르지 않습니다.");
      }
      const hasLiveGame = data.events?.some((event) =>
        (event.status || event.competitions?.[0]?.status)?.type?.state === "in",
      );
      cache.set(key, { data, expiresAt: Date.now() + (hasLiveGame ? 30000 : 300000) });
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("ESPN 조회 시간이 초과되었습니다.", { cause: error });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}

function findEspnTeam(leagueId, team = {}) {
  const names = leagueId === "nba" ? espnTeamNames.nba : espnTeamNames.soccer;
  const name = names[String(team.id)];
  // ESPN ID는 football-data/API Ninjas ID와 겹칠 수 있어 기존 ID 조회에 넘기지 않습니다.
  // 번역이 확인된 팀만 사용하며 리그별 사용자 제공 명단을 다시 확인합니다.
  return name ? findSportsTeam(leagueId, { name }) : null;
}

function getStatus(status = {}) {
  const type = status.type || {};
  if (/POSTPONED|DELAYED/.test(type.name || "")) return "POSTPONED";
  if (/CANCEL/.test(type.name || "")) return "CANCELED";
  if (/SUSPEND|ABANDON/.test(type.name || "")) return "SUSPENDED";
  if (type.completed || type.state === "post") return "FINISHED";
  if (type.state === "in") return "IN_PLAY";
  return "SCHEDULED";
}

function getScore(value, status) {
  if (status !== "IN_PLAY" && status !== "FINISHED") return null;
  const raw = value && typeof value === "object" ? value.value ?? value.displayValue : value;
  if (raw == null || raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function getCrest(local, remote) {
  return local.logoPath || remote.logo || remote.logos?.[0]?.href || "";
}

export function normalizeEspnEvent(leagueId, event) {
  const league = SPORTS_LEAGUE_BY_ID[leagueId];
  if (!league || !ESPN_LEAGUE_PATHS[leagueId]) return null;
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === "home");
  const away = competition?.competitors?.find((team) => team.homeAway === "away");
  if (!home?.team || !away?.team || event.id == null) return null;
  const homeTeam = findEspnTeam(leagueId, home.team);
  const awayTeam = findEspnTeam(leagueId, away.team);
  if (!homeTeam || !awayTeam) return null;
  const date = new Date(competition.date || event.date);
  if (!Number.isFinite(date.getTime())) return null;
  const status = getStatus(competition.status || event.status);
  const normalizeCompetitor = (local, remote) => ({
    id: local.id,
    teamId: local.teamId,
    espnTeamId: String(remote.team.id),
    name: local.name,
    nameEn: remote.team.displayName || remote.team.name,
    crest: getCrest(local, remote.team),
    score: getScore(remote.score, status),
  });
  return {
    gameId: `espn:${leagueId}:${event.id}`,
    sourceProvider: "espn",
    sourceEventId: String(event.id),
    competitionCode: leagueId,
    competitionName: league.name,
    matchday: event.week?.number || competition.week?.number || "",
    stage: competition.type?.text || "",
    status,
    statusDetail: (competition.status || event.status)?.type?.detail || "",
    utcDate: date.toISOString(),
    startTime: date.toISOString(),
    home: normalizeCompetitor(homeTeam, home),
    away: normalizeCompetitor(awayTeam, away),
  };
}

function uniqueGames(games) {
  return [...new Map(games.map((game) => [game.gameId, game])).values()]
    .sort((first, second) => new Date(first.utcDate) - new Date(second.utcDate));
}

async function getLeagueSchedule(leagueId, seoulDate) {
  const path = ESPN_LEAGUE_PATHS[leagueId];
  if (!path) return { games: [], errors: [] };
  const dates = getQueryDates(seoulDate);
  const results = await Promise.allSettled(dates.map((date) =>
    espnFetch(`${path}/scoreboard`, { dates: date.replaceAll("-", ""), limit: "1000" }, "events"),
  ));
  const games = [];
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      errors.push(`${SPORTS_LEAGUE_BY_ID[leagueId].name} (${dates[index]}): ${result.reason?.message || "조회 실패"}`);
      return;
    }
    games.push(...result.value.events.map((event) => normalizeEspnEvent(leagueId, event))
      .filter((game) => game && getSeoulDateKey(game.utcDate) === seoulDate));
  });
  return { games: uniqueGames(games), errors };
}

export async function getEspnFootballScheduleForDate(seoulDate) {
  if (!seoulDate) return { games: [], errors: [] };
  parseDateKey(seoulDate);
  const leagueIds = Object.keys(ESPN_LEAGUE_PATHS).filter((id) => id !== "nba");
  const results = [];
  let nextIndex = 0;
  // 한꺼번에 모든 대회를 요청하지 않도록 리그 4개(날짜 요청 8개)로 제한합니다.
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (nextIndex < leagueIds.length) {
      const leagueId = leagueIds[nextIndex++];
      results.push(await getLeagueSchedule(leagueId, seoulDate));
    }
  }));
  return {
    games: uniqueGames(results.flatMap((result) => result.games)),
    errors: results.flatMap((result) => result.errors),
  };
}

export async function getAllEspnFootballMatches(seoulDate) {
  const result = await getEspnFootballScheduleForDate(seoulDate);
  if (result.errors.length && !result.games.length) throw new Error(result.errors.join(" · "));
  return result.games;
}

export async function getEspnFootballMatches(leagueId, seoulDate) {
  if (!seoulDate || !ESPN_LEAGUE_PATHS[leagueId]?.startsWith("soccer/")) return [];
  const result = await getLeagueSchedule(leagueId, seoulDate);
  if (result.errors.length) throw new Error(result.errors.join(" · "));
  return result.games;
}

export async function getEspnNbaGamesForSeoulDate(seoulDate) {
  if (!seoulDate) return [];
  const result = await getLeagueSchedule("nba", seoulDate);
  if (result.errors.length) throw new Error(result.errors.join(" · "));
  return result.games;
}

export async function getEspnFootballLiveMatches() {
  const result = await getEspnFootballScheduleForDate(getSeoulDateKey());
  return result.games.filter((game) => game.status === "IN_PLAY");
}

export async function getEspnFootballTeams(leagueId, season) {
  const path = ESPN_LEAGUE_PATHS[leagueId];
  if (!path?.startsWith("soccer/")) return [];
  const params = { limit: "1000", ...(season ? { season: String(season) } : {}) };
  const data = await espnFetch(`${path}/teams`, params, "teams");
  return data.sports[0].leagues[0].teams.flatMap(({ team }) => {
    const local = findEspnTeam(leagueId, team);
    return local ? [{
      ...local,
      espnTeamId: String(team.id),
      nameEn: team.displayName,
      crest: getCrest(local, team),
    }] : [];
  });
}

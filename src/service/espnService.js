import { ESPN_LEAGUE_PATHS } from "../data/espnLeagues";
import espnTeamNames from "../data/espnTeamNames.json";
import { SPORTS_LEAGUE_BY_ID } from "../data/sportsLeagues";
import { findSportsTeam } from "../data/sportsTeams";
import { listScheduleDates, loadScheduleDates } from "../data/leagueScheduleRange.js";

const ESPN_BASE = "/espn";
const ESPN_CORE_BASE = "/espn-core";
const FOOTBALL_DATA_BASE = "/football-data";
const MLS_API_BASE = "/mls-api";
const MLS_COMPETITION_ID = "MLS-COM-000001";
const OPEN_LIGA_DB_BASE = "/openliga";
const FOOTBALL_DATA_COMPETITIONS = ["ELC", "PL", "PD", "FL1", "DED", "BL1"];
const cache = new Map();
const pending = new Map();
const espnCoreCache = new Map();
const espnCorePending = new Map();
const footballDataCache = new Map();
const footballDataPending = new Map();
const mlsApiCache = new Map();
const mlsApiPending = new Map();
const openLigaCache = new Map();
const openLigaPending = new Map();
const ESPN_CORE_CACHE_MS = 6 * 60 * 60 * 1000;
const FOOTBALL_DATA_CACHE_MS = 5 * 60 * 1000;
const MLS_SCHEDULE_CACHE_MS = 5 * 60 * 1000;
const MLS_SEASON_CACHE_MS = 24 * 60 * 60 * 1000;
const OPEN_LIGA_CACHE_MS = 10 * 60 * 1000;
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

async function espnCoreFetch(path) {
  const key = path.replace(/^\/+/, "");
  const cached = espnCoreCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (espnCorePending.has(key)) return espnCorePending.get(key);

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${ESPN_CORE_BASE}/${key}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`ESPN NBA 주차 조회 오류: ${response.status}`);
      const data = await response.json();
      espnCoreCache.set(key, { data, expiresAt: Date.now() + ESPN_CORE_CACHE_MS });
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("ESPN NBA 주차 조회 시간이 초과되었습니다.", { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  espnCorePending.set(key, request);
  try {
    return await request;
  } finally {
    espnCorePending.delete(key);
  }
}

async function mlsApiFetch(path, params = {}, cacheDuration = MLS_SCHEDULE_CACHE_MS) {
  const query = new URLSearchParams(params).toString();
  const key = query ? `${path}?${query}` : path;
  const cached = mlsApiCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (mlsApiPending.has(key)) return mlsApiPending.get(key);

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${MLS_API_BASE}/${key}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`MLS 일정 조회 오류: ${response.status}`);
      const data = await response.json();
      mlsApiCache.set(key, { data, expiresAt: Date.now() + cacheDuration });
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("MLS 일정 조회 시간이 초과되었습니다.", { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  mlsApiPending.set(key, request);
  try {
    return await request;
  } finally {
    mlsApiPending.delete(key);
  }
}

async function getMlsSeasonId(year) {
  const data = await mlsApiFetch(
    `competitions/${MLS_COMPETITION_ID}/seasons`,
    {},
    MLS_SEASON_CACHE_MS,
  );
  return data.seasons?.find((season) => Number(season.season) === Number(year))?.season_id || null;
}

function getMlsMatchKey(date, homeCode, awayCode) {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp) || !homeCode || !awayCode) return "";
  return `${timestamp}|${String(homeCode).trim().toUpperCase()}|${String(awayCode).trim().toUpperCase()}`;
}

async function getMlsMatchdayMaps(seoulDate) {
  const year = Number(seoulDate.slice(0, 4));
  const seasonId = await getMlsSeasonId(year);
  if (!seasonId) return { byDateAndTeams: new Map(), byTeams: new Map() };

  const [dateFrom, dateTo] = getQueryDates(seoulDate);
  const data = await mlsApiFetch(`matches/seasons/${seasonId}`, {
    "match_date[gte]": dateFrom,
    "match_date[lte]": dateTo,
    per_page: "100",
  });
  if (!Array.isArray(data.schedule)) {
    throw new Error("MLS 경기 응답 형식이 올바르지 않습니다.");
  }

  const byDateAndTeams = new Map();
  const byTeams = new Map();
  data.schedule.forEach((match) => {
    const matchday = match.match_day ?? match.matchday;
    const homeCode = match.home_team_three_letter_code;
    const awayCode = match.away_team_three_letter_code;
    if (matchday == null || !homeCode || !awayCode) return;
    const kickoff = match.planned_kickoff_time || match.start_date;
    const dateAndTeams = getMlsMatchKey(kickoff, homeCode, awayCode);
    const teams = `${String(homeCode).trim().toUpperCase()}|${String(awayCode).trim().toUpperCase()}`;
    if (dateAndTeams) byDateAndTeams.set(dateAndTeams, matchday);
    byTeams.set(teams, matchday);
  });
  return { byDateAndTeams, byTeams };
}

async function getOpenLigaBl2MatchdayMaps(seoulDate) {
  const [year, month] = seoulDate.split("-").map(Number);
  const seasonYear = month >= 7 ? year : year - 1;
  const key = `bl2/${seasonYear}`;
  let matches;
  const cached = openLigaCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    matches = cached.matches;
  } else if (openLigaPending.has(key)) {
    matches = await openLigaPending.get(key);
  } else {
    const request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${OPEN_LIGA_DB_BASE}/getmatchdata/${key}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`OpenLigaDB 조회 오류: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("OpenLigaDB 경기 응답 형식이 올바르지 않습니다.");
        openLigaCache.set(key, { matches: data, expiresAt: Date.now() + OPEN_LIGA_CACHE_MS });
        return data;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error("OpenLigaDB 조회 시간이 초과되었습니다.", { cause: error });
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    })();
    openLigaPending.set(key, request);
    try {
      matches = await request;
    } finally {
      openLigaPending.delete(key);
    }
  }

  const byDateAndTeams = new Map();
  const byTeams = new Map();
  matches.forEach((match) => {
    const kickoff = match.matchDateTimeUTC || match.matchDateTime;
    const kickoffTime = new Date(kickoff).getTime();
    if (!Number.isFinite(kickoffTime) || getSeoulDateKey(kickoff) !== seoulDate) return;
    const homeTeam = findSportsTeam("BL2", { name: match.team1?.teamName });
    const awayTeam = findSportsTeam("BL2", { name: match.team2?.teamName });
    const matchday = match.group?.groupOrderID;
    if (!homeTeam || !awayTeam || matchday == null) return;
    const dateAndTeams = `${kickoffTime}|${homeTeam.id}|${awayTeam.id}`;
    const teams = `${homeTeam.id}|${awayTeam.id}`;
    byDateAndTeams.set(dateAndTeams, matchday);
    byTeams.set(teams, matchday);
  });
  return { byDateAndTeams, byTeams };
}

async function getNbaRegularSeasonWeek(game) {
  const seasonYear = Number(game.seasonYear);
  const gameTime = new Date(game.utcDate).getTime();
  if (!Number.isInteger(seasonYear) || !Number.isFinite(gameTime)) return "";

  const base = `sports/basketball/leagues/nba/seasons/${seasonYear}/types/2/weeks`;
  try {
    const firstWeek = await espnCoreFetch(`${base}/1?lang=en&region=us`);
    const firstWeekStart = new Date(firstWeek.startDate).getTime();
    if (!Number.isFinite(firstWeekStart)) return "";

    // ESPN이 제공하는 1주차 시작일을 기준으로 후보 주차를 찾고,
    // 해당 주차 응답의 실제 시작·종료 시각으로 최종 확인합니다.
    const approximateWeek = Math.floor((gameTime - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const candidateNumbers = [...new Set([approximateWeek - 1, approximateWeek, approximateWeek + 1])]
      .filter((number) => number >= 1);
    const candidates = await Promise.all(candidateNumbers.map((number) =>
      espnCoreFetch(`${base}/${number}?lang=en&region=us`).catch(() => null),
    ));
    const week = candidates.find((candidate) => {
      if (!candidate?.startDate || !candidate?.endDate) return false;
      const start = new Date(candidate.startDate).getTime();
      const end = new Date(candidate.endDate).getTime();
      return gameTime >= start && gameTime <= end;
    });

    return week?.number ? `${week.number}주차` : "";
  } catch {
    return "";
  }
}

async function getNbaScheduleSegment(game) {
  const phase = String(game.seasonPhase ?? "").toLowerCase();
  const seasonType = String(game.seasonType ?? "");
  if (seasonType === "1" || /pre.?season/.test(phase)) return "프리시즌";
  if (seasonType === "2" || /regular.?season/.test(phase)) {
    return getNbaRegularSeasonWeek(game);
  }
  if (seasonType === "3" || /post.?season|play.?offs/.test(phase)) return "플레이오프";
  return "";
}

async function getFootballDataMatches(seoulDate, lastSeoulDate = seoulDate) {
  const [dateFrom] = getQueryDates(seoulDate);
  // dateTo는 해당 날짜의 시작 시각까지이므로 다음 날을 경계로 조회합니다.
  // 한국 시간 하루에 걸치는 UTC 날짜를 모두 받은 뒤 아래에서 다시 좁힙니다.
  const endDate = parseDateKey(lastSeoulDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const dateTo = endDate.toISOString().slice(0, 10);
  const query = new URLSearchParams({
    competitions: FOOTBALL_DATA_COMPETITIONS.join(","),
    dateFrom,
    dateTo,
  }).toString();
  const key = `matches?${query}`;
  const cached = footballDataCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.matches;
  if (footballDataPending.has(key)) return footballDataPending.get(key);

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        `${FOOTBALL_DATA_BASE}/${key}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error(`Football-Data 조회 오류: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.matches)) {
        throw new Error("Football-Data 경기 응답 형식이 올바르지 않습니다.");
      }
      const matches = data.matches.filter((match) => {
        if (!match.utcDate) return false;
        const date = getSeoulDateKey(match.utcDate);
        return date >= seoulDate && date <= lastSeoulDate;
      });
      footballDataCache.set(key, {
        matches,
        expiresAt: Date.now() + FOOTBALL_DATA_CACHE_MS,
      });
      return matches;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Football-Data 조회 시간이 초과되었습니다.", { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  footballDataPending.set(key, request);
  try {
    return await request;
  } finally {
    footballDataPending.delete(key);
  }
}

function normalizeFootballDataStatus(value = "") {
  const status = String(value).toUpperCase();
  if (/^(IN_PLAY|PAUSED|EXTRA_TIME|PENALTY_SHOOTOUT)$/.test(status)) return "IN_PLAY";
  if (/^(FINISHED|FINISHED_AET|FINISHED_PEN|AWARDED)$/.test(status)) return "FINISHED";
  if (/POSTPONED|DELAYED/.test(status)) return "POSTPONED";
  if (/CANCEL/.test(status)) return "CANCELED";
  if (/SUSPEND|ABANDON/.test(status)) return "SUSPENDED";
  return "SCHEDULED";
}

function normalizeFootballDataMatch(competitionCode, match) {
  const league = SPORTS_LEAGUE_BY_ID[competitionCode];
  const homeTeam = findSportsTeam(competitionCode, {
    teamId: match.homeTeam?.id,
    name: match.homeTeam?.name,
  });
  const awayTeam = findSportsTeam(competitionCode, {
    teamId: match.awayTeam?.id,
    name: match.awayTeam?.name,
  });
  const date = new Date(match.utcDate);
  if (!league || match.id == null || !homeTeam || !awayTeam || !Number.isFinite(date.getTime())) {
    return null;
  }

  const status = normalizeFootballDataStatus(match.status);
  return {
    gameId: `football-data:${competitionCode}:${match.id}`,
    sourceProvider: "football-data",
    sourceEventId: String(match.id),
    competitionCode,
    competitionName: league.name,
    matchday: match.matchday ?? "",
    stage: match.stage || "",
    status,
    statusDetail: match.status || "",
    utcDate: date.toISOString(),
    startTime: date.toISOString(),
    home: {
      id: homeTeam.id,
      teamId: homeTeam.teamId,
      name: homeTeam.name,
      nameEn: match.homeTeam.name || "",
      crest: homeTeam.logoPath || match.homeTeam.crest || "",
      score: getScore(match.score?.fullTime?.home, status),
    },
    away: {
      id: awayTeam.id,
      teamId: awayTeam.teamId,
      name: awayTeam.name,
      nameEn: match.awayTeam.name || "",
      crest: awayTeam.logoPath || match.awayTeam.crest || "",
      score: getScore(match.score?.fullTime?.away, status),
    },
  };
}

async function getFootballDataSchedule(competitionCode, seoulDate, lastSeoulDate = seoulDate) {
  const matches = await getFootballDataMatches(seoulDate, lastSeoulDate);
  const games = matches
    .filter((match) => match.competition?.code === competitionCode)
    .map((match) => normalizeFootballDataMatch(competitionCode, match))
    .filter((game) => game && getSeoulDateKey(game.utcDate) >= seoulDate && getSeoulDateKey(game.utcDate) <= lastSeoulDate);
  return { games: uniqueGames(games), errors: [] };
}

function findEspnTeam(leagueId, team = {}) {
  const names = leagueId === "nba"
    ? espnTeamNames.nba
    : leagueId === "nfl" ? espnTeamNames.nfl : espnTeamNames.soccer;
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

export function getScheduleStageLabel(value) {
  const slug = String(value || "").trim().toLowerCase().replace(/[ _]+/g, "-");
  const labels = {
    "first-round": "1라운드",
    "round-one": "1라운드",
    "second-round": "2라운드",
    "round-two": "2라운드",
    "third-round": "3라운드",
    "fourth-round": "4라운드",
    "fifth-round": "5라운드",
    "sixth-round": "6라운드",
    "seventh-round": "7라운드",
    "eighth-round": "8라운드",
    "ninth-round": "9라운드",
    "tenth-round": "10라운드",
    "round-of-64": "64강",
    "round-of-32": "32강",
    "round-of-16": "16강",
    "quarter-final": "8강",
    "quarter-finals": "8강",
    "quarterfinal": "8강",
    "quarterfinals": "8강",
    "semi-final": "4강",
    "semi-finals": "4강",
    "semifinal": "4강",
    "semifinals": "4강",
    final: "결승",
    "regular-season": "정규시즌",
    "pre-season": "프리시즌",
    preseason: "프리시즌",
    "post-season": "플레이오프",
    postseason: "플레이오프",
    "play-offs": "플레이오프",
    playoffs: "플레이오프",
    "league-stage": "리그 스테이지",
    "group-stage": "조별리그",
    "wild-card": "와일드카드",
    "wild-card-round": "와일드카드",
    "conference-semifinals": "컨퍼런스 준결승",
    "conference-finals": "컨퍼런스 결승",
  };
  if (labels[slug]) return labels[slug];
  const roundOf = slug.match(/(?:round|rd)-of-(\d+)/);
  return roundOf ? `${roundOf[1]}강` : "";
}

function getAfcMatchday(event, competition, status) {
  if (!["league-stage", "group-stage"].includes(event.season?.slug)) return "";

  const playedMatches = (competition?.competitors || []).flatMap((competitor) => {
    const records = Array.isArray(competitor.records)
      ? competitor.records
      : competitor.records ? [competitor.records] : [];
    const record = records.find((item) => item.type === "total") || records[0];
    const values = String(record?.summary || "").match(/^\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (!values) return [];
    return [values.slice(1).reduce((total, value) => total + Number(value), 0)];
  });

  if (!playedMatches.length) return "";
  const completedMatches = status === "FINISHED";
  const matchesPlayed = completedMatches
    ? Math.max(...playedMatches)
    : Math.min(...playedMatches) + 1;
  return matchesPlayed > 0 ? matchesPlayed : "";
}

export function getEspnScheduleUnitFields(leagueId, event) {
  const competition = event.competitions?.[0] || {};
  const status = getStatus(competition.status || event.status || {});
  const afcMatchday = ["acle", "acl2"].includes(leagueId) ? getAfcMatchday(event, competition, status) : "";
  const week = event.week?.number ?? competition.week?.number ?? "";
  const phase = event.season?.slug || "";
  let segment = getScheduleStageLabel(phase);
  if (leagueId === "mls" && segment && !/regular|pre.?season/.test(phase)) segment = `플레이오프 ${segment}`;
  return {
    competitionCode: leagueId,
    matchday: event.week?.number ?? competition.week?.number ?? event.week?.text ?? competition.week?.text ?? afcMatchday,
    scheduleSegment: leagueId === "nfl" && week ? `${week}주차` : afcMatchday ? `${afcMatchday}라운드` : segment,
    stage: leagueId === "nfl" && week ? `${week}주차` : competition.type?.text || segment,
    seasonYear: event.season?.year ?? null,
    seasonType: event.season?.type?.id ?? event.season?.type ?? "",
    seasonPhase: phase,
    status,
    utcDate: event.date || competition.date,
  };
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
  const eventStatus = competition.status || event.status || {};
  const status = getStatus(eventStatus);
  const normalizeCompetitor = (local, remote) => ({
    id: local.id,
    teamId: local.teamId,
    espnTeamId: String(remote.team.id),
    sourceTeamCode: remote.team.abbreviation || "",
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
    // ESPN 응답에 포함된 경기 주차를 그대로 전달합니다. 주차가 없으면
    // 화면에서 임의의 회차를 만들지 않고 표시하지 않습니다.
    ...getEspnScheduleUnitFields(leagueId, event),
    status,
    statusDetail: eventStatus.type?.detail || "",
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

async function getEspnLeagueSchedule(leagueId, seoulDate) {
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
  const unique = uniqueGames(games);
  if (leagueId === "BL2") {
    try {
      const matchdays = await getOpenLigaBl2MatchdayMaps(seoulDate);
      return {
        games: unique.map((game) => {
          const key = `${new Date(game.utcDate).getTime()}|${game.home.id}|${game.away.id}`;
          const teams = `${game.home.id}|${game.away.id}`;
          const matchday = matchdays.byDateAndTeams.get(key) ?? matchdays.byTeams.get(teams);
          return matchday == null ? game : { ...game, matchday };
        }),
        errors,
      };
    } catch {
      // ESPN 일정을 유지하고, OpenLigaDB 회차 데이터가 조회될 때만 값을 보강합니다.
      return { games: unique, errors };
    }
  }
  if (leagueId === "mls") {
    try {
      const matchdays = await getMlsMatchdayMaps(seoulDate);
      return {
        games: unique.map((game) => {
          const homeCode = game.home.sourceTeamCode;
          const awayCode = game.away.sourceTeamCode;
          const key = getMlsMatchKey(game.utcDate, homeCode, awayCode);
          const teamKey = `${String(homeCode).trim().toUpperCase()}|${String(awayCode).trim().toUpperCase()}`;
          const matchday = matchdays.byDateAndTeams.get(key) ?? matchdays.byTeams.get(teamKey);
          return matchday == null ? game : { ...game, matchday };
        }),
        errors,
      };
    } catch {
      // ESPN 일정은 그대로 표시하고, MLS API 회차 데이터가 조회될 때만 라운드를 덧붙입니다.
      return { games: unique, errors };
    }
  }
  if (leagueId !== "nba") return { games: unique, errors };

  const gamesWithScheduleSegments = await Promise.all(unique.map(async (game) => ({
    ...game,
    scheduleSegment: await getNbaScheduleSegment(game) || game.scheduleSegment,
  })));
  return { games: gamesWithScheduleSegments, errors };
}

async function getLeagueSchedule(leagueId, seoulDate) {
  if (!ESPN_LEAGUE_PATHS[leagueId]) return { games: [], errors: [] };
  if (FOOTBALL_DATA_COMPETITIONS.includes(leagueId)) {
    try {
      return await getFootballDataSchedule(leagueId, seoulDate);
    } catch (footballDataError) {
      const fallback = await getEspnLeagueSchedule(leagueId, seoulDate);
      if (!fallback.errors.length) return fallback;
      const leagueName = SPORTS_LEAGUE_BY_ID[leagueId]?.name || leagueId;
      return {
        games: fallback.games,
        errors: [
          `${leagueName}: Football-Data 조회 실패(${footballDataError?.message || "오류"}), ESPN 대체 조회도 실패했습니다.`,
          ...fallback.errors,
        ],
      };
    }
  }
  return getEspnLeagueSchedule(leagueId, seoulDate);
}

export async function getEspnScheduleForRange(leagueId, from, to, { signal } = {}) {
  const dates = listScheduleDates(from, to);
  if (!ESPN_LEAGUE_PATHS[leagueId] || signal?.aborted) return { games: [], errors: [] };
  const loadEspnRange = (rangeFrom, rangeTo) => loadScheduleDates({
    from: rangeFrom, to: rangeTo, signal,
    loadSchedule: (date) => getEspnLeagueSchedule(leagueId, date),
  });
  if (!FOOTBALL_DATA_COMPETITIONS.includes(leagueId)) return loadEspnRange(from, to);

  // Football-Data는 UTC 조회 기간을 10일로 제한하므로 한국 날짜 9일씩 나눕니다.
  const chunks = [];
  for (let index = 0; index < dates.length; index += 9) {
    chunks.push({ from: dates[index], to: dates[Math.min(index + 8, dates.length - 1)] });
  }
  const results = await Promise.all(chunks.map(async (range) => {
    if (signal?.aborted) return { games: [], errors: [] };
    try {
      return await getFootballDataSchedule(leagueId, range.from, range.to);
    } catch {
      if (signal?.aborted) return { games: [], errors: [] };
      return loadEspnRange(range.from, range.to);
    }
  }));
  return {
    games: uniqueGames(results.flatMap((result) => result.games)),
    errors: [...new Set(results.flatMap((result) => result.errors))],
  };
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
  if (!path?.startsWith("soccer/") && leagueId !== "nfl") return [];
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

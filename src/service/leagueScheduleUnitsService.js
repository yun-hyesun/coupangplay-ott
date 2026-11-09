import { getEspnScheduleForRange, getEspnScheduleUnitFields, getScheduleStageLabel } from "./espnService";
import { getKleagueScheduleMonth, getKleagueScheduleUnitFields } from "./sportsService";
import { getF1SeasonScheduleUnits } from "./f1Service";
import { getVideoDateKey } from "../data/leagueVideoGroups";
import { buildScheduleUnitOptions, hasMatchStarted } from "../data/leagueScheduleUnits";
import { ESPN_LEAGUE_PATHS } from "../data/espnLeagues";
import { getFootballDataSeason } from "./footballDataSeasonService";

const FOOTBALL_DATA_LEAGUES = new Set(["PL", "PD", "BL1", "FL1", "DED", "ELC"]);
const CACHE_MS = 5 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60 * 1000;
const STORAGE_PREFIX = "sports-rounds:v1:";
const cache = new Map();
const pending = new Map();
const failures = new Map();
const jsonCache = new Map();
const jsonPending = new Map();

function readRoundCache(leagueId, now) {
  if (!FOOTBALL_DATA_LEAGUES.has(leagueId) || typeof window === "undefined") return null;
  try {
    const entry = JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + leagueId));
    const [year, month] = getVideoDateKey(now).split("-").map(Number);
    if (!entry || !Number.isFinite(entry.at) || now < entry.at || now - entry.at >= STALE_MS
      || entry.leagueId !== leagueId || entry.data?.source !== "Football-Data"
      || Number(entry.data.seasonYear) !== (month >= 7 ? year : year - 1)
      || !Array.isArray(entry.data.matches) || entry.data.matches.some(game =>
        !Number.isInteger(game.matchday) || game.matchday < 1 || game.matchday > 100
        || !Number.isFinite(Date.parse(game.utcDate)) || !/^(FINISHED|IN_PLAY|PAUSED)$/.test(game.status))) return null;
    return entry;
  } catch { return null; }
}

function writeRoundCache(leagueId, entry) {
  if (!FOOTBALL_DATA_LEAGUES.has(leagueId) || typeof window === "undefined") return;
  try {
    // Persist only the evidence needed for round options, without teams, credentials or scores.
    const matches = entry.data.matches.filter(game => Number.isInteger(Number(game.matchday)) && Number(game.matchday) > 0 && Number(game.matchday) <= 100
      && Number.isFinite(Date.parse(game.utcDate)) && /^(FINISHED|IN_PLAY|PAUSED)$/.test(game.status))
      .map(game => ({ matchday: Number(game.matchday), utcDate: game.utcDate, status: game.status }));
    window.localStorage.setItem(STORAGE_PREFIX + leagueId, JSON.stringify({ leagueId, at: entry.at, data: { ...entry.data, matches } }));
  } catch { /* A blocked or full browser cache must not prevent a successful API result. */ }
}

async function requestJson(path) {
  const saved = jsonCache.get(path);
  if (saved && Date.now() - saved.at < CACHE_MS) return saved.data;
  if (jsonPending.has(path)) return jsonPending.get(path);
  const request = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(path, { signal: controller.signal });
      if (!response.ok) throw new Error("경기 구분 정보를 불러오지 못했습니다.");
      const data = await response.json();
      if (jsonCache.size >= 200) jsonCache.delete(jsonCache.keys().next().value);
      jsonCache.set(path, { data, at: Date.now() });
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("경기 구분 조회 시간이 초과되었습니다.", { cause: error });
      throw error;
    } finally { clearTimeout(timer); }
  })().finally(() => jsonPending.delete(path));
  jsonPending.set(path, request);
  return request;
}

async function loadEspnSeason(leagueId, now) {
  const path = ESPN_LEAGUE_PATHS[leagueId];
  if (!path) return { matches: [], source: "", field: "" };
  const calendarYear = Number(getVideoDateKey(now).slice(0, 4));
  const data = await requestJson(`/espn/${path}/scoreboard?dates=${calendarYear}&limit=1000`);
  if (!Array.isArray(data.events)) throw new Error("경기 구분 응답 형식이 올바르지 않습니다.");
  const season = data.leagues?.[0]?.season;
  const seasonYear = Number(season?.year);
  const firstYear = Number(season?.startDate?.slice(0, 4));
  let events = data.events;
  if (firstYear && firstYear < calendarYear) {
    const previous = await requestJson(`/espn/${path}/scoreboard?dates=${firstYear}&limit=1000`);
    events = [...(previous.events || []), ...events];
  }
  const unique = [...new Map(events.map(event => [event.id, event])).values()];
  return { matches: unique.filter(event => !seasonYear || Number(event.season?.year) === seasonYear).map(event => getEspnScheduleUnitFields(leagueId, event)), source: "ESPN", field: ["acle", "acl2"].includes(leagueId) ? "competitors.records.summary / season.slug" : "season.slug / week.number", seasonYear };
}

async function loadWeeks(leagueId, now) {
  const path = ESPN_LEAGUE_PATHS[leagueId];
  const today = getVideoDateKey(now).replaceAll("-", "");
  const data = await requestJson(`/espn/${path}/scoreboard?dates=${today}&limit=1000`);
  const season = data.leagues?.[0]?.season;
  const year = Number(season?.year);
  const type = String(season?.type?.id ?? season?.type?.type ?? "");
  if (!year || !/^\d+$/.test(type)) throw new Error("현재 시즌의 주차 정보를 확인할 수 없습니다.");
  const [sport, league] = path.split("/");
  const typePath = `/espn-core/sports/${sport}/leagues/${league}/seasons/${year}/types/${type}`;
  const phase = await requestJson(typePath);
  if (leagueId === "nba" && type !== "2") return { phase: { startDate: phase.startDate, label: getScheduleStageLabel(phase.slug || phase.name) }, matches: [], source: "ESPN", field: "season.type / season.slug / startDate", seasonYear: year };
  let week = phase.week;
  if (!week?.startDate && week?.number) week = await requestJson(`${typePath}/weeks/${week.number}`);
  if (week?.startDate && Date.parse(week.startDate) > now && Number(week.number) > 1) week = await requestJson(`${typePath}/weeks/${Number(week.number) - 1}`);
  if (!Number.isInteger(Number(week?.number)) || Number(week.number) < 1 || Number(week.number) > 60 || !week.startDate) throw new Error("현재 주차 정보를 확인할 수 없습니다.");
  return { week, source: "ESPN", field: "season.year / season.type / week.number / week.startDate", seasonYear: year, matches: [] };
}

async function loadKleague(leagueId, now) {
  const [year, month] = getVideoDateKey(now).split("-").map(Number);
  for (let number = month; number >= 1; number--) {
    const raw = await getKleagueScheduleMonth(leagueId.endsWith("1") ? "1" : "2", year, number);
    const matches = raw.map(getKleagueScheduleUnitFields);
    if (matches.some(game => hasMatchStarted(game, now)) || number === 1) return { matches, source: "K리그", field: "roundId / gameDate / gameTime / gameStatus", seasonYear: year };
  }
}

async function loadBl2(now) {
  const [year, month] = getVideoDateKey(now).split("-").map(Number);
  const seasonYear = month >= 7 ? year : year - 1;
  const raw = await requestJson(`/openliga/getmatchdata/bl2/${seasonYear}`);
  if (!Array.isArray(raw)) throw new Error("경기 라운드 응답 형식이 올바르지 않습니다.");
  const matches = raw.map(game => ({ competitionCode: "BL2", matchday: game.group?.groupOrderID, utcDate: game.matchDateTimeUTC || game.matchDateTime, status: game.matchIsFinished ? "FINISHED" : "SCHEDULED" }));
  const today = getVideoDateKey(now);
  const live = await getEspnScheduleForRange("BL2", today, today).catch(() => ({ games: [] }));
  return { matches: [...matches, ...live.games], source: "OpenLigaDB · ESPN", field: "group.groupOrderID / matchday", seasonYear };
}

async function loadMls(now) {
  const [year, month] = getVideoDateKey(now).split("-").map(Number);
  const seasons = await requestJson("/mls-api/competitions/MLS-COM-000001/seasons");
  const id = seasons.seasons?.find(season => Number(season.season) === year)?.season_id;
  const stageData = await loadEspnSeason("mls", now);
  if (!id) return stageData;
  for (let number = month; number >= 1; number--) {
    const from = `${year}-${String(number).padStart(2, "0")}-01`;
    const end = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
    const matches = [];
    let token = "";
    const seen = new Set();
    do {
      const params = new URLSearchParams({ "match_date[gte]": from, "match_date[lte]": end, per_page: "100", ...(token ? { page_token: token } : {}) });
      const data = await requestJson(`/mls-api/matches/seasons/${id}?${params}`);
      if (!Array.isArray(data.schedule)) throw new Error("MLS 경기 구분 응답 형식이 올바르지 않습니다.");
      matches.push(...data.schedule.map(game => ({ competitionCode: "mls", matchday: game.match_day ?? game.matchday, utcDate: game.planned_kickoff_time || game.start_date,
        status: /finalWhistle|finished|ended/i.test(game.match_status || "") ? "FINISHED" : /firstHalf|secondHalf|halfTime|in.?play/i.test(game.match_status || "") ? "IN_PLAY" : "SCHEDULED" })));
      token = data.next_page_token || "";
      if (token && seen.has(token)) throw new Error("MLS 경기 목록의 다음 페이지를 확인할 수 없습니다.");
      seen.add(token);
    } while (token);
    if (matches.some(game => hasMatchStarted(game, now))) return { ...stageData, matches: [...matches, ...stageData.matches.filter(game => game.seasonPhase !== "regular-season")], source: "MLS · ESPN", field: "match_day / season.slug" };
  }
  return stageData;
}

async function loadRoundData(leagueId, now) {
  if (FOOTBALL_DATA_LEAGUES.has(leagueId)) {
    const [year, month] = getVideoDateKey(now).split("-").map(Number);
    const seasonYear = month >= 7 ? year : year - 1;
    const data = await getFootballDataSeason(leagueId, seasonYear);
    const season = String(data.filters?.season || seasonYear);
    return { matches: data.matches.filter(game => (!season || !game.season?.startDate || game.season.startDate.startsWith(season)) && (!game.stage || game.stage === "REGULAR_SEASON")), source: "Football-Data", field: "matchday / utcDate / status", seasonYear: season };
  }
  if (leagueId === "nba" || leagueId === "nfl") return loadWeeks(leagueId, now);
  if (leagueId === "f1") return { matches: await getF1SeasonScheduleUnits(Number(getVideoDateKey(now).slice(0, 4))), source: "Jolpica", field: "round / date / time" };
  if (leagueId.startsWith("kleague-")) return loadKleague(leagueId, now);
  if (leagueId === "BL2") return loadBl2(now);
  if (leagueId === "mls") return loadMls(now);
  return loadEspnSeason(leagueId, now);
}

export async function getLeagueRoundOptions(leagueId, now = Date.now(), { force = false } = {}) {
  let saved = cache.get(leagueId) || readRoundCache(leagueId, now);
  if (saved && (now < saved.at || now - saved.at >= STALE_MS)) saved = null;
  if (saved && FOOTBALL_DATA_LEAGUES.has(leagueId) && saved.data.seasonYear) {
    const [year, month] = getVideoDateKey(now).split("-").map(Number);
    if (Number(saved.data.seasonYear) !== (month >= 7 ? year : year - 1)) saved = null;
  }
  if (saved) cache.set(leagueId, saved);
  let warning = "";
  if (!saved || now < saved.at || now - saved.at >= CACHE_MS) {
    try {
      const failed = failures.get(leagueId);
      if (!force && failed && now >= failed.at && now - failed.at < FAILURE_RETRY_MS) throw failed.error;
      let request = pending.get(leagueId);
      if (!request) {
        request = loadRoundData(leagueId, now).then(data => {
          const entry = { data, at: now };
          cache.set(leagueId, entry);
          writeRoundCache(leagueId, entry);
          failures.delete(leagueId);
          return entry;
        }).catch(error => {
          if (error.name === "AbortError" || error.name === "TimeoutError") error = new Error("경기 구분 조회 시간이 초과되었습니다.", { cause: error });
          failures.set(leagueId, { at: now, error });
          throw error;
        }).finally(() => pending.delete(leagueId));
        pending.set(leagueId, request);
      }
      saved = await request;
    } catch (error) {
      if (!saved) throw error;
      warning = "라운드 갱신이 지연되어 마지막으로 확인한 값을 표시합니다.";
    }
  }
  const data = saved.data;
  let units;
  if (data.phase) {
    const label = Date.parse(data.phase.startDate) <= now ? data.phase.label : "";
    units = { options: label ? [{ value: `stage:${label}`, label, kind: "stage" }] : [], currentLabel: label };
  } else if (data.week) {
    const number = Date.parse(data.week.startDate) <= now ? Number(data.week.number) : 0;
    units = { options: Array.from({ length: number }, (_, index) => ({ value: `week:${index + 1}`, label: `${index + 1}주차`, kind: "week", number: index + 1 })), currentLabel: number ? `${number}주차` : "" };
  } else units = buildScheduleUnitOptions(data.matches, now);
  return { ...units, source: data.source, field: data.field, seasonYear: data.seasonYear, checkedAt: new Date(saved.at).toISOString(), unavailable: !units.options.length, stale: Boolean(warning), warning };
}

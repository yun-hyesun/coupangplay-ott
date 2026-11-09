import { SPORTS_LEAGUES } from "../data/sportsLeagues";
import { ESPN_LEAGUE_PATHS } from "../data/espnLeagues";
import { getScheduleGameDate } from "../data/leagueScheduleRange";
import { getPublishedLeagueMonths, readEspnSeasonMonths } from "../data/leagueSeasonCalendar";
import { getFootballDataSeason } from "./footballDataSeasonService";
import { getF1SeasonScheduleUnits } from "./f1Service";
import { getKleagueScheduleMonth } from "./sportsService";

const SUPPORTED = new Set(SPORTS_LEAGUES.map(league => league.id));
const FOOTBALL_DATA = new Set(["PL", "PD", "BL1", "FL1", "DED", "ELC"]);
const keyFor = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
const withTimeout = async (request, milliseconds) => {
  let timer;
  try {
    return await Promise.race([request, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("경기 일정 조회 시간이 초과되었습니다.")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
};

async function loadEspnRange(leagueId, year, firstMonth) {
  const params = new URLSearchParams({ dates: `${year}${String(firstMonth).padStart(2, "0")}01`, limit: "1000" });
  const response = await fetch(`/espn/${ESPN_LEAGUE_PATHS[leagueId]}/scoreboard?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("리그 경기 일정을 확인하지 못했습니다.");
  const data = await response.json();
  if (!Array.isArray(data.events)) throw new Error("경기 일정 응답 형식이 올바르지 않습니다.");
  return {
    games: data.events.map(event => ({ gameId: event.id, utcDate: event.competitions?.[0]?.date || event.date })),
    ...readEspnSeasonMonths(leagueId, data.leagues?.[0]), source: "ESPN 시즌 달력",
  };
}

async function loadFootballSeason(leagueId, season) {
  const data = await getFootballDataSeason(leagueId, season);
  if (data.filters?.season != null && Number(data.filters.season) !== season) throw new Error("조회한 시즌과 응답 시즌이 다릅니다.");
  return {
    games: data.matches.filter(match => !match.competition?.code || match.competition.code === leagueId)
      .map(match => ({ gameId: match.id, utcDate: match.utcDate })),
    complete: data.resultSet?.count == null || Number(data.resultSet.count) <= data.matches.length,
    source: "Football-Data",
  };
}

async function loadKleagueMonth(leagueId, year, month) {
  const published = getPublishedLeagueMonths(leagueId, year);
  let matches;
  try { matches = await withTimeout(getKleagueScheduleMonth(leagueId.endsWith("1") ? "1" : "2", year, month), 15000); }
  catch (error) { if (!published) throw error; matches = []; }
  return {
    games: matches.map(match => ({ gameId: match.gameId, dateKey: String(match.gameDate || "").replaceAll(".", "-") })),
    activeMonths: published?.filter(value => value === keyFor(year, month)) || [],
    complete: Boolean(published) || matches.length > 0,
    source: published ? "K리그 공식 시즌 일정" : "K리그",
  };
}

export function createLeagueMonthService({
  football = loadFootballSeason, espn = loadEspnRange, kleague = loadKleagueMonth,
  f1 = async year => ({ games: await getF1SeasonScheduleUnits(year), complete: true, source: "Jolpica" }),
  now = Date.now,
} = {}) {
  const cache = new Map();
  const pending = new Map();

  async function build(leagueId, year) {
    const months = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [keyFor(year, index + 1), "unknown"]));
    const counts = Object.fromEntries(Object.keys(months).map(month => [month, 0]));
    const seen = new Set();
    const sources = new Set();
    const tasks = [];
    let accepting = true;
    function record(packet, first, last) {
      if (!accepting) return;
      if (!Array.isArray(packet.games)) throw new Error("경기 일정 응답 형식이 올바르지 않습니다.");
      if (packet.source) sources.add(packet.source);
      if (packet.complete && packet.games.every(game => getScheduleGameDate(game))) for (let number = first; number <= last; number++) {
        const month = keyFor(year, number);
        if (months[month] !== "active") months[month] = "inactive";
      }
      for (const month of packet.activeMonths || []) if (Object.hasOwn(months, month)) months[month] = "active";
      for (const game of packet.games) {
        const date = getScheduleGameDate(game);
        const month = date?.slice(0, 7);
        if (!Object.hasOwn(months, month)) continue;
        const key = `${game.gameId || ""}:${game.utcDate || game.dateKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        months[month] = "active";
        counts[month]++;
      }
    }
    if (FOOTBALL_DATA.has(leagueId)) {
      for (const [season, first, last] of [[year - 1, 1, 6], [year, 7, 12]]) tasks.push(async () => {
        let packet;
        try { packet = await football(leagueId, season); }
        catch { packet = await espn(leagueId, year, first, last); }
        record(packet, first, last);
      });
    } else if (leagueId === "f1") {
      tasks.push(async () => record(await f1(year), 1, 12));
    } else if (leagueId.startsWith("kleague-")) {
      for (let month = 1; month <= 12; month++) tasks.push(async () => record(await kleague(leagueId, year, month), month, month));
    } else {
      // Quarterly calendar snapshots cover both sides of seasons without fetching every fixture.
      for (let first = 1; first <= 12; first += 3) tasks.push(async () => record(await espn(leagueId, year, first, first + 2), first, first + 2));
    }
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(2, tasks.length) }, async () => {
      while (index < tasks.length) {
        const task = tasks[index++];
        try { await withTimeout(task(), 35000); } catch { /* Unverified months remain unknown. */ }
      }
    }));
    accepting = false;
    return { leagueId, year, months, counts, sources: [...sources], checkedAt: new Date(now()).toISOString() };
  }

  async function getYear(leagueId, year, { signal, force = false } = {}) {
    signal?.throwIfAborted();
    if (!SUPPORTED.has(leagueId) || !Number.isInteger(year) || year < 2010 || year > 2100) throw new Error("조회할 리그와 연도를 확인해 주세요.");
    const key = `${leagueId}:${year}`;
    const saved = cache.get(key);
    if (!force && saved && now() - saved.at < saved.ttl) return saved.data;
    let request = pending.get(key);
    if (!request) {
      request = build(leagueId, year).then(data => {
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { data, at: now(), ttl: Object.values(data.months).includes("unknown") ? 60000 : 12 * 60 * 60 * 1000 });
        return data;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
    }
    const data = await request;
    signal?.throwIfAborted();
    return data;
  }

  async function getNeighbors(leagueId, month, maxMonth, { signal, force = false } = {}) {
    const year = Number(month.slice(0, 4));
    const current = await getYear(leagueId, year, { signal, force });
    const active = data => Object.keys(data.months).filter(value => data.months[value] === "active" && value >= "2010-01" && value <= maxMonth).sort();
    let previous = active(current).filter(value => value < month).at(-1) || null;
    let next = active(current).find(value => value > month) || null;
    if (Object.values(current.months).every(value => value === "unknown")) return { previous, next, status: "unknown", incomplete: true };
    if (!previous && year > 2010) previous = active(await getYear(leagueId, year - 1, { signal })).at(-1) || null;
    if (!next && year < Number(maxMonth.slice(0, 4))) next = active(await getYear(leagueId, year + 1, { signal }))[0] || null;
    return { previous, next, status: current.months[month], incomplete: Object.values(current.months).includes("unknown") };
  }
  return { getYear, getNeighbors };
}

const service = createLeagueMonthService();
export const getLeagueMonthAvailability = service.getYear;
export const getLeagueMonthNeighbors = service.getNeighbors;

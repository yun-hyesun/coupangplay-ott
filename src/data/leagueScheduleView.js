import { getScheduleGameDate, shiftScheduleDate } from "./leagueScheduleRange.js";
import { getScheduleUnit } from "./leagueScheduleUnits.js";

const CALENDAR_YEAR_LEAGUES = new Set(["f1", "mls", "kleague-1", "kleague-2"]);

export const usesCalendarSeason = leagueId => CALENDAR_YEAR_LEAGUES.has(leagueId);

export function getScheduleSeason(leagueId, dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  return usesCalendarSeason(leagueId) || month >= 7 ? year : year - 1;
}

export function getSeasonRange(leagueId, year) {
  return usesCalendarSeason(leagueId)
    ? { from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) }
    : { from: `${year}-07-01`, to: `${year + 1}-06-30`, label: `${year}-${String(year + 1).slice(-2)}` };
}

export function getScheduleRounds(games) {
  const units = new Map();
  for (const game of games) {
    const unit = getScheduleUnit(game);
    if (unit) units.set(unit.value, unit);
  }
  return [...units.values()].sort((a, b) => a.kind === b.kind && a.number && b.number ? a.number - b.number : 0);
}

export function getRecentScheduleGame(games, today) {
  const ordered = games.filter(game => getScheduleGameDate(game)).toSorted((a, b) =>
    String(a.utcDate || a.startTime || a.dateKey).localeCompare(String(b.utcDate || b.startTime || b.dateKey)));
  return ordered.find(game => /^(IN_PLAY|LIVE|PAUSED)$/.test(game.status))
    || ordered.find(game => getScheduleGameDate(game) >= today) || ordered.at(-1);
}

export function getRoundWindow(options, selectedValue, offset = 0) {
  const index = Math.max(0, options.findIndex(option => option.value === selectedValue));
  const lastStart = Math.max(0, options.length - 5);
  const centeredStart = Math.min(lastStart, Math.max(0, index - 2));
  const start = Math.min(lastStart, Math.max(0, centeredStart + offset));
  return { start, items: options.slice(start, start + 5), hasPrevious: start > 0, hasNext: start + 5 < options.length };
}

export function groupScheduleGames(games, { mode, dateKey, round }) {
  const groups = new Map();
  const seen = new Set();
  for (const game of [...games].sort((a, b) => Date.parse(a.utcDate || a.startTime) - Date.parse(b.utcDate || b.startTime))) {
    const date = getScheduleGameDate(game);
    if (!date || seen.has(game.gameId)) continue;
    seen.add(game.gameId);
    if (mode === "date" ? date !== dateKey : getScheduleUnit(game)?.value !== round) continue;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(game);
  }
  return [...groups].map(([date, matches]) => ({ date, matches }));
}

export function getCalendarDays(month) {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => shiftScheduleDate(first, index - weekday));
}

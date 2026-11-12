import { getBroadcastStatus } from "./leagueBroadcasts.js";

export const SCHEDULE_WINDOW_DAYS = 14;
const SEOUL_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
});

export function shiftScheduleDate(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new RangeError("경기 조회 날짜가 올바르지 않습니다.");
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getScheduleRange(today, tab) {
  return tab === "ended"
    ? { from: shiftScheduleDate(today, -SCHEDULE_WINDOW_DAYS), to: today }
    : { from: today, to: shiftScheduleDate(today, SCHEDULE_WINDOW_DAYS) };
}

export function listScheduleDates(from, to) {
  shiftScheduleDate(from, 0);
  shiftScheduleDate(to, 0);
  if (from > to) throw new RangeError("경기 조회 기간이 올바르지 않습니다.");
  const dates = [];
  for (let date = from; date <= to; date = shiftScheduleDate(date, 1)) dates.push(date);
  return dates;
}

export function getScheduleGameDate(game) {
  const value = game.utcDate || game.startTime;
  if (value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = Object.fromEntries(SEOUL_DATE_FORMAT.formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(game.dateKey || "") ? game.dateKey : null;
}

const gameTime = (game) => new Date(game.utcDate || game.startTime || `${game.dateKey}T00:00:00+09:00`).getTime();

export function selectScheduleMatches(games, range, tab) {
  return [...new Map(games.map((game) => [game.gameId, game])).values()]
    .filter((game) => {
      const date = getScheduleGameDate(game);
      if (!date || date < range.from || date > range.to) return false;
      if (tab === "ended") return /^(FINISHED(?:_AET|_PEN)?|FULL_TIME|FINAL|ENDED|COMPLETED?|AWARDED)$/i.test(game.status || "");
      return getBroadcastStatus(game.status) !== null;
    })
    .sort((first, second) => {
      if (tab === "ended") return gameTime(second) - gameTime(first);
      const livePriority = Number(getBroadcastStatus(second.status) === "live") - Number(getBroadcastStatus(first.status) === "live");
      return livePriority || gameTime(first) - gameTime(second);
    });
}

export function getNearestScheduleRange(games, today, tab) {
  const range = getScheduleRange(today, tab);
  if (selectScheduleMatches(games, range, tab).length) return range;
  const dates = games.map(getScheduleGameDate).filter(Boolean).sort();
  if (!dates.length) return range;
  const searchRange = tab === "ended"
    ? { from: dates[0], to: today }
    : { from: today, to: dates.at(-1) };
  const nearest = selectScheduleMatches(games, searchRange, tab)[0];
  return nearest ? getScheduleRange(getScheduleGameDate(nearest), tab) : range;
}

// 날짜별 API의 동시 요청을 3개로 제한하고, 조회에 성공한 날짜는 유지합니다.
export async function loadScheduleDates({ from, to, loadSchedule, signal }) {
  const dates = listScheduleDates(from, to);
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, dates.length) }, async () => {
    while (!signal?.aborted && next < dates.length) {
      const index = next++;
      const date = dates[index];
      try {
        const result = await loadSchedule(date);
        if (signal?.aborted) return;
        results[index] = {
          games: (result.games || []).map((game) => ({ ...game, dateKey: getScheduleGameDate(game) || date })),
          errors: result.errors || [],
        };
      } catch (error) {
        if (signal?.aborted) return;
        results[index] = { games: [], errors: [`${date}: ${error?.message || "경기 일정 조회 실패"}`] };
      }
    }
  }));
  return {
    games: [...new Map(results.flatMap((result) => result.games).map((game) => [game.gameId, game])).values()],
    errors: [...new Set(results.flatMap((result) => result.errors))],
  };
}

import { getScheduleGameDate } from "./leagueScheduleRange.js";

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

function addMonths(target, firstYear, firstMonth, lastYear, lastMonth) {
  const from = firstYear * 12 + firstMonth - 1;
  const to = lastYear * 12 + lastMonth - 1;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from || to - from > 24) return;
  for (let index = from; index <= to; index++) target.add(monthKey(Math.floor(index / 12), index % 12 + 1));
}

export function readEspnSeasonMonths(leagueId, league) {
  const months = new Set();
  if (!Array.isArray(league?.calendar)) return { activeMonths: [], complete: false };
  const firstDate = getScheduleGameDate({ utcDate: league.season?.startDate || league.calendarStartDate });
  const baseYear = Number(firstDate?.slice(0, 4));
  const baseMonth = Number(firstDate?.slice(5, 7));
  if (!baseYear || !baseMonth) return { activeMonths: [], complete: false };
  if (league.calendarType === "day") {
    const dates = league.calendar.map(value => typeof value === "string" ? getScheduleGameDate({ utcDate: value }) : null).filter(Boolean).sort();
    dates.forEach(date => months.add(date.slice(0, 7)));
    // NBA postseason dates can remain undecided after the published regular-season calendar.
    const end = getScheduleGameDate({ utcDate: league.season?.endDate || league.calendarEndDate });
    if (leagueId === "nba" && dates.length && end) addMonths(months, Number(dates[0].slice(0, 4)), Number(dates[0].slice(5, 7)), Number(end.slice(0, 4)), Number(end.slice(5, 7)));
    return { activeMonths: [...months].sort(), complete: dates.length > 0 };
  }
  let parsed = 0;
  function visit(entry) {
    if (/off.?season/i.test(entry.label || "")) return;
    if (entry.entries?.length) { entry.entries.forEach(visit); return; }
    const names = [...String(entry.detail || "").matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/gi)]
      .map(match => MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1);
    if (names.length) {
      const first = names[0], last = names.at(-1);
      const startYear = baseYear + Number(first < baseMonth);
      addMonths(months, startYear, first, startYear + Number(last < first), last);
      parsed++;
    } else {
      const start = getScheduleGameDate({ utcDate: entry.startDate });
      const endTime = Date.parse(entry.endDate) - 86400000;
      const end = Number.isFinite(endTime) ? getScheduleGameDate({ utcDate: new Date(endTime).toISOString() }) : null;
      if (start && end) { addMonths(months, Number(start.slice(0, 4)), Number(start.slice(5, 7)), Number(end.slice(0, 4)), Number(end.slice(5, 7))); parsed++; }
    }
  }
  league.calendar.forEach(visit);
  return { activeMonths: [...months].sort(), complete: parsed > 0 };
}

// Published 2026 K League season and World Cup break; used when old monthly API pages are empty.
// https://www.kleague.com/about/competition.do
// https://www.kleague.com/news_view.do?orderBy=seq&page=1&seq=95533&viewOption=album
// https://www.kleague.com/news_view.do?orderBy=seq&page=1&seq=95442&viewOption=album
// https://www.kleague.com/news_view.do?orderBy=seq&seq=96661&viewOption=album
export function getPublishedLeagueMonths(leagueId, year) {
  if (year !== 2026 || !["kleague-1", "kleague-2"].includes(leagueId)) return null;
  return [2, 3, 4, 5, 7, 8, 9, 10, 11, 12].map(month => monthKey(year, month));
}

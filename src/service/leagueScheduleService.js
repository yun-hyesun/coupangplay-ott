import { getEspnSeasonSchedule } from "./espnService";
import { getKleagueScheduleMonth, normalizeKleagueMatch } from "./sportsService";
import { getF1RacesForDate, getF1SeasonScheduleUnits } from "./f1Service";
import { getSeasonRange } from "../data/leagueScheduleView";
import { getScheduleGameDate } from "../data/leagueScheduleRange";

const cache = new Map();

export async function getLeagueSeasonSchedule(leagueId, season, { signal, force = false } = {}) {
  const key = `${leagueId}:${season}`;
  const saved = cache.get(key);
  if (!force && saved && Date.now() - saved.at < 60000) return saved.data;
  let data;
  try {
  if (leagueId.startsWith("kleague-")) {
    const results = [];
    let next = 1;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next <= 12 && !signal?.aborted) {
        const month = next++;
        try {
          const raw = await getKleagueScheduleMonth(leagueId.endsWith("1") ? "1" : "2", season, month);
          results.push({ games: raw.map(normalizeKleagueMatch).filter(Boolean), errors: [] });
        } catch { results.push({ games: [], errors: [`${month}월 경기 일정을 불러오지 못했습니다.`] }); }
      }
    }));
    data = { games: results.flatMap(result => result.games), errors: results.flatMap(result => result.errors) };
  } else if (leagueId === "f1") {
    const units = await getF1SeasonScheduleUnits(season);
    const dates = [...new Set(units.map(getScheduleGameDate).filter(Boolean))];
    const games = [];
    for (const date of dates) {
      if (signal?.aborted) break;
      games.push(...await getF1RacesForDate(date));
    }
    data = { games, errors: [] };
  } else {
    const { from, to } = getSeasonRange(leagueId, season);
    data = await getEspnSeasonSchedule(leagueId, season, from, to, { signal });
  }
  } catch (error) {
    if (signal?.aborted || !saved || Date.now() - saved.at >= 24 * 60 * 60 * 1000) throw error;
    return { ...saved.data, warning: "일정 갱신이 지연되어 마지막으로 확인한 일정을 표시합니다." };
  }
  if (!signal?.aborted) cache.set(key, { at: Date.now(), data });
  return data;
}

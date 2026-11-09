import { getLeagueRoundOptions } from "./leagueScheduleUnitsService";
import { hasMatchStarted } from "../data/leagueScheduleUnits";

export { getLeagueRoundOptions };

export function getStartedRound(matches, now = Date.now()) {
  return matches.reduce((current, match) => {
    const round = Number(match.matchday);
    return hasMatchStarted(match, now) && Number.isInteger(round) && round > 0 && round <= 100 ? Math.max(current, round) : current;
  }, 0);
}

export async function getCurrentLeagueRound(leagueId, now = Date.now(), options) {
  const data = await getLeagueRoundOptions(leagueId, now, options);
  return Math.max(0, ...data.options.map(option => option.number || 0));
}

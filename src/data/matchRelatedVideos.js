import { parseVideoMatch, getVideoDateKey, shiftVideoMonth } from "./leagueVideoGroups";
import { LEAGUE_VIDEO_QUERIES, matchesVideoLeague } from "./leagueVideoQueries";
import { getScheduleUnit } from "./leagueScheduleUnits";
import { findSportsTeam } from "./sportsTeams";

const DAY_MS = 86400000;
const RACE_NAMES = [
  [/australian/i, ["호주"]], [/chinese/i, ["중국"]], [/japanese/i, ["일본"]],
  [/bahrain/i, ["바레인"]], [/saudi/i, ["사우디"]], [/miami/i, ["마이애미"]],
  [/canadian/i, ["캐나다"]], [/monaco/i, ["모나코"]], [/barcelona|spanish/i, ["바르셀로나", "스페인"]],
  [/austrian/i, ["오스트리아"]], [/british/i, ["영국"]], [/belgian/i, ["벨기에"]],
  [/hungarian/i, ["헝가리"]], [/dutch/i, ["네덜란드"]], [/italian/i, ["이탈리아"]],
  [/madring|madrid/i, ["마드리드"]], [/azerbaijan/i, ["아제르바이잔"]], [/singapore/i, ["싱가포르"]],
  [/united states/i, ["미국", "오스틴"]], [/mexic/i, ["멕시코"]],
  [/brazilian|s[aã]o paulo/i, ["브라질", "상파울루"]], [/las vegas/i, ["라스베이거스"]],
  [/qatar/i, ["카타르"]], [/abu dhabi/i, ["아부다비"]],
];
const normalize = value => String(value || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();

export const getMatchVideoKey = game => JSON.stringify([
  game.gameId, game.competitionCode, game.utcDate || game.startTime, game.matchday,
  game.scheduleSegment, game.raceName, game.home?.name, game.away?.name,
]);

export function getMatchVideoContext(game) {
  const league = game.competitionCode;
  const home = findSportsTeam(league, game.home);
  const away = findSportsTeam(league, game.away);
  const kickoff = Date.parse(game.utcDate || game.startTime);
  const isRace = league === "f1";
  if (!LEAGUE_VIDEO_QUERIES[league] || !Number.isFinite(kickoff) || !isRace && (!home || !away || home.id === away.id)) return null;

  // Include pre-match previews and clips uploaded after the final whistle,
  // including uploads across a Korean month/year boundary.
  const from = kickoff - 3 * DAY_MS;
  const to = kickoff + 4 * DAY_MS;
  const lastMonth = getVideoDateKey(to - 1).slice(0, 7);
  const months = [getVideoDateKey(from).slice(0, 7)];
  while (months.at(-1) !== lastMonth) months.push(shiftVideoMonth(months.at(-1), 1));
  const unit = getScheduleUnit(game);
  const raceName = game.raceName || game.away?.name || "";
  const raceAliases = isRace ? [raceName, ...(RACE_NAMES.find(([pattern]) => pattern.test(raceName))?.[1] || [])].filter(Boolean) : [];
  return { league, home, away, from, to, months, isRace, raceAliases, round: unit?.kind === "round" ? unit.number : null };
}

export function selectMatchVideos(game, videos) {
  const context = getMatchVideoContext(game);
  if (!context) return [];
  const pair = context.isRace ? "" : [context.home.id, context.away.id].sort().join("|");
  const seen = new Set();
  const order = { highlight: 0, replay: 1, recommend: 2 };
  return videos.filter(video => {
    const published = Date.parse(video.publishedAt);
    if (!video.id || seen.has(video.id) || video.isShort || !Number.isFinite(published)
      || published < context.from || published >= context.to
      || !matchesVideoLeague(context.league, video.title)) return false;
    const match = parseVideoMatch(context.league, video);
    if (context.round && match.round && Number(match.round) !== context.round) return false;
    if (context.isRace) {
      const title = normalize(video.title);
      if (!/\bF1\b|그랑프리|grand prix|\bGP\b/i.test(video.title)) return false;
      if (!context.raceAliases.some(alias => title.includes(normalize(alias))) && !(context.round && Number(match.round) === context.round)) return false;
    } else if (!match.home || !match.away || [match.home.id, match.away.id].sort().join("|") !== pair) return false;
    seen.add(video.id);
    return true;
  }).sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2) || b.publishedAt.localeCompare(a.publishedAt));
}

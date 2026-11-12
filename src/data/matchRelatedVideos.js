import { parseVideoMatch, getVideoDateKey, shiftVideoMonth } from "./leagueVideoGroups";
import { LEAGUE_VIDEO_QUERIES, matchesVideoLeague } from "./leagueVideoQueries";
import { getScheduleUnit } from "./leagueScheduleUnits";
import { findSportsTeam } from "./sportsTeams";
import { getYouTubeVideoId } from "./youtubeVideoId";

const DAY_MS = 86400000;
const COUPANG_SPORTS_CHANNEL_ID = "UCnBht7BrOx-A328KFXgysqQ";

export function selectLivePreviewVideo(game, videos, now = Date.now()) {
  const league = game.competitionCode;
  const teams = [findSportsTeam(league, game.home), findSportsTeam(league, game.away)].filter(Boolean);
  const pair = teams.length === 2 ? teams.map(team => team.id).sort().join("|") : "";
  const kickoff = Date.parse(game.utcDate || game.startTime);
  const before = Number.isFinite(kickoff) ? Math.min(kickoff, now) : now;
  const seen = new Set();
  const kinds = { replay: 0, highlight: 1, recommend: 2 };
  const candidates = [];
  for (const video of videos) {
    const id = getYouTubeVideoId(video);
    const published = Date.parse(video.publishedAt);
    if (!id || seen.has(id) || video.channelId !== COUPANG_SPORTS_CHANNEL_ID || video.isShort !== false
      || !Number.isFinite(published) || published >= before || !matchesVideoLeague(league, video.title)
      || /프리뷰|preview|예고|인터뷰|interview|기자회견/i.test(video.title)) continue;
    const match = parseVideoMatch(league, video);
    const matchedTeams = [match.home, match.away].filter(Boolean);
    if (matchedTeams.length !== 2 || !teams.some(team => matchedTeams.some(candidate => candidate.id === team.id))) continue;
    seen.add(id);
    candidates.push({ video, exactPair: Boolean(pair && matchedTeams.map(team => team.id).sort().join("|") === pair), published });
  }
  return candidates.sort((a, b) => Number(b.exactPair) - Number(a.exactPair)
    || (kinds[a.video.kind] ?? 2) - (kinds[b.video.kind] ?? 2) || b.published - a.published)[0]?.video || null;
}
export const getMatchVideoKey = game => JSON.stringify([
  game.gameId, game.competitionCode, game.utcDate || game.startTime, game.matchday,
  game.scheduleSegment, game.home?.name, game.away?.name,
]);

export function getMatchVideoContext(game) {
  const league = game.competitionCode;
  const home = findSportsTeam(league, game.home);
  const away = findSportsTeam(league, game.away);
  const kickoff = Date.parse(game.utcDate || game.startTime);
  if (!LEAGUE_VIDEO_QUERIES[league] || !Number.isFinite(kickoff) || !home || !away || home.id === away.id) return null;

  // Include pre-match previews and clips uploaded after the final whistle,
  // including uploads across a Korean month/year boundary.
  const from = kickoff - 3 * DAY_MS;
  const to = kickoff + 4 * DAY_MS;
  const lastMonth = getVideoDateKey(to - 1).slice(0, 7);
  const months = [getVideoDateKey(from).slice(0, 7)];
  while (months.at(-1) !== lastMonth) months.push(shiftVideoMonth(months.at(-1), 1));
  const unit = getScheduleUnit(game);
  return { league, home, away, from, to, months, round: unit?.kind === "round" ? unit.number : null };
}

export function selectMatchVideos(game, videos) {
  const context = getMatchVideoContext(game);
  if (!context) return [];
  const pair = [context.home.id, context.away.id].sort().join("|");
  const seen = new Set();
  const order = { highlight: 0, replay: 1, recommend: 2 };
  return videos.filter(video => {
    const published = Date.parse(video.publishedAt);
    if (!video.id || seen.has(video.id) || video.isShort || !Number.isFinite(published)
      || published < context.from || published >= context.to
      || !matchesVideoLeague(context.league, video.title)) return false;
    const match = parseVideoMatch(context.league, video);
    if (context.round && match.round && Number(match.round) !== context.round) return false;
    if (!match.home || !match.away || [match.home.id, match.away.id].sort().join("|") !== pair) return false;
    seen.add(video.id);
    return true;
  }).sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2) || b.publishedAt.localeCompare(a.publishedAt));
}

import { SPORTS_TEAMS_BY_LEAGUE } from "./sportsTeams";
import { parseVideoMatch } from "./leagueVideoGroups";
import { matchesVideoLeague } from "./leagueVideoQueries";
import { getYouTubeVideoId } from "./youtubeVideoId";

const CHANNEL_ID = "UCnBht7BrOx-A328KFXgysqQ";
export const MY_TEAM_VIDEO_LIMIT = 4;

export function selectMyTeamPopularVideos(leagueId, teamId, videos) {
  if (!(SPORTS_TEAMS_BY_LEAGUE[leagueId] || []).some(team => team.id === teamId)) return [];
  const unique = new Map();
  for (const video of videos) {
    const id = getYouTubeVideoId(video);
    const viewCount = Number(video.viewCount);
    if (!id || video.isShort !== false || video.channelId !== CHANNEL_ID || video.viewCount == null || !Number.isFinite(viewCount) || viewCount < 0
      || !Number.isFinite(Date.parse(video.publishedAt)) || !matchesVideoLeague(leagueId, video.title)
      || /프리뷰|preview|예고|인터뷰|interview|기자회견/i.test(video.title || "")) continue;
    const match = parseVideoMatch(leagueId, video);
    if (!match.home || !match.away || ![match.home.id, match.away.id].includes(teamId)) continue;
    if (!unique.has(id) || unique.get(id).viewCount < viewCount) unique.set(id, { ...video, id, viewCount });
  }
  return [...unique.values()].sort((a, b) => b.viewCount - a.viewCount || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)).slice(0, MY_TEAM_VIDEO_LIMIT);
}

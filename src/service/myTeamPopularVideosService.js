import { SPORTS_TEAMS_BY_LEAGUE } from "../data/sportsTeams";
import { MY_TEAM_VIDEO_LIMIT, selectMyTeamPopularVideos } from "../data/myTeamPopularVideos";
import { getMyTeamVideoCatalogPage } from "./myTeamVideoCatalogService";

export async function getMyTeamPopularVideos(leagueId, teamIds, { signal, loadPage = getMyTeamVideoCatalogPage } = {}) {
  signal?.throwIfAborted();
  const selected = (SPORTS_TEAMS_BY_LEAGUE[leagueId] || []).filter(team => teamIds.includes(team.id));
  const groups = Array(selected.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(2, selected.length) }, async () => {
    while (!signal?.aborted && next < selected.length) {
      const index = next++;
      const team = selected[index];
      const videos = [], notices = new Set(), seen = new Set();
      let pageToken = "", error = "";
      try {
        for (let page = 0; page < 3 && !signal?.aborted; page++) {
          const result = await loadPage({ league: leagueId, scope: "team", team: team.name, order: "viewCount", ...(pageToken ? { pageToken } : {}) }, { signal });
          videos.push(...result.videos);
          if (result.notice) notices.add(result.notice);
          pageToken = result.nextPageToken || "";
          if (selectMyTeamPopularVideos(leagueId, team.id, videos).length >= MY_TEAM_VIDEO_LIMIT || !pageToken || seen.has(pageToken) || result.classificationIncomplete) break;
          seen.add(pageToken);
        }
      } catch (cause) { error = cause.message || "인기 영상을 불러오지 못했습니다."; }
      groups[index] = { team, videos: selectMyTeamPopularVideos(leagueId, team.id, videos), notice: [...notices].join(" "), error };
    }
  }));
  signal?.throwIfAborted();
  return { groups };
}

import { LEAGUE_VIDEO_QUERIES, matchesVideoLeague, matchesVideoTeam } from "../src/data/leagueVideoQueries.js";
import { getYouTubeCatalog } from "./youtube-catalog.js";

// This handler only reads SQLite. Page views, pagination and retries cannot call YouTube.
export function createMyTeamVideosHandler({ catalog, now = Date.now } = {}) {
  return async function handler(req, res) {
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "GET 요청만 지원합니다." }); }
    try {
      const params = new URL(req.url, "http://localhost").searchParams;
      const league = params.get("league"), team = params.get("team") || "", token = params.get("pageToken") || "";
      if (!Object.hasOwn(LEAGUE_VIDEO_QUERIES, league || "") || !team.trim() || team.length > 60 || /[^\p{L}\p{N}\s.'-]/u.test(team)
        || !/^(?:catalog:\d{1,7})?$/.test(token)) return res.status(400).json({ error: "마이팀 영상 조회 조건이 올바르지 않습니다." });
      const { store } = catalog || getYouTubeCatalog();
      const status = store.status(now());
      const matches = video => matchesVideoLeague(league, video.title) && matchesVideoTeam(team, video.title)
        && /\bvs\.?\b|\s대\s/i.test(video.title) && !/프리뷰|preview|예고|인터뷰|interview|기자회견/i.test(video.title);
      const videos = store.videos(now()).filter(matches);
      const classificationIncomplete = store.unclassifiedVideos(now(), videos[3]?.viewCount ?? 0).some(matches);
      const offset = token ? Number(token.slice(8)) : 0;
      const page = videos.slice(offset, offset + 50);
      const notice = !status.historyComplete ? "이전 영상 목록을 수집 중입니다. 저장된 영상부터 조회수 순으로 표시합니다."
        : classificationIncomplete ? "인기영상의 형식을 확인 중입니다. 확인된 영상부터 조회수 순으로 표시합니다."
        : status.lastError ? "저장된 인기영상을 표시하고 있습니다. 영상 정보는 자동으로 다시 갱신됩니다." : "";
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ videos: page, nextPageToken: offset + page.length < videos.length ? `catalog:${offset + page.length}` : "",
        source: "youtube-catalog", rankingScope: status.historyComplete ? status.catalogLimited ? "retained-catalog" : "catalog" : "collecting-history",
        retentionLimit: status.retentionLimit, storedVideoCount: status.discovered,
        fetchedAt: status.lastRunAt ? new Date(status.lastRunAt).toISOString() : null, historyComplete: status.historyComplete,
        shortsExcluded: true, classificationIncomplete, notice });
    } catch {
      return res.status(503).json({ error: "저장된 영상 목록을 읽지 못했습니다. 잠시 후 다시 조회해 주세요." });
    }
  };
}

export default createMyTeamVideosHandler();

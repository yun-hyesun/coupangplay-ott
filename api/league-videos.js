/* global process */
import { getVideoMonthRange, getVideoTeamQuery, LEAGUE_VIDEO_QUERIES, matchesVideoLeague, matchesVideoTeam } from "../src/data/leagueVideoQueries.js";
import { createYouTubeVideoTypeFilter } from "./youtube-video-types.js";
import { youtubeVideoTypeStore } from "./youtube-video-type-store.js";

export const COUPANG_SPORTS_CHANNEL_ID = "UCnBht7BrOx-A328KFXgysqQ";
const CACHE_MS = 20 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_SEARCH_PAGES = 3;
const MAX_UPLOAD_PAGES = 10;
const UPLOAD_CURSOR = "uploads:";
const apiError = (message, status = 502) => Object.assign(new Error(message), { status });

function durationLabel(iso = "") {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return "";
  const [, hours, minutes, seconds] = match.map(Number);
  return hours ? `${hours}:${String(minutes || 0).padStart(2, "0")}:${String(seconds || 0).padStart(2, "0")}`
    : `${String(minutes || 0).padStart(2, "0")}:${String(seconds || 0).padStart(2, "0")}`;
}

export function createLeagueVideosHandler({ apiKey, fetchImpl = (...args) => fetch(...args), now = Date.now, classifyVideos, videoTypeStore = youtubeVideoTypeStore } = {}) {
  const cache = new Map();
  const pending = new Map();
  const uploadPages = new Map();
  const pendingUploadPages = new Map();
  let uploadsPlaylist;
  let uploadsPlaylistRequest;
  let searchRetryAt = 0;
  const filterVideoTypes = classifyVideos || createYouTubeVideoTypeFilter({ fetchImpl, now, typeStore: videoTypeStore });
  async function youtube(resource, params, key) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    url.search = new URLSearchParams({ ...params, key });
    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    } catch {
      throw apiError("영상 조회 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason;
      if (response.status === 429 || /quota|dailyLimit|rateLimit/i.test(reason || "")) throw apiError("YouTube의 조회 한도에 도달했습니다. 잠시 후 다시 확인해 주세요.", 429);
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw apiError("YouTube API 연결 설정을 확인해 주세요. 현재 영상을 불러올 수 없습니다.", 503);
      }
      throw apiError("쿠팡플레이 스포츠 영상을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
    return data;
  }

  function result(collected, pageToken, unknownCount, rateLimited) {
    const videos = [...collected.values()].map(item => {
      const { title, publishedAt, thumbnails } = item.snippet;
      return {
        id: item.id, title, publishedAt, channelId: COUPANG_SPORTS_CHANNEL_ID, isShort: false,
        image: (thumbnails?.maxres || thumbnails?.standard || thumbnails?.high || thumbnails?.medium)?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${item.id}`, duration: durationLabel(item.contentDetails?.duration),
        viewCount: item.statistics?.viewCount == null ? null : Number(item.statistics.viewCount),
        kind: /풀경기|풀영상|다시보기|full\s*match/i.test(title) ? "replay" : /하이라이트|highlights?|\bHL\b/i.test(title) ? "highlight" : "recommend",
      };
    }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { videos, nextPageToken: pageToken, channelId: COUPANG_SPORTS_CHANNEL_ID, fetchedAt: new Date(now()).toISOString(),
      shortsExcluded: true, classificationIncomplete: unknownCount > 0,
      notice: rateLimited ? "유튜브 영상 확인이 잠시 제한되어 확인된 일반 영상부터 표시합니다. 잠시 후 다시 조회해 주세요."
        : unknownCount ? "쇼츠 여부를 확인하지 못한 일부 영상은 제외했습니다. 잠시 후 다시 조회해 주세요." : "" };
  }

  async function getUploadsPage(pageToken, key) {
    if (!uploadsPlaylist) {
      uploadsPlaylistRequest ||= youtube("channels", { part: "contentDetails", id: COUPANG_SPORTS_CHANNEL_ID }, key)
        .then(data => {
          const channel = data.items?.find(item => item.id === COUPANG_SPORTS_CHANNEL_ID);
          const id = channel?.contentDetails?.relatedPlaylists?.uploads;
          if (!id) throw apiError("쿠팡플레이 스포츠 업로드 목록을 불러오지 못했습니다.");
          uploadsPlaylist = id;
        }).finally(() => { uploadsPlaylistRequest = null; });
      await uploadsPlaylistRequest;
    }
    const saved = uploadPages.get(pageToken);
    if (saved && now() - saved.at < CACHE_MS) return saved.data;
    let request = pendingUploadPages.get(pageToken);
    if (!request) {
      request = youtube("playlistItems", { part: "snippet,contentDetails", playlistId: uploadsPlaylist,
        maxResults: String(PAGE_SIZE), ...(pageToken ? { pageToken } : {}) }, key).then(data => {
        if (!Array.isArray(data.items)) throw apiError("업로드 목록 응답 형식이 올바르지 않습니다.");
        if (uploadPages.size >= 150) uploadPages.delete(uploadPages.keys().next().value);
        uploadPages.set(pageToken, { data, at: now() });
        return data;
      }).finally(() => pendingUploadPages.delete(pageToken));
      pendingUploadPages.set(pageToken, request);
    }
    return request;
  }

  async function loadUploads(query, key) {
    const range = query.scope === "team" ? null : getVideoMonthRange(query.month);
    const collected = new Map();
    const visited = new Set();
    let pageToken = query.pageToken.startsWith(UPLOAD_CURSOR) ? query.pageToken.slice(UPLOAD_CURSOR.length) : "";
    let unknownCount = 0;
    let rateLimited = false;
    for (let page = 0; page < MAX_UPLOAD_PAGES; page++) {
      visited.add(pageToken);
      const uploads = await getUploadsPage(pageToken, key);
      const entries = uploads.items.filter(item => item.snippet?.channelId === COUPANG_SPORTS_CHANNEL_ID);
      const published = item => item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      const ids = [...new Set(entries.filter(item => matchesVideoLeague(query.league, item.snippet?.title)
        && matchesVideoTeam(query.team, item.snippet?.title)
        && (!range || (Date.parse(published(item)) >= Date.parse(range.from) && Date.parse(published(item)) < Date.parse(range.to))))
        .map(item => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId).filter(id => /^[\w-]{11}$/.test(id || "")))];
      const details = ids.length ? await youtube("videos", { part: "snippet,contentDetails,statistics", id: ids.join(","), maxResults: String(PAGE_SIZE) }, key) : { items: [] };
      const candidates = (details.items || []).filter(item => item.snippet?.channelId === COUPANG_SPORTS_CHANNEL_ID && ids.includes(item.id)
        && matchesVideoLeague(query.league, item.snippet.title) && matchesVideoTeam(query.team, item.snippet.title)
        && Number.isFinite(Date.parse(item.snippet.publishedAt))
        && (!range || (Date.parse(item.snippet.publishedAt) >= Date.parse(range.from) && Date.parse(item.snippet.publishedAt) < Date.parse(range.to))));
      const classified = await filterVideoTypes(candidates, COUPANG_SPORTS_CHANNEL_ID);
      unknownCount += classified.unknownCount;
      rateLimited ||= classified.rateLimited;
      for (const item of classified.videos) collected.set(item.id, item);
      const lastDate = entries.map(published).filter(value => Number.isFinite(Date.parse(value))).at(-1);
      pageToken = uploads.nextPageToken || "";
      if (range && lastDate && Date.parse(lastDate) < Date.parse(range.from)) pageToken = "";
      if (!pageToken || visited.has(pageToken) || collected.size >= PAGE_SIZE || unknownCount > 0) break;
    }
    const next = pageToken && !visited.has(pageToken) ? UPLOAD_CURSOR + pageToken : "";
    return { ...result(collected, next, unknownCount, rateLimited), source: "youtube-uploads" };
  }

  async function loadSearch(query, key) {
    const range = query.scope === "team" ? null : getVideoMonthRange(query.month);
    const collected = new Map();
    const visited = new Set();
    let unknownCount = 0;
    let rateLimited = false;
    let pageToken = query.pageToken;
    for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
      visited.add(pageToken);
      const search = await youtube("search", {
        part: "snippet", channelId: COUPANG_SPORTS_CHANNEL_ID, type: "video", order: "date", maxResults: String(PAGE_SIZE),
        q: [LEAGUE_VIDEO_QUERIES[query.league], getVideoTeamQuery(query.team)].filter(Boolean).join(" "),
        ...(range ? { publishedAfter: range.from, publishedBefore: range.to } : {}), ...(pageToken ? { pageToken } : {}),
      }, key);
      const ids = [...new Set((search.items || []).filter(item => item.snippet?.channelId === COUPANG_SPORTS_CHANNEL_ID
        && matchesVideoLeague(query.league, item.snippet?.title)
        && (!item.snippet?.title || matchesVideoTeam(query.team, item.snippet.title)))
        .map(item => item.id?.videoId).filter(id => /^[\w-]{11}$/.test(id || "")))];
      const details = ids.length ? await youtube("videos", { part: "snippet,contentDetails,statistics", id: ids.join(","), maxResults: String(PAGE_SIZE) }, key) : { items: [] };
      const candidates = (details.items || []).filter(item => item.snippet?.channelId === COUPANG_SPORTS_CHANNEL_ID && ids.includes(item.id)
        && matchesVideoLeague(query.league, item.snippet.title)
        && matchesVideoTeam(query.team, item.snippet.title)
        && Number.isFinite(Date.parse(item.snippet.publishedAt))
        && (!range || (Date.parse(item.snippet.publishedAt) >= Date.parse(range.from) && Date.parse(item.snippet.publishedAt) < Date.parse(range.to))));
      const classified = await filterVideoTypes(candidates, COUPANG_SPORTS_CHANNEL_ID);
      unknownCount += classified.unknownCount;
      rateLimited ||= classified.rateLimited;
      for (const item of classified.videos) collected.set(item.id, item);
      pageToken = search.nextPageToken || "";
      if (!pageToken || collected.size >= PAGE_SIZE || visited.has(pageToken) || unknownCount > 0) break;
    }
    // Keep the entire last page: slicing here would skip videos when the next token is used.
    return result(collected, pageToken && !visited.has(pageToken) ? pageToken : "", unknownCount, rateLimited);
  }

  async function load(query, key) {
    if (query.pageToken.startsWith(UPLOAD_CURSOR) || now() < searchRetryAt) return loadUploads(query, key);
    try { return await loadSearch(query, key); }
    catch (error) {
      if (error.status !== 429) throw error;
      // Search has a separate daily allowance. The official uploads playlist is
      // still available and can be shared between league and team filters.
      searchRetryAt = now() + 60 * 60 * 1000;
      return loadUploads({ ...query, pageToken: "" }, key);
    }
  }

  return async function handler(req, res) {
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "GET 요청만 지원합니다." }); }
    try {
      const params = new URL(req.url, "http://localhost").searchParams;
      const query = { league: params.get("league") || "PL", scope: params.get("scope") || "month", month: params.get("month") || "", team: params.get("team") || "", pageToken: params.get("pageToken") || "" };
      if (!Object.hasOwn(LEAGUE_VIDEO_QUERIES, query.league) || query.team.length > 60 || /[^\p{L}\p{N}\s.'-]/u.test(query.team)
        || !["month", "team"].includes(query.scope) || !/^(?:[\w=-]{0,512}|uploads:[\w=-]{1,504})$/.test(query.pageToken)) throw apiError("영상 조회 조건이 올바르지 않습니다.", 400);
      if (query.scope === "month") {
        try { getVideoMonthRange(query.month); } catch { throw apiError("조회할 월이 올바르지 않습니다.", 400); }
      }
      const key = apiKey || process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
      if (!key) throw apiError("YouTube API 키가 설정되지 않았습니다.", 503);
      const cacheKey = JSON.stringify(query);
      let data = cache.get(cacheKey);
      if (!data || now() - data.savedAt >= CACHE_MS) {
        let request = pending.get(cacheKey);
        if (!request) {
          request = load(query, key).then(value => {
            if (!value.classificationIncomplete) {
              if (cache.size >= 150) cache.delete(cache.keys().next().value);
              cache.set(cacheKey, { value, savedAt: now() });
            }
            return value;
          }).finally(() => pending.delete(cacheKey));
          pending.set(cacheKey, request);
        }
        data = { value: await request };
      }
      res.setHeader("Cache-Control", data.value.classificationIncomplete ? "no-store" : "private, max-age=120");
      return res.status(200).json(data.value);
    } catch (error) {
      return res.status(error.status || 502).json({ error: error.status ? error.message : "영상을 불러오지 못했습니다. 다시 시도해 주세요." });
    }
  };
}

export default createLeagueVideosHandler();

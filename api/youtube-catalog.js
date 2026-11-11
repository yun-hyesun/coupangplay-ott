import { randomUUID } from "node:crypto";
import process from "node:process";
import { CATALOG_CHANNEL_ID, CATALOG_REFRESH_MS, createYouTubeCatalogStore } from "./youtube-catalog-store.js";
import { createYouTubeVideoTypeFilter } from "./youtube-video-types.js";
import { youtubeVideoTypeStore } from "./youtube-video-type-store.js";

export function createYouTubeCatalog({ store = createYouTubeCatalogStore(), apiKey, fetchImpl = (...args) => fetch(...args), now = Date.now,
  classifyVideos, dailyLimit = 2000, maxPages = 20, maxBatches = 20, maxTypeBatches = 4, maxRunMs = 45000 } = {}) {
  const classify = classifyVideos || createYouTubeVideoTypeFilter({ fetchImpl, now, typeStore: youtubeVideoTypeStore });
  let pending;
  async function run() {
    const owner = randomUUID();
    const started = now();
    if ((store.get("retryAt") || 0) > started || !store.acquire(owner, started)) return { skipped: true, ...store.status(now()) };
    let calls = 0;
    const withinDeadline = () => now() - started < maxRunMs;
    const withinDiscoveryDeadline = () => now() - started < maxRunMs / 2;
    async function youtube(resource, params) {
      if (!store.reserveCall(now(), dailyLimit)) throw Object.assign(new Error("영상 목록의 오늘 자동 갱신량에 도달했습니다."), { budget: true });
      calls++;
      store.renew(owner, now());
      const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
      url.search = new URLSearchParams({ ...params, key: apiKey });
      let response;
      try { response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) }); }
      catch { throw new Error("유튜브 연결이 지연되어 저장된 영상 목록을 유지합니다."); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = data.error?.errors?.[0]?.reason || "";
        throw Object.assign(new Error("유튜브 자동 갱신이 지연되어 저장된 영상 목록을 유지합니다."), {
          quota: response.status === 429 || /quota|dailyLimit|rateLimit/i.test(reason),
          invalidToken: response.status === 400 && /pageToken/i.test(reason),
        });
      }
      if (!Array.isArray(data.items)) throw new Error("유튜브 영상 목록 응답을 확인하지 못했습니다.");
      return data;
    }
    async function discover(playlistId, cursor, kind) {
      const page = await youtube("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: "50", ...(cursor ? { pageToken: cursor } : {}) });
      const entries = page.items.filter(item => item.snippet?.channelId === CATALOG_CHANNEL_ID).map(item => ({
        id: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
      })).filter(item => /^[\w-]{11}$/.test(item.id || ""));
      const anchor = store.get("headAnchor");
      const overlap = anchor ? entries.some(item => item.id === anchor.id || Date.parse(item.publishedAt) < Date.parse(anchor.publishedAt))
        : entries.some(item => store.has(item.id));
      const next = page.nextPageToken || "";
      if (next && next === cursor) throw new Error("영상 목록의 다음 페이지를 확인하지 못했습니다.");
      const state = kind === "head" ? { headCursor: next, headInProgress: Boolean(next && !overlap),
        ...(!next || overlap ? { headRefreshedAt: now() } : {}) }
        : { historyCursor: next, historyDone: !next, ...(!cursor ? { headRefreshedAt: now() } : {}) };
      if (kind === "head") {
        const nextAnchor = cursor ? store.get("headPendingAnchor") : entries[0];
        state.headPendingAnchor = nextAnchor || null;
        if (!next || overlap) { state.headAnchor = nextAnchor || anchor || null; state.headPendingAnchor = null; }
      } else if (!cursor && entries[0]) state.headAnchor = entries[0];
      const newIds = [...new Set(entries.filter(item => !store.has(item.id)).map(item => item.id))];
      const details = newIds.length ? await youtube("videos", { part: "snippet,contentDetails,statistics,player", maxWidth: "1280", id: newIds.join(",") }) : { items: [] };
      store.discover(entries, state, { items: details.items, requestedIds: newIds, now: now() });
    }
    try {
      store.enforceLimit();
      store.purgeExpired(now());
      if (!apiKey) throw new Error("유튜브 자동 갱신용 API 키가 설정되지 않았습니다.");
      let playlist = store.get("uploadsPlaylist");
      if (!playlist) {
        const data = await youtube("channels", { part: "contentDetails", id: CATALOG_CHANNEL_ID });
        playlist = data.items.find(item => item.id === CATALOG_CHANNEL_ID)?.contentDetails?.relatedPlaylists?.uploads;
        if (!playlist) throw new Error("쿠팡플레이 스포츠 채널의 업로드 목록을 확인하지 못했습니다.");
        store.set("uploadsPlaylist", playlist);
      }
      // An independent head cursor keeps new uploads flowing during the initial history import.
      const headDue = store.get("headInProgress") || (store.get("headRefreshedAt") && now() - store.get("headRefreshedAt") >= CATALOG_REFRESH_MS);
      if (headDue) {
        for (let page = 0; page < maxPages && withinDiscoveryDeadline(); page++) {
          await discover(playlist, store.get("headCursor") || "", "head");
          if (!store.get("headInProgress")) break;
        }
        if (!store.get("headInProgress")) store.set("headCursor", "");
      }
      if (!store.get("historyDone")) {
        for (let page = 0; page < maxPages && withinDiscoveryDeadline(); page++) {
          await discover(playlist, store.get("historyCursor") || "", "history");
          if (store.get("historyDone")) break;
        }
      }
      // One request updates up to 50 IDs for all leagues and users together.
      for (let batch = 0; batch < maxBatches && withinDeadline(); batch++) {
        const ids = store.dueDetails(now());
        if (!ids.length) break;
        const data = await youtube("videos", { part: "snippet,contentDetails,statistics,player", maxWidth: "1280", id: ids.join(",") });
        store.saveDetails(data.items, ids, now());
      }
      for (let batch = 0; batch < maxTypeBatches && withinDeadline(); batch++) {
        const candidates = store.dueTypes(now());
        if (!candidates.length) break;
        const items = candidates.map(video => ({ id: video.id, snippet: { title: video.title, channelId: CATALOG_CHANNEL_ID, publishedAt: video.publishedAt }, contentDetails: { duration: video.durationIso } }));
        const result = await classify(items, CATALOG_CHANNEL_ID);
        store.saveTypes(result.classifications || items.map(item => ({ id: item.id, isShort: result.videos.some(video => video.id === item.id) ? false : null })), now());
        if (result.rateLimited) break;
      }
      store.set("lastRunAt", now());
      store.set("lastError", "");
      store.set("retryAt", 0);
    } catch (error) {
      if (error.invalidToken) { store.set("historyCursor", ""); store.set("headCursor", ""); }
      store.set("lastError", error.message);
      store.set("retryAt", now() + (error.quota || error.budget ? 3600000 : 900000));
    } finally { store.release(owner); }
    return { calls, ...store.status(now()) };
  }
  return {
    store,
    sync() {
      if (!pending) pending = run().finally(() => { pending = null; });
      return pending;
    },
    start() {
      const tick = () => { this.sync().catch(() => { /* SQLite/host errors must not interrupt the web server. */ }); };
      tick();
      const timer = setInterval(tick, 60000);
      timer.unref?.();
      return async () => { clearInterval(timer); try { await pending; } finally { store.close(); } };
    },
  };
}

let catalog;
export function getYouTubeCatalog() {
  return catalog ||= createYouTubeCatalog({ apiKey: process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY });
}

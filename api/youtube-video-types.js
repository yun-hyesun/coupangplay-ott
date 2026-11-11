const TYPE_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

export function getYouTubeDurationSeconds(iso = "") {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : null;
}

export function parseYouTubeVideoType(html, videoId, channelId) {
  const assignment = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/.exec(html);
  if (!assignment) return null;
  const start = assignment.index + assignment[0].length;
  if (html[start] !== "{") return null;
  let depth = 0, quoted = false, escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) {
      try {
        const player = JSON.parse(html.slice(start, index + 1));
        if (player.videoDetails?.videoId !== videoId || player.videoDetails?.channelId !== channelId) return null;
        const value = player.microformat?.playerMicroformatRenderer?.isShortsEligible;
        return typeof value === "boolean" ? value : null;
      } catch { return null; }
    }
  }
  return null;
}

export function createYouTubeVideoTypeFilter({ fetchImpl = (...args) => fetch(...args), now = Date.now, typeStore = null } = {}) {
  const cache = new Map();
  const pending = new Map();
  let initialized;
  let retryAt = 0;

  async function restore() {
    if (!initialized) initialized = (async () => {
      try {
        for (const entry of (await typeStore?.load()) || []) {
          if (typeof entry.isShort === "boolean" && /^[\w-]+:[\w-]{11}$/.test(entry.key || "") && Number.isFinite(entry.at)
            && now() >= entry.at && now() - entry.at < TYPE_CACHE_MS && cache.size < MAX_CACHE_ENTRIES) cache.set(entry.key, { isShort: entry.isShort, at: entry.at });
        }
      } catch { /* The optional public-metadata cache cannot prevent a query. */ }
    })();
    return initialized;
  }

  async function check(item, channelId, batchSignal) {
    // YouTube Shorts are at most three minutes; short horizontal highlights still need checking.
    const seconds = getYouTubeDurationSeconds(item.contentDetails?.duration);
    if (seconds > 180) return false;
    const key = `${channelId}:${item.id}`;
    const saved = cache.get(key);
    if (saved && now() >= saved.at && now() - saved.at < TYPE_CACHE_MS) return saved.isShort;
    if (pending.has(key)) return pending.get(key);
    if (now() < retryAt || batchSignal.aborted || !/^[\w-]{11}$/.test(item.id || "")) return null;
    const request = (async () => {
      try {
        const url = new URL("https://www.youtube.com/watch");
        url.searchParams.set("v", item.id);
        const response = await fetchImpl(url, { signal: AbortSignal.any([batchSignal, AbortSignal.timeout(8000)]) });
        if (response.status === 429) {
          const delay = Number(response.headers?.get("retry-after"));
          retryAt = now() + Math.max(60000, Number.isFinite(delay) ? delay * 1000 : 0);
          return null;
        }
        if (!response.ok) return null;
        const value = parseYouTubeVideoType(await response.text(), item.id, channelId);
        if (value !== null) {
          if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
          cache.set(key, { isShort: value, at: now() });
        }
        return value;
      } catch { return null; }
    })().finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  return async function filterVideoTypes(items, channelId) {
    await restore();
    const signal = AbortSignal.timeout(12000);
    const types = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        types[index] = await check(items[index], channelId, signal);
      }
    }));
    try { await typeStore?.save([...cache].map(([key, value]) => ({ key, ...value }))); } catch { /* Read-only hosts continue using the in-memory cache. */ }
    return {
      videos: items.filter((_, index) => types[index] === false),
      classifications: items.map((item, index) => ({ id: item.id, isShort: types[index] })),
      shortsCount: types.filter(value => value === true).length,
      unknownCount: types.filter(value => value === null).length,
      rateLimited: now() < retryAt,
    };
  };
}

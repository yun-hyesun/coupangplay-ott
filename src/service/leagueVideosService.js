const cache = new Map();
const CACHE_MS = 20 * 60 * 1000;

export async function getLeagueVideoPage(query, { signal } = {}) {
  const params = new URLSearchParams([["format", "standard"], ...Object.entries(query).filter(([, value]) => value !== "" && value != null)]);
  const key = params.toString();
  const saved = cache.get(key);
  if (saved && Date.now() - saved.at < CACHE_MS) return saved.data;
  const response = await fetch(`/api/league-videos?${params}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "영상을 불러오지 못했습니다.");
  if (!Array.isArray(data.videos)) throw new Error("영상 응답 형식이 올바르지 않습니다.");
  if (!data.classificationIncomplete) {
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), data });
  }
  return data;
}

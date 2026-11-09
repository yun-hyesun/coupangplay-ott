import assert from "node:assert/strict";
import { test } from "node:test";
import { createYouTubeVideoTypeFilter, getYouTubeDurationSeconds, parseYouTubeVideoType } from "../api/youtube-video-types.js";
import { createLeagueVideosHandler, COUPANG_SPORTS_CHANNEL_ID as CHANNEL } from "../api/league-videos.js";

const item = (id, duration = "PT2M") => ({ id, contentDetails: { duration }, snippet: { title: "[라리가] 11R 산탄데르 vs 레알 마드리드 하이라이트", channelId: CHANNEL, publishedAt: "2026-11-01T20:00:00Z" } });
const player = (id, isShortsEligible, extra = {}) => ({ videoDetails: { videoId: id, channelId: CHANNEL, title: 'a quoted }; title " and braces {}' }, microformat: { playerMicroformatRenderer: { isShortsEligible } }, ...extra });
const html = data => `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(data)}; var unrelated = {};</script></html>`;
const response = data => ({ ok: true, text: async () => html(data) });
const json = data => ({ ok: true, json: async () => data });
async function invoke(handler, query = { league: "PD", month: "2026-11" }) {
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; } };
  await handler({ method: "GET", url: "/api/league-videos?" + new URLSearchParams(query) }, res);
  return res;
}

test("duration parsing keeps the three-minute boundary eligible for an actual Shorts check", () => {
  assert.equal(getYouTubeDurationSeconds("PT3M"), 180);
  assert.equal(getYouTubeDurationSeconds("PT1H2M3S"), 3723);
  assert.equal(getYouTubeDurationSeconds("unknown"), null);
});

test("player parsing reads the requested video only, handles quoted braces, and rejects missing or mismatched evidence", () => {
  assert.equal(parseYouTubeVideoType(html(player("abcdefghijk", true)), "abcdefghijk", CHANNEL), true);
  assert.equal(parseYouTubeVideoType(html(player("abcdefghijk", false)), "abcdefghijk", CHANNEL), false);
  assert.equal(parseYouTubeVideoType(html(player("lmnopqrstuv", false)), "abcdefghijk", CHANNEL), null);
  assert.equal(parseYouTubeVideoType(html(player("abcdefghijk", false, { videoDetails: { videoId: "abcdefghijk", channelId: "wrong" } })), "abcdefghijk", CHANNEL), null);
  assert.equal(parseYouTubeVideoType(html(player("abcdefghijk", undefined)), "abcdefghijk", CHANNEL), null);
  assert.equal(parseYouTubeVideoType("consent page", "abcdefghijk", CHANNEL), null);
  assert.equal(parseYouTubeVideoType("var ytInitialPlayerResponse = {invalid};", "abcdefghijk", CHANNEL), null);
});

test("two-minute Shorts are excluded while short standard highlights and longer standard videos remain", async () => {
  const calls = [];
  const filter = createYouTubeVideoTypeFilter({ fetchImpl: async url => {
    const id = url.searchParams.get("v");
    calls.push(id);
    assert.equal(url.origin, "https://www.youtube.com");
    assert.equal(url.searchParams.has("key"), false);
    return response(player(id, id.startsWith("shorts")));
  } });
  const result = await filter([item("shorts00001", "PT2M5S"), item("shorts00002", "PT3M"), item("normal00001", "PT53S"), item("normal00002", "PT2M46S"), item("long0000001", "PT3M1S")], CHANNEL);
  assert.deepEqual(result.videos.map(video => video.id), ["normal00001", "normal00002", "long0000001"]);
  assert.equal(result.shortsCount, 2);
  assert.equal(result.unknownCount, 0);
  assert.equal(calls.length, 4);
});

test("classification is shared across queries and cached, with at most four watch-page requests at once", async () => {
  let calls = 0, running = 0, maximum = 0;
  const filter = createYouTubeVideoTypeFilter({ fetchImpl: async url => {
    calls++; running++; maximum = Math.max(maximum, running);
    await new Promise(setImmediate);
    running--;
    return response(player(url.searchParams.get("v"), false));
  } });
  const candidates = Array.from({ length: 9 }, (_, i) => item(`v${String(i).padStart(10, "0")}`));
  const [a, b] = await Promise.all([filter(candidates, CHANNEL), filter(candidates, CHANNEL)]);
  assert.equal(a.videos.length, 9);
  assert.deepEqual(a, b);
  assert.ok(maximum <= 4);
  assert.equal(calls, 9);
  await filter(candidates, CHANNEL);
  assert.equal(calls, 9);
});

test("unverified videos stay excluded and failed checks can be retried instead of cached as normal videos", async () => {
  let calls = 0;
  const filter = createYouTubeVideoTypeFilter({ fetchImpl: async url => {
    calls++;
    if (calls === 1) throw new Error("network unavailable");
    return response(player(url.searchParams.get("v"), false));
  } });
  const first = await filter([item("abcdefghijk")], CHANNEL);
  assert.equal(first.unknownCount, 1);
  assert.equal(first.videos.length, 0);
  assert.equal((await filter([item("abcdefghijk")], CHANNEL)).videos.length, 1);
  assert.equal(calls, 2);
});

test("API pagination continues after a Shorts-only page and returns only verified standard videos", async () => {
  const searches = [];
  const handler = createLeagueVideosHandler({ apiKey: "private-key", videoTypeStore: null, fetchImpl: async url => {
    if (url.hostname === "www.youtube.com") return response(player(url.searchParams.get("v"), url.searchParams.get("v") === "shorts00001"));
    if (url.pathname.endsWith("/search")) {
      const token = url.searchParams.get("pageToken"); searches.push(token);
      const id = token ? "normal00001" : "shorts00001";
      return json({ ...(token ? {} : { nextPageToken: "next" }), items: [{ id: { videoId: id }, snippet: { channelId: CHANNEL } }] });
    }
    return json({ items: [item(url.searchParams.get("id"), "PT2M")] });
  } });
  const result = await invoke(handler);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(searches, [null, "next"]);
  assert.deepEqual(result.data.videos.map(video => video.id), ["normal00001"]);
  assert.equal(result.data.videos[0].isShort, false);
  assert.equal(result.data.shortsExcluded, true);
  assert.equal(result.data.classificationIncomplete, false);
});

test("an incomplete classification is explicit and never cached as an empty successful inventory", async () => {
  let watchCalls = 0;
  const handler = createLeagueVideosHandler({ apiKey: "test", videoTypeStore: null, fetchImpl: async url => {
    if (url.hostname === "www.youtube.com") {
      watchCalls++;
      return watchCalls === 1 ? { ok: false, status: 503 } : response(player("abcdefghijk", false));
    }
    if (url.pathname.endsWith("/search")) return json({ items: [{ id: { videoId: "abcdefghijk" }, snippet: { channelId: CHANNEL } }] });
    return json({ items: [item("abcdefghijk")] });
  } });
  const first = await invoke(handler);
  assert.equal(first.data.classificationIncomplete, true);
  assert.match(first.data.notice, /쇼츠 여부/);
  assert.equal(first.headers["Cache-Control"], "no-store");
  assert.equal(first.data.videos.length, 0);
  const recovered = await invoke(handler);
  assert.equal(recovered.data.videos.length, 1);
  assert.equal(recovered.data.notice, "");
  assert.equal(watchCalls, 2);
});

test("verified classification survives handler restarts while uncertain checks are never persisted", async () => {
  let entries = [{ key: `${CHANNEL}:abcdefghijk`, isShort: false, at: 1000 }];
  let calls = 0;
  const typeStore = { load: async () => entries, save: async value => { entries = value; } };
  const options = { typeStore, now: () => 2000, fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } };
  const first = await createYouTubeVideoTypeFilter(options)([item("abcdefghijk"), item("lmnopqrstuv")], CHANNEL);
  assert.deepEqual(first.videos.map(video => video.id), ["abcdefghijk"]);
  assert.equal(first.unknownCount, 1);
  assert.equal(entries.length, 1);
  const restored = await createYouTubeVideoTypeFilter(options)([item("abcdefghijk")], CHANNEL);
  assert.equal(restored.videos.length, 1);
  assert.equal(calls, 1);
});

test("a watch-page rate limit stops further requests until the provider's retry window", async () => {
  let now = 1000, calls = 0;
  const filter = createYouTubeVideoTypeFilter({ now: () => now, fetchImpl: async url => {
    calls++;
    return now < 61000 ? { ok: false, status: 429, headers: { get: () => "60" } }
      : response(player(url.searchParams.get("v"), false));
  } });
  const candidates = Array.from({ length: 10 }, (_, i) => item(`v${String(i).padStart(10, "0")}`));
  const first = await filter(candidates, CHANNEL);
  assert.equal(first.rateLimited, true);
  assert.equal(first.unknownCount, 10);
  assert.ok(calls <= 4);
  const limitedCalls = calls;
  await filter(candidates, CHANNEL);
  assert.equal(calls, limitedCalls);
  now = 61000;
  const recovered = await filter(candidates, CHANNEL);
  assert.equal(recovered.videos.length, 10);
  assert.equal(recovered.rateLimited, false);
});

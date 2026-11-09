import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createLeagueVideosHandler as createHandler, COUPANG_SPORTS_CHANNEL_ID as CHANNEL } from "../api/league-videos.js";
import { getVideoMonthRange, getVideoTeamQuery, matchesVideoLeague, matchesVideoTeam } from "../src/data/leagueVideoQueries.js";

let server, grouping, teams;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  grouping = await server.ssrLoadModule("/src/data/leagueVideoGroups.js");
  teams = (await server.ssrLoadModule("/src/data/sportsTeams.js")).SPORTS_TEAMS_BY_LEAGUE.PL;
});
after(async () => { await server?.close(); });
const ok = data => ({ ok: true, json: async () => data });
// Retrieval tests use already-classified standard videos; real classification has a separate suite.
const createLeagueVideosHandler = options => createHandler({ ...options,
  classifyVideos: async videos => ({ videos, shortsCount: 0, unknownCount: 0 }),
});
async function invoke(handler, query, method = "GET") {
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; } };
  await handler({ method, url: "/api/league-videos?" + new URLSearchParams(query) }, res);
  return res;
}
const video = (id, title, publishedAt = "2026-11-07T22:00:00Z", kind = "highlight") => ({ id, title, publishedAt, kind });

test("month boundaries use Korea time, including year changes and leap days", () => {
  assert.deepEqual(getVideoMonthRange("2026-11"), { from: "2026-10-31T15:00:00.000Z", to: "2026-11-30T15:00:00.000Z" });
  assert.equal(getVideoMonthRange("2024-02").to, "2024-02-29T15:00:00.000Z");
  assert.equal(grouping.shiftVideoMonth("2026-01", -1), "2025-12");
  assert.equal(grouping.getVideoDateKey("2026-11-07T22:00:00Z"), "2026-11-08");
  assert.throws(() => getVideoMonthRange("2026-13"));
});

test("official channel only, real metadata, cached concurrent requests and explicit page cursors", async () => {
  const calls = [];
  const handler = createLeagueVideosHandler({ apiKey: "test-private-key", fetchImpl: async url => {
    calls.push(url);
    await new Promise(setImmediate);
    if (url.pathname.endsWith("/search")) return ok({ items: [
      { id: { videoId: "abcdefghijk" }, snippet: { channelId: CHANNEL } },
      { id: { videoId: "lmnopqrstuv" }, snippet: { channelId: "another-channel" } },
    ] });
    assert.equal(url.searchParams.get("id"), "abcdefghijk");
    return ok({ items: [{ id: "abcdefghijk", snippet: { title: "[프리미어리그] 10R 리즈 vs 토트넘 하이라이트", channelId: CHANNEL, publishedAt: "2026-11-07T22:00:00Z", thumbnails: { high: { url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg" } } }, contentDetails: { duration: "PT1H2M3S" }, statistics: { viewCount: "31415" } }] });
  } });
  const query = { league: "PL", month: "2026-11", team: "토트넘", round: "10" };
  const [a, b] = await Promise.all([invoke(handler, query), invoke(handler, query)]);
  assert.equal(calls.length, 2);
  assert.equal(a.statusCode, 200);
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.videos.length, 1);
  assert.equal(a.data.videos[0].duration, "1:02:03");
  assert.equal(a.data.videos[0].viewCount, 31415);
  assert.equal(a.data.videos[0].url, "https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(calls[0].searchParams.get("q"), "프리미어리그 토트넘");
  assert.equal(calls[0].searchParams.get("channelId"), CHANNEL);
  assert.equal(calls[0].searchParams.get("publishedAfter"), "2026-10-31T15:00:00.000Z");
  assert.ok(!JSON.stringify(a.data).includes("test-private-key"));
  await invoke(handler, query);
  assert.equal(calls.length, 2);
  await invoke(handler, { ...query, pageToken: "page_2=" });
  assert.equal(calls.length, 4);
  assert.equal(calls[2].searchParams.get("pageToken"), "page_2=");
});

test("irrelevant search hits do not fill the page, and batching never skips the last page's videos", async () => {
  const searches = [];
  const titles = new Map();
  const item = (number, title) => {
    const id = `v${String(number).padStart(10, "0")}`;
    titles.set(id, title);
    return { id: { videoId: id }, snippet: { channelId: CHANNEL, title } };
  };
  const pages = {
    "": { nextPageToken: "page2", items: [item(0, "골 장면 l 프리미어리그 l 리즈 vs 토트넘")] },
    page2: { nextPageToken: "page3", items: Array.from({ length: 30 }, (_, i) => item(i + 1, "[라리가] 11R 산탄데르 vs 레알 마드리드 하이라이트")) },
    page3: { nextPageToken: "page4", items: Array.from({ length: 30 }, (_, i) => item(i + 31, "장면 l 라리가 l 산탄데르 vs 레알 마드리드")) },
    page4: { items: [item(61, "산탄데르 vs 레알 마드리드 프리뷰")] },
  };
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: async url => {
    if (url.pathname.endsWith("/search")) {
      const cursor = url.searchParams.get("pageToken") || "";
      searches.push(cursor);
      assert.equal(url.searchParams.get("q"), "라리가 산탄데르");
      return ok(pages[cursor]);
    }
    return ok({ items: url.searchParams.get("id").split(",").map(id => ({ id,
      snippet: { channelId: CHANNEL, title: titles.get(id), publishedAt: "2026-11-07T22:00:00Z" },
    })) });
  } });
  const query = { league: "PD", month: "2026-11", team: "라싱 산탄데르" };
  const first = await invoke(handler, query);
  assert.equal(first.statusCode, 200);
  assert.deepEqual(searches, ["", "page2", "page3"]);
  assert.equal(first.data.videos.length, 60);
  assert.equal(new Set(first.data.videos.map(video => video.id)).size, 60);
  assert.equal(first.data.nextPageToken, "page4");
  const last = await invoke(handler, { ...query, pageToken: first.data.nextPageToken });
  assert.equal(last.data.videos.length, 1);
  assert.equal(last.data.nextPageToken, "");
  assert.equal(last.data.videos[0].id, "v0000000061");
});

test("sparse searches stop after three pages and preserve a continuation cursor", async () => {
  let calls = 0;
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: async () => {
    calls += 1;
    return ok({ items: [], nextPageToken: `page${calls + 1}` });
  } });
  const result = await invoke(handler, { league: "PD", month: "2026-11" });
  assert.equal(calls, 3);
  assert.equal(result.data.nextPageToken, "page4");
  assert.deepEqual(result.data.videos, []);
});

test("explicit title labels distinguish divisions while unlabeled previews remain eligible", () => {
  assert.equal(matchesVideoLeague("PD", "[라리가] 산탄데르 vs 레알 마드리드"), true);
  assert.equal(matchesVideoLeague("PD", "장면 I 분데스리가 I 뮌헨 vs 도르트문트"), false);
  assert.equal(matchesVideoLeague("PD", "[라리가2] 말라가 vs 카디스"), false);
  assert.equal(matchesVideoLeague("PD2", "[라리가2] 말라가 vs 카디스"), true);
  assert.equal(matchesVideoLeague("PD", "AT. 마드리드 vs 바르셀로나 프리뷰"), true);
  assert.equal(getVideoTeamQuery("라싱 산탄데르"), "산탄데르");
  assert.equal(matchesVideoTeam("라싱 산탄데르", "산탄데르 vs 레알 마드리드 하이라이트"), true);
  assert.equal(matchesVideoTeam("AT. 마드리드", "아틀레티코 마드리드 vs 바르셀로나"), true);
  assert.equal(matchesVideoTeam("맨유", "첼시 vs 토트넘 하이라이트"), false);
});

test("Santander's YouTube alias and the nearest matchup override names in the commentary", () => {
  const titles = [
    "[라리가] 11R 산탄데르 vs 레알 마드리드 2분 하이라이트",
    "홈 5경기 무패의 라싱 산탄데르와 공식전 5연승의 레알 마드리드의 맞대결이 지금 시작합니다! l 라리가 l 산탄데르 vs 레알 마드리드",
  ];
  const videos = titles.map((title, i) => video(`s${i}`, title, "2026-11-01T21:15:00Z"));
  for (const entry of videos) {
    const match = grouping.parseVideoMatch("PD", entry);
    assert.equal(match.home.name, "라싱 산탄데르");
    assert.equal(match.away.name, "레알 마드리드");
  }
  const parsed = grouping.parseVideoMatch("PD", videos[0]);
  const groups = grouping.groupLeagueVideos({ leagueId: "PD", videos, teamId: parsed.home.id, round: "11", month: "2026-11" });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].videos.length, 2);
});

test("invalid filters and non-GET requests never reach YouTube", async () => {
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: () => { throw new Error("must not fetch"); } });
  for (const query of [{ league: "__proto__", month: "2026-11" }, { scope: "unknown", month: "2026-11" }, { month: "2026-99" }, { month: "2026-11", pageToken: "https://invalid" }, { month: "2026-11", team: "x|y" }]) {
    assert.equal((await invoke(handler, query)).statusCode, 400);
  }
  assert.equal((await invoke(handler, {}, "POST")).statusCode, 405);
});

test("team search spans upload months while preserving official channel, selected team and pagination", async () => {
  const searched = [];
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: async url => {
    if (url.pathname.endsWith("/search")) {
      searched.push(url);
      return ok({ items: [{ id: { videoId: "abcdefghijk" }, snippet: { channelId: CHANNEL } }] });
    }
    return ok({ items: [{ id: "abcdefghijk", snippet: { channelId: CHANNEL, title: "[프리미어리그] 8R 리즈 vs 맨유 하이라이트", publishedAt: "2026-10-18T12:00:00Z" } }] });
  } });
  const result = await invoke(handler, { league: "PL", scope: "team", team: "맨유" });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.videos.length, 1);
  assert.equal(searched[0].searchParams.get("q"), "프리미어리그 맨유");
  assert.equal(searched[0].searchParams.get("channelId"), CHANNEL);
  assert.equal(searched[0].searchParams.has("publishedAfter"), false);
  assert.equal(searched[0].searchParams.has("publishedBefore"), false);
  const match = grouping.parseVideoMatch("PL", result.data.videos[0]);
  const groups = grouping.groupLeagueVideos({ leagueId: "PL", videos: result.data.videos, teamId: match.away.id });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].away.name, "맨유");
});

test("team results never merge different seasons' matches with the same opponents and round", () => {
  const videos = [video("new", "[프리미어리그] 8R 리즈 vs 맨유 하이라이트", "2026-10-18T12:00:00Z"),
    video("old", "[프리미어리그] 8R 리즈 vs 맨유 하이라이트", "2025-10-18T12:00:00Z"),
    video("clip", "리즈 vs 맨유 주요장면", "2026-10-19T01:00:00Z", "recommend")];
  const groups = grouping.groupLeagueVideos({ leagueId: "PL", videos });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].dateKey, "2026-10-18");
  assert.deepEqual(groups[0].videos.map(video => video.id), ["new", "clip"]);
  assert.equal(groups[1].dateKey, "2025-10-18");
});

test("quota failures expose a friendly error without keys or an empty success", async () => {
  const handler = createLeagueVideosHandler({ apiKey: "do-not-expose", fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: { message: "do-not-expose", errors: [{ reason: "quotaExceeded" }] } }) }) });
  const response = await invoke(handler, { month: "2026-11" });
  assert.equal(response.statusCode, 429);
  assert.match(response.data.error, /조회 한도/);
  assert.ok(!JSON.stringify(response.data).includes("do-not-expose"));
});

test("exhausted search allowance recovers through verified official uploads and shares pages across filters", async () => {
  const calls = [];
  const entries = [
    { id: "abcdefghijk", title: "[라리가] 12R AT. 마드리드 vs 바르셀로나 하이라이트", publishedAt: "2026-11-08T23:00:00Z" },
    { id: "lmnopqrstuv", title: "[라리가] 11R 바르셀로나 vs 레알 마드리드 하이라이트", publishedAt: "2026-10-25T23:00:00Z" },
    { id: "zzzzzzzzzzz", title: "[프리미어리그] 리즈 vs 토트넘 하이라이트", publishedAt: "2026-10-24T23:00:00Z" },
  ];
  const handler = createLeagueVideosHandler({ apiKey: "private", fetchImpl: async url => {
    calls.push(url.pathname.split("/").at(-1));
    if (url.pathname.endsWith("/search")) return { ok: false, status: 429, json: async () => ({ error: { errors: [{ reason: "rateLimitExceeded" }] } }) };
    if (url.pathname.endsWith("/channels")) return ok({ items: [{ id: CHANNEL, contentDetails: { relatedPlaylists: { uploads: "official-uploads" } } }] });
    if (url.pathname.endsWith("/playlistItems")) {
      assert.equal(url.searchParams.get("playlistId"), "official-uploads");
      return ok({ items: entries.map(entry => ({ snippet: { channelId: CHANNEL, title: entry.title }, contentDetails: { videoId: entry.id, videoPublishedAt: entry.publishedAt } })), nextPageToken: "older" });
    }
    return ok({ items: entries.filter(entry => url.searchParams.get("id").split(",").includes(entry.id))
      .map(entry => ({ id: entry.id, snippet: { channelId: CHANNEL, title: entry.title, publishedAt: entry.publishedAt }, contentDetails: { duration: "PT4M" } })) });
  } });
  const month = await invoke(handler, { league: "PD", month: "2026-11" });
  assert.equal(month.statusCode, 200);
  assert.equal(month.data.source, "youtube-uploads");
  assert.deepEqual(month.data.videos.map(video => video.id), ["abcdefghijk"]);
  assert.equal(month.data.nextPageToken, "");
  const team = await invoke(handler, { league: "PD", scope: "team", team: "바르셀로나" });
  assert.equal(team.statusCode, 200);
  assert.equal(team.data.videos.length, 2);
  assert.equal(calls.filter(value => value === "search").length, 1);
  assert.equal(calls.filter(value => value === "channels").length, 1);
  assert.equal(calls.filter(value => value === "playlistItems").length, 2);
  assert.ok(!JSON.stringify(team.data).includes("private"));
});

test("upload pagination preserves all last-page videos and never resumes a playlist token as a search token", async () => {
  let searchCalls = 0;
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: async url => {
    if (url.pathname.endsWith("/search")) { searchCalls++; return { ok: false, status: 429, json: async () => ({}) }; }
    if (url.pathname.endsWith("/channels")) return ok({ items: [{ id: CHANNEL, contentDetails: { relatedPlaylists: { uploads: "official" } } }] });
    if (url.pathname.endsWith("/playlistItems")) {
      const second = url.searchParams.get("pageToken") === "page2";
      return ok({ ...(second ? {} : { nextPageToken: "page2" }), items: Array.from({ length: second ? 1 : 50 }, (_, index) => ({
        snippet: { channelId: CHANNEL, title: "[라리가] AT. 마드리드 vs 바르셀로나 하이라이트" },
        contentDetails: { videoId: `v${String(index + (second ? 50 : 0)).padStart(10,"0")}`, videoPublishedAt: "2026-11-08T23:00:00Z" },
      })) });
    }
    return ok({ items: url.searchParams.get("id").split(",").map(id => ({ id, snippet: { channelId: CHANNEL,
      title: "[라리가] AT. 마드리드 vs 바르셀로나 하이라이트", publishedAt: "2026-11-08T23:00:00Z" } })) });
  } });
  const query = { league: "PD", month: "2026-11" };
  const first = await invoke(handler, query);
  assert.equal(first.data.videos.length, 50);
  assert.equal(first.data.nextPageToken, "uploads:page2");
  const next = await invoke(handler, { ...query, pageToken: first.data.nextPageToken });
  assert.equal(next.data.videos.length, 1);
  assert.equal(next.data.nextPageToken, "");
  assert.equal(searchCalls, 1);
});

test("real match date, home/away order and zero scores enrich related clips; duplicates are removed", () => {
  const videos = [video("a", "[프리미어리그] 10R 리즈 vs 토트넘 2분 하이라이트"), video("b", "멋진 장면 l 프리미어리그 l 리즈 vs 토트넘", "2026-11-07T21:00:00Z", "recommend"), video("a", "duplicate")];
  const fixtures = [{ id: "match1", utcDate: "2026-11-07T16:00:00Z", home: { name: "토트넘", score: 0 }, away: { name: "리즈", score: 2 } }];
  const groups = grouping.groupLeagueVideos({ leagueId: "PL", videos, fixtures });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].home.name, "토트넘");
  assert.equal(groups[0].homeScore, 0);
  assert.equal(groups[0].dateKey, "2026-11-08");
  assert.equal(groups[0].isMatchDate, true);
  assert.equal(groups[0].videos.length, 2);
});

test("team and round filters exclude other matches and unknown scores stay unknown", () => {
  const videos = [video("a", "[프리미어리그] 10R 리즈 vs 토트넘 주요장면"), video("b", "[프리미어리그] 9R 리즈 vs 토트넘 하이라이트"), video("c", "[프리미어리그] 10R 아스날 vs 맨시티 하이라이트"), video("d", "리즈 vs 토트넘 멋진 골 장면", "2026-11-07T21:00:00Z", "recommend")];
  const groups = grouping.groupLeagueVideos({ leagueId: "PL", videos, teamId: teams.find(team => team.name === "토트넘").id, round: "10" });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].videos[0].id, "a");
  assert.equal(groups[0].videos.length, 2);
  assert.equal(groups[0].homeScore, null);
  assert.equal(groups[0].isMatchDate, false);
  assert.equal(grouping.parseVideoMatch("PL", video("d", "[프리미어리그] 10R 크리스탈 팰리스 vs 맨시티 하이라이트")).home.name, "크리스탈 팰리스");
});

test("unrelated leagues and ambiguous previews are excluded even if search matched their description", () => {
  const videos = [video("a", "[ACLE] 가시와 vs 대전 하이라이트"), video("b", "손흥민 l 시애틀 vs LAFC 프리뷰"), video("c", "리버풀 원정 승리한 아스날, 헐 시티 상대 연승 도전"), video("d", "[FA컵] 토트넘 vs 리즈 하이라이트")];
  assert.equal(grouping.groupLeagueVideos({ leagueId: "PL", videos }).length, 0);
});

test("out-of-month API metadata and match dates cannot leak into the selected month", async () => {
  const handler = createLeagueVideosHandler({ apiKey: "test", fetchImpl: async url => url.pathname.endsWith("/search")
    ? ok({ items: [{ id: { videoId: "abcdefghijk" }, snippet: { channelId: CHANNEL } }] })
    : ok({ items: [{ id: "abcdefghijk", snippet: { channelId: CHANNEL, title: "리즈 vs 토트넘 하이라이트", publishedAt: "2026-11-07T22:00:00Z" } }] }) });
  assert.equal((await invoke(handler, { league: "PL", month: "2026-10" })).data.videos.length, 0);
  assert.equal(grouping.groupLeagueVideos({ leagueId: "PL", month: "2026-10", videos: [video("a", "리즈 vs 토트넘 하이라이트")] }).length, 0);
});

test("the client bypasses old mixed-format HTTP caches and retries incomplete classifications", async () => {
  const client = await server.ssrLoadModule("/src/service/leagueVideosService.js");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async path => {
    assert.equal(new URL(path, "http://localhost").searchParams.get("format"), "standard");
    calls++;
    return ok({ videos: calls === 1 ? [] : [{ id: "abcdefghijk", isShort: false }], classificationIncomplete: calls === 1 });
  };
  try {
    const query = { league: "PD", month: "2026-09" };
    assert.equal((await client.getLeagueVideoPage(query)).classificationIncomplete, true);
    assert.equal((await client.getLeagueVideoPage(query)).videos.length, 1);
    await client.getLeagueVideoPage(query);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; }
});

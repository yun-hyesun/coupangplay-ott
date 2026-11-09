import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, matching, service;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  matching = await server.ssrLoadModule("/src/data/matchRelatedVideos.js");
  service = await server.ssrLoadModule("/src/service/matchRelatedVideosService.js");
});
after(async () => { await server?.close(); });

const game = (date = "2026-03-15T16:30:00Z") => ({
  competitionCode: "PL", utcDate: date, matchday: 30,
  home: { name: "리버풀" }, away: { name: "토트넘" },
});
const video = (id, title = "[프리미어리그] 30R 리버풀 vs 토트넘 하이라이트", publishedAt = "2026-03-15T19:00:00Z", kind = "highlight") => ({ id, title, publishedAt, kind });
const ok = data => ({ ok: true, json: async () => data });

test("matches both opponents and round, allows reversed title order, and excludes another match or season", () => {
  const highlight = video("highlight");
  const player = video("player", "히샬리송 주요장면 l 토트넘 vs 리버풀 l 프리미어리그");
  const preview = video("preview", "리버풀 vs 토트넘 경기 프리뷰", "2026-03-13T15:00:00Z", "recommend");
  const result = matching.selectMatchVideos(game(), [preview,
    video("other-team", "30R 리버풀 vs 아스날 하이라이트"),
    video("other-round", "[프리미어리그] 29R 리버풀 vs 토트넘 하이라이트"),
    video("other-league", "[FA컵] 리버풀 vs 토트넘 하이라이트"),
    video("old-season", undefined, "2025-03-15T19:00:00Z"),
    video("one-team", "토트넘 오늘의 주요장면"),
    { ...highlight, id: "short", isShort: true },
    video("bad-date", undefined, "invalid"), highlight, player, highlight,
  ]);
  assert.deepEqual(result.map(item => item.id), ["highlight", "player", "preview"]);
});

test("uses Korean upload months across year boundaries and bounds preview/post-game dates", () => {
  assert.deepEqual(matching.getMatchVideoContext(game("2026-12-31T16:30:00Z")).months, ["2026-12", "2027-01"]);
  assert.deepEqual(matching.getMatchVideoContext(game("2026-11-02T00:30:00Z")).months, ["2026-10", "2026-11"]);
  const start = Date.parse(game().utcDate);
  const result = matching.selectMatchVideos(game(), [
    video("early", undefined, new Date(start - 3 * 86400000 - 1).toISOString()),
    video("preview", undefined, new Date(start - 3 * 86400000).toISOString()),
    video("late", undefined, new Date(start + 4 * 86400000).toISOString()),
  ]);
  assert.deepEqual(result.map(item => item.id), ["preview"]);
  assert.deepEqual(matching.selectMatchVideos({ ...game(), competitionCode: "unknown" }, [video("x")]), []);
});

test("F1 matches the named grand prix or its explicit round, excluding generic F1 news", () => {
  const fixture = { competitionCode: "f1", matchday: 20, raceName: "Brazilian Grand Prix", utcDate: "2026-11-08T17:00:00Z", home: { name: "F1" }, away: { name: "Brazilian Grand Prix" } };
  const titles = ["F1 상파울루 그랑프리 생중계 예고", "[4K] 팀 우승 노리는 메르세데스 l 상파울루 그랑프리 프리뷰", "F1 20R 주요장면", "F1 마이애미 그랑프리 하이라이트", "스무 살 챔피언 l F1 이슈", "F1 19R 상파울루 그랑프리 하이라이트"];
  const result = matching.selectMatchVideos(fixture, titles.map((title, index) => video(String(index), title, "2026-11-07T08:00:00Z")));
  assert.deepEqual(result.map(item => item.id), ["0", "1", "2"]);
});

test("scans sparse official pages without losing the continuation cursor", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async input => {
    const params = new URL(input, "http://localhost").searchParams;
    calls.push(params);
    const page = Number(params.get("pageToken") || 1);
    return ok({ videos: [page === 4 ? video("found") : video(`other-${page}`, "30R 리버풀 vs 아스날 하이라이트")], nextPageToken: page < 4 ? String(page + 1) : "" });
  });
  const first = await service.getMatchVideoPage(game());
  assert.equal(calls.length, 3);
  assert.equal(first.videos.length, 0);
  assert.deepEqual(first.nextCursor, { monthIndex: 0, pageToken: "4" });
  const second = await service.getMatchVideoPage(game(), { cursor: first.nextCursor });
  assert.equal(calls.length, 4);
  assert.deepEqual(second.videos.map(item => item.id), ["found"]);
  assert.equal(second.nextCursor, null);
  assert.ok(calls.every(params => params.get("league") === "PL" && !params.has("team") && params.get("format") === "standard"));
});

test("loads next-month uploads for a completed month-end fixture", async t => {
  const months = [];
  const fixture = game("2027-01-31T12:00:00Z");
  t.mock.method(globalThis, "fetch", async input => {
    const month = new URL(input, "http://localhost").searchParams.get("month");
    months.push(month);
    return ok({ videos: month === "2027-02" ? [video("next-month", undefined, "2027-02-01T00:00:00Z")] : [], nextPageToken: "" });
  });
  const result = await service.getMatchVideoPage(fixture);
  assert.deepEqual(months, ["2027-01", "2027-02"]);
  assert.deepEqual(result.videos.map(item => item.id), ["next-month"]);
  assert.equal(result.nextCursor, null);
});

test("keeps an incompletely classified page retryable instead of caching or skipping it", async t => {
  let calls = 0;
  const fixture = game("2026-06-15T16:00:00Z");
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return ok({ videos: [], nextPageToken: calls === 1 ? "second" : "", classificationIncomplete: calls === 1 });
  });
  const first = await service.getMatchVideoPage(fixture);
  assert.equal(first.incomplete, true);
  assert.deepEqual(first.nextCursor, { monthIndex: 0, pageToken: "" });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.getMatchVideoPage(fixture, { signal: controller.signal, cursor: first.nextCursor }), { name: "AbortError" });
  assert.equal(calls, 1);
  const recovered = await service.getMatchVideoPage(fixture, { cursor: first.nextCursor });
  assert.equal(calls, 2);
  assert.equal(recovered.incomplete, false);
  assert.equal(recovered.nextCursor, null);
});

test("closing an expansion aborts further paging and discards a late response", async t => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    controller.abort();
    return ok({ videos: [], nextPageToken: "second" });
  });
  await assert.rejects(service.getMatchVideoPage(game("2026-08-15T16:00:00Z"), { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("schedule checks share a league query and expose only fixtures with verified related videos", async t => {
  const fixture = { ...game("2028-05-15T16:30:00Z"), gameId: "available" };
  const unavailable = { ...fixture, gameId: "unavailable", home: { name: "아스날" }, away: { name: "첼시" } };
  let calls = 0;
  const updates = [];
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return ok({ videos: [
      video("available-video", undefined, "2028-05-15T19:00:00Z"),
      video("wrong-round", "[프리미어리그] 29R 아스날 vs 첼시 하이라이트", "2028-05-15T19:00:00Z"),
    ], nextPageToken: "" });
  });
  const result = await service.getScheduleMatchVideos([fixture, unavailable], { onVideos: (key, videos) => updates.push({ key, videos }) });
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(result), [matching.getMatchVideoKey(fixture)]);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].videos.map(item => item.id), ["available-video"]);
  const expanded = await service.getMatchVideoPage(fixture);
  assert.equal(calls, 1, "expanding a confirmed fixture reuses the cached query");
  assert.deepEqual(expanded.videos, result[matching.getMatchVideoKey(fixture)]);
});

test("schedule availability follows sparse continuation pages before enabling a match", async t => {
  const fixture = { ...game("2028-07-15T16:30:00Z"), gameId: "later-page" };
  const pages = [];
  const updates = [];
  t.mock.method(globalThis, "fetch", async input => {
    const page = Number(new URL(input, "http://localhost").searchParams.get("pageToken") || 1);
    pages.push(page);
    return ok({ videos: page === 4 ? [video("found-later", undefined, "2028-07-15T19:00:00Z")] : [], nextPageToken: page < 4 ? String(page + 1) : "" });
  });
  const result = await service.getScheduleMatchVideos([fixture], { onVideos: (key, videos) => updates.push({ key, videos }) });
  assert.deepEqual(pages, [1, 2, 3, 4]);
  assert.equal(updates.length, 1);
  assert.deepEqual(result[matching.getMatchVideoKey(fixture)].map(item => item.id), ["found-later"]);
});

test("schedule checks stop once availability is confirmed instead of downloading the whole month", async t => {
  const fixture = { ...game("2028-08-15T16:30:00Z"), gameId: "first-page" };
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return ok({ videos: [video("first-page-video", undefined, "2028-08-15T19:00:00Z")], nextPageToken: "unneeded-page" });
  });
  const result = await service.getScheduleMatchVideos([fixture]);
  assert.equal(calls, 1);
  assert.equal(result[matching.getMatchVideoKey(fixture)].length, 1);
});

test("a failed source cannot enable an arrow or prevent other leagues from loading; concurrency is bounded", async t => {
  const fixtures = [
    { ...game("2028-09-15T16:30:00Z"), gameId: "failed" },
    { ...game("2028-09-15T16:30:00Z"), gameId: "spanish", competitionCode: "PD", home: { name: "바르셀로나" }, away: { name: "레알 마드리드" } },
    { ...game("2028-09-15T16:30:00Z"), gameId: "german", competitionCode: "BL1", home: { name: "바이에른 뮌헨" }, away: { name: "도르트문트" } },
  ];
  let active = 0, peak = 0, calls = 0;
  t.mock.method(globalThis, "fetch", async input => {
    calls++;
    peak = Math.max(peak, ++active);
    await new Promise(setImmediate);
    active--;
    const league = new URL(input, "http://localhost").searchParams.get("league");
    if (league === "PL") return { ok: false, json: async () => ({ error: "unavailable" }) };
    const title = league === "PD" ? "[라리가] 30R 바르셀로나 vs 레알 마드리드 하이라이트" : "[분데스리가] 30R 바이에른 뮌헨 vs 도르트문트 하이라이트";
    return ok({ videos: [video(league, title, "2028-09-15T19:00:00Z")], nextPageToken: "" });
  });
  const result = await service.getScheduleMatchVideos(fixtures);
  assert.equal(calls, 3);
  assert.equal(peak, 2);
  assert.equal(result[matching.getMatchVideoKey(fixtures[0])], undefined);
  assert.equal(result[matching.getMatchVideoKey(fixtures[1])].length, 1);
  assert.equal(result[matching.getMatchVideoKey(fixtures[2])].length, 1);
});

test("changing dates cancels availability updates from the old fixture list", async t => {
  const fixture = { ...game("2028-11-15T16:30:00Z"), gameId: "previous-date" };
  const controller = new AbortController();
  let updates = 0;
  t.mock.method(globalThis, "fetch", async () => {
    controller.abort();
    return ok({ videos: [video("late-result", undefined, "2028-11-15T19:00:00Z")], nextPageToken: "" });
  });
  await assert.rejects(service.getScheduleMatchVideos([fixture], { signal: controller.signal, onVideos: () => updates++ }), { name: "AbortError" });
  assert.equal(updates, 0);
});

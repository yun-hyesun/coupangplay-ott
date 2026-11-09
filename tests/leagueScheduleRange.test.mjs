import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { getScheduleRange, listScheduleDates, loadScheduleDates, selectScheduleMatches } from "../src/data/leagueScheduleRange.js";

const game = (gameId, status, utcDate) => ({ gameId, status, utcDate });
const originalFetch = globalThis.fetch;
let server, service;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  service = await server.ssrLoadModule("/src/service/espnService.js");
});
after(async () => { globalThis.fetch = originalFetch; await server?.close(); });

test("two-week windows include today and both day-14 boundaries across years", () => {
  assert.deepEqual(getScheduleRange("2026-11-07", "upcoming"), { from: "2026-11-07", to: "2026-11-21" });
  assert.deepEqual(getScheduleRange("2026-01-07", "ended"), { from: "2025-12-24", to: "2026-01-07" });
  assert.equal(listScheduleDates("2026-11-07", "2026-11-21").length, 15);
  assert.throws(() => listScheduleDates("2026-11-21", "2026-11-07"), RangeError);
});

test("upcoming games use exact KST boundaries, live-first order and no four-card cap", () => {
  const range = getScheduleRange("2026-11-07", "upcoming");
  const games = [
    game("before", "SCHEDULED", "2026-11-06T14:59:59Z"),
    game("start", "SCHEDULED", "2026-11-06T15:00:00Z"),
    game("live", "IN_PLAY", "2026-11-07T12:30:00Z"),
    ...[8, 9, 10, 11].map((day) => game(`day-${day}`, "TIMED", `2026-11-${String(day).padStart(2, "0")}T00:00:00Z`)),
    game("last", "SCHEDULED", "2026-11-21T14:59:59Z"),
    game("after", "SCHEDULED", "2026-11-21T15:00:00Z"),
    ...["FINISHED", "CANCELED", "POSTPONED", "SUSPENDED", "unknown"].map((status) => game(status, status, "2026-11-08T00:00:00Z")),
    game("invalid", "SCHEDULED", "invalid-date"),
  ];
  assert.deepEqual(selectScheduleMatches([...games.reverse(), game("live", "IN_PLAY", "2026-11-07T12:30:00Z")], range, "upcoming").map((item) => item.gameId), ["live", "start", "day-8", "day-9", "day-10", "day-11", "last"]);
});

test("all live games precede scheduled games while each group stays chronological", () => {
  const games = [
    game("scheduled-later", "TIMED", "2026-11-08T12:00:00Z"),
    game("live-later", "IN_PLAY", "2026-11-07T13:00:00Z"),
    game("scheduled-earlier", "SCHEDULED", "2026-11-07T00:00:00Z"),
    game("live-earlier", "PAUSED", "2026-11-07T12:00:00Z"),
  ];
  assert.deepEqual(selectScheduleMatches(games, getScheduleRange("2026-11-07", "upcoming"), "upcoming").map((item) => item.gameId), ["live-earlier", "live-later", "scheduled-earlier", "scheduled-later"]);
});

test("completed games include the previous two weeks and today, newest first", () => {
  const games = [
    game("before", "FINISHED", "2026-10-23T14:59:59Z"),
    game("start", "FINISHED", "2026-10-23T15:00:00Z"),
    game("recent", "FINISHED", "2026-11-06T12:00:00Z"),
    game("today", "FINISHED", "2026-11-07T14:59:59Z"),
    game("tomorrow", "FINISHED", "2026-11-07T15:00:00Z"),
    game("not-finished", "IN_PLAY", "2026-11-07T12:30:00Z"),
  ];
  assert.deepEqual(selectScheduleMatches(games, getScheduleRange("2026-11-07", "ended"), "ended").map((item) => item.gameId), ["today", "recent", "start"]);
});

test("daily providers keep successful dates, deduplicate and limit concurrent requests", async () => {
  let running = 0, maximum = 0;
  const result = await loadScheduleDates({ from: "2026-11-07", to: "2026-11-21", loadSchedule: async (date) => {
    running += 1; maximum = Math.max(maximum, running);
    await new Promise(setImmediate); running -= 1;
    if (date === "2026-11-10") throw new Error("unavailable");
    return { games: [game(date, "SCHEDULED", `${date}T00:00:00Z`), game(date, "SCHEDULED", `${date}T00:00:00Z`)], errors: [] };
  } });
  assert.equal(maximum, 3);
  assert.equal(result.games.length, 14);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /2026-11-10/);
});

test("cancelled daily requests stop and date-only matches retain their known date", async () => {
  const controller = new AbortController(); let calls = 0;
  await loadScheduleDates({ from: "2026-11-07", to: "2026-11-21", signal: controller.signal, loadSchedule: async () => { calls += 1; controller.abort(); return { games: [], errors: [] }; } });
  assert.equal(calls, 1);
  const result = await loadScheduleDates({ from: "2026-11-07", to: "2026-11-07", loadSchedule: async () => ({ games: [game("tbd", "SCHEDULED", null)], errors: [] }) });
  assert.equal(selectScheduleMatches(result.games, getScheduleRange("2026-11-07", "upcoming"), "upcoming")[0].dateKey, "2026-11-07");
});

test("Football-Data range requests respect the ten-day limit and exact KST endpoints", async () => {
  const calls = [];
  const fixtures = [
    ["before", "2026-11-06T14:59:59Z"], ["start", "2026-11-06T15:00:00Z"],
    ["first-chunk-end", "2026-11-15T14:59:59Z"], ["second-chunk-start", "2026-11-15T15:00:00Z"],
    ["last", "2026-11-21T14:59:59Z"], ["after", "2026-11-21T15:00:00Z"],
  ];
  globalThis.fetch = async (value) => {
    const url = new URL(String(value), "http://localhost"); calls.push(url);
    const from = url.searchParams.get("dateFrom"), to = url.searchParams.get("dateTo");
    assert((new Date(to) - new Date(from)) / 86400000 <= 10);
    return { ok: true, status: 200, json: async () => ({ matches: fixtures.filter(([, date]) => date >= `${from}T00:00:00Z` && date < `${to}T00:00:00Z`).map(([id, utcDate]) => ({ id, utcDate, status: "TIMED", competition: { code: "PL" }, homeTeam: { id: 57 }, awayTeam: { id: 66 } })) }) };
  };
  try {
    const result = await service.getEspnScheduleForRange("PL", "2026-11-07", "2026-11-21");
    assert.equal(calls.length, 2);
    assert.deepEqual(result.games.map((item) => item.sourceEventId), ["start", "first-chunk-end", "second-chunk-start", "last"]);
    assert.deepEqual(result.errors, []);
  } finally { globalThis.fetch = originalFetch; }
});

test("failed primary range queries fall back to only the selected ESPN league", async () => {
  const calls = [];
  globalThis.fetch = async (value) => {
    const url = String(value); calls.push(url);
    if (url.startsWith("/football-data/")) return { ok: false, status: 503, json: async () => ({}) };
    assert.match(url, /soccer\/eng\.1\/scoreboard/);
    return { ok: true, status: 200, json: async () => ({ events: [
      { id: "fallback-1", date: "2026-12-07T15:00:00Z", status: { type: { state: "pre" } }, competitions: [{ competitors: [{ homeAway: "home", team: { id: "359" } }, { homeAway: "away", team: { id: "360" } }] }] },
      { id: "fallback-2", date: "2026-12-09T12:00:00Z", status: { type: { state: "pre" } }, competitions: [{ competitors: [{ homeAway: "home", team: { id: "359" } }, { homeAway: "away", team: { id: "360" } }] }] },
    ] }) };
  };
  try {
    const result = await service.getEspnScheduleForRange("PL", "2026-12-08", "2026-12-09");
    assert.deepEqual(result.games.map((item) => item.sourceEventId).sort(), ["fallback-1", "fallback-2"]);
    assert.equal(calls.filter((url) => url.startsWith("/espn/")).length, 3);
    assert.deepEqual(result.errors, []);
  } finally { globalThis.fetch = originalFetch; }
});

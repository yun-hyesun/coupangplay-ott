import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { formatBroadcastDate, loadLeagueBroadcasts, selectBroadcastGames } from "../src/data/leagueBroadcasts.js";

const now = Date.parse("2026-11-07T12:00:00Z");
const match = (gameId, status, utcDate) => ({ gameId, status, utcDate });
let server, service;
const originalFetch = globalThis.fetch;

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    configFile: false, logLevel: "error", appType: "custom",
    server: { middlewareMode: true, watch: null },
  });
  service = await server.ssrLoadModule("/src/service/espnService.js");
});
after(async () => { globalThis.fetch = originalFetch; await server?.close(); });

test("only live and future scheduled games are shown, live first, capped at four", () => {
  const games = [
    match("later", "SCHEDULED", "2026-11-09T15:00:00Z"),
    ...["FINISHED", "CANCELED", "POSTPONED", "SUSPENDED", "unknown"].map((status) => match(status, status, "2026-11-08T13:00:00Z")),
    match("past", "SCHEDULED", "2026-11-07T08:00:00Z"),
    match("soon", "TIMED", "2026-11-08T15:00:00Z"),
    match("live", "IN_PLAY", "2026-11-07T11:00:00Z"),
    match("next", "SCHEDULED", "2026-11-08T18:00:00Z"),
    match("beyond-limit", "SCHEDULED", "2026-11-10T15:00:00Z"),
  ];
  const before = JSON.stringify(games);
  assert.deepEqual(selectBroadcastGames([...games, games[7]], now).map((game) => game.gameId), ["live", "soon", "next", "later"]);
  assert.equal(JSON.stringify(games), before);
});

test("start times use Korean dates and unambiguous Korean AM/PM labels", () => {
  assert.equal(formatBroadcastDate("2026-11-07T15:00:00Z"), "11.08 (일) 오전 12:00");
  assert.equal(formatBroadcastDate("2026-11-07T17:30:00Z"), "11.08 (일) 오전 02:30");
  assert.equal(formatBroadcastDate("2026-11-08T04:40:00Z"), "11.08 (일) 오후 01:40");
  assert.equal(formatBroadcastDate(undefined), "일정 미정");
});

test("finished days are skipped and future lookups stop once four matches are found", async () => {
  const dates = [];
  const result = await loadLeagueBroadcasts({ dateKey: "2026-11-07", now, loadSchedule: async (date) => {
    dates.push(date);
    return { errors: [], games: date === "2026-11-07"
      ? [match("finished", "FINISHED", "2026-11-07T01:00:00Z")]
      : [match(date + "-a", "SCHEDULED", date + "T15:00:00Z"), match(date + "-b", "SCHEDULED", date + "T18:00:00Z")] };
  } });
  assert.deepEqual(dates, ["2026-11-07", "2026-11-08", "2026-11-09"]);
  assert.equal(result.games.length, 4);
});

test("empty lookups are bounded and cancelled lookups do not continue", async () => {
  let calls = 0;
  await loadLeagueBroadcasts({ dateKey: "2026-11-07", now, loadSchedule: async () => { calls += 1; return { games: [], errors: [] }; } });
  assert.equal(calls, 14);
  calls = 0;
  const controller = new AbortController();
  await loadLeagueBroadcasts({ dateKey: "2026-11-07", now, signal: controller.signal, loadSchedule: async () => {
    calls += 1; controller.abort(); return { games: [], errors: [] };
  } });
  assert.equal(calls, 1);
});

test("API failures finish loading and provide an error state", async () => {
  const result = await loadLeagueBroadcasts({ dateKey: "2026-11-07", now, loadSchedule: async () => { throw new Error("unavailable"); } });
  assert.deepEqual(result, { games: [], errors: ["unavailable"], loading: false });
});

test("Football-Data includes today's evening live game and filters exact KST day boundaries", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => ({ matches: [
      ["before", "2026-11-06T14:59:59Z", "FINISHED"],
      ["midnight", "2026-11-06T15:00:00Z", "FINISHED"],
      ["live", "2026-11-07T12:30:00Z", "IN_PLAY"],
      ["last", "2026-11-07T14:59:59Z", "TIMED"],
      ["tomorrow", "2026-11-07T15:00:00Z", "TIMED"],
    ].map(([id, utcDate, status]) => ({ id, utcDate, status, competition: { code: "PL" }, homeTeam: { id: 57 }, awayTeam: { id: 66 } })) }) };
  };
  try {
    const games = await service.getEspnFootballMatches("PL", "2026-11-07");
    assert.deepEqual(games.map((game) => game.sourceEventId), ["midnight", "live", "last"]);
    assert.equal(games.find((game) => game.sourceEventId === "live").status, "IN_PLAY");
    assert.equal(calls.length, 1);
    const url = new URL(calls[0], "http://localhost");
    assert.equal(url.searchParams.get("dateFrom"), "2026-11-06");
    assert.equal(url.searchParams.get("dateTo"), "2026-11-08");
  } finally { globalThis.fetch = originalFetch; }
});

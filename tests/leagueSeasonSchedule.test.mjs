import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, service, seasonService;
const originalFetch = globalThis.fetch;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  service = await server.ssrLoadModule("/src/service/espnService.js");
  seasonService = await server.ssrLoadModule("/src/service/leagueScheduleService.js");
});
after(async () => { globalThis.fetch = originalFetch; await server?.close(); });

test("season loader requests one competition, preserving rounds, translated teams and scores", async () => {
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    return Response.json({ matches: [
      { id: 1, competition: { code: "PL" }, utcDate: "2026-11-07T20:00:00Z", matchday: 10, status: "FINISHED", homeTeam: { id: 64, name: "Liverpool FC" }, awayTeam: { id: 73, name: "Tottenham Hotspur FC" }, score: { fullTime: { home: 2, away: 1 } } },
      { id: 2, competition: { code: "BL1" }, utcDate: "2026-11-07T20:00:00Z", matchday: 10, status: "FINISHED" },
    ] });
  };
  const result = await service.getEspnSeasonSchedule("PL", 2026, "2026-07-01", "2027-06-30");
  assert.deepEqual(requests, ["/football-data/competitions/PL/matches?season=2026"]);
  assert.equal(result.games.length, 1);
  assert.equal(result.games[0].matchday, 10);
  assert.equal(result.games[0].home.name, "리버풀");
  assert.equal(result.games[0].away.name, "토트넘");
  assert.equal(result.games[0].home.score, 2);
  assert.equal(result.games[0].away.score, 1);
});

test("aborted primary requests do not issue fallback season traffic", async () => {
  const controller = new AbortController();
  controller.abort();
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(service.getEspnSeasonSchedule("PL", 2025, "2025-07-01", "2026-06-30", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(requests, 0);
});

test("failed primary requests use a single range restricted to the selected ESPN league", async () => {
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    return String(url).startsWith("/football-data") ? Response.json({}, { status: 429 }) : Response.json({ events: [] });
  };
  const result = await service.getEspnSeasonSchedule("PL", 2024, "2024-07-01", "2025-06-30");
  assert.equal(requests.length, 2);
  assert.match(requests[1], /^\/espn\/soccer\/eng\.1\/scoreboard\?/);
  assert.match(requests[1], /dates=20240630-20250630/);
  assert.deepEqual(result, { games: [], errors: [] });
});

test("a delayed refresh preserves the last successful season with a visible warning, but never ignores cancellation", async () => {
  globalThis.fetch = async () => Response.json({ matches: [
    { id: 100, competition: { code: "PL" }, utcDate: "2030-08-01T20:00:00Z", matchday: 1, status: "SCHEDULED", homeTeam: { id: 64 }, awayTeam: { id: 73 } },
  ] });
  const saved = await seasonService.getLeagueSeasonSchedule("PL", 2030);
  globalThis.fetch = async () => { throw new Error("Provider unavailable"); };
  const stale = await seasonService.getLeagueSeasonSchedule("PL", 2030, { force: true });
  assert.equal(stale.games.length, 1);
  assert.deepEqual(stale.games, saved.games);
  assert.ok(stale.warning);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(seasonService.getLeagueSeasonSchedule("PL", 2030, { force: true, signal: controller.signal }));
});

test("concurrent round metadata and fixture requests share one season request", async () => {
  const rounds = await server.ssrLoadModule("/src/service/leagueScheduleUnitsService.js?shared-season-check");
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise(setImmediate);
    return Response.json({ competition: { code: "PL" }, filters: { season: "2026" }, matches: [
      { id: 500, competition: { code: "PL" }, utcDate: "2026-11-08T20:00:00Z", matchday: 12, status: "FINISHED",
        homeTeam: { id: 64 }, awayTeam: { id: 73 }, score: { fullTime: { home: 2, away: 1 } } },
    ] });
  };
  const [options, fixtures] = await Promise.all([
    rounds.getLeagueRoundOptions("PL", Date.parse("2026-11-09T00:00:00Z")),
    service.getEspnSeasonSchedule("PL", 2026, "2026-07-01", "2027-06-30"),
  ]);
  assert.equal(calls, 1);
  assert.equal(options.currentLabel, "12라운드");
  assert.equal(fixtures.games.length, 1);
});

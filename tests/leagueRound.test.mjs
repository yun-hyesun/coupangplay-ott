import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, rounds;
const originalFetch = globalThis.fetch;
const NOW = Date.parse("2026-11-08T03:50:00Z");
const match = (round, status = "FINISHED", date = "2026-11-07T17:30:00Z", extra = {}) => ({ matchday: round, status, utcDate: date, stage: "REGULAR_SEASON", season: { startDate: "2026-08-21" }, ...extra });
const ok = (league, matches) => ({ ok: true, json: async () => ({ competition: { code: league }, filters: { season: "2026" }, matches }) });

before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  rounds = await server.ssrLoadModule("/src/service/leagueRoundService.js");
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => { await server?.close(); });

test("only started or completed matches at the actual instant determine the latest round", () => {
  const matches = [match(9), match(10, "IN_PLAY", "2026-11-08T12:50:00+09:00"), match(11, "SCHEDULED"), match(12, "POSTPONED"), match(13, "FINISHED", "2026-11-08T03:50:01Z"), match(14, "CANCELED"), match("unknown"), match(99, "FINISHED", "invalid")];
  assert.equal(rounds.getStartedRound(matches, NOW), 10);
  assert.equal(rounds.getStartedRound(matches, NOW - 1), 9);
  assert.equal(rounds.getStartedRound([match(10, "PAUSED")], NOW), 10);
  assert.equal(rounds.getStartedRound([match(38, "SCHEDULED")], NOW), 0);
  assert.equal(rounds.getStartedRound([], NOW), 0);
});

test("current-season API, shared cache, and timed refresh advance the round without using a video month", async () => {
  let calls = 0;
  globalThis.fetch = async url => {
    assert.equal(url, "/football-data/competitions/PL/matches?season=2026");
    await new Promise(setImmediate);
    return ok("PL", [match(10), match(38, "FINISHED", "2026-05-01T00:00:00Z", { season: { startDate: "2025-08-01" } }), match(50, "FINISHED", undefined, { stage: "FINAL" }), ...(++calls > 1 ? [match(11, "IN_PLAY", "2026-11-08T03:55:00Z")] : [])]);
  };
  assert.deepEqual(await Promise.all([rounds.getCurrentLeagueRound("PL", NOW), rounds.getCurrentLeagueRound("PL", NOW)]), [10, 10]);
  assert.equal(calls, 1);
  assert.equal(await rounds.getCurrentLeagueRound("PL", NOW + 60000), 10);
  assert.equal(calls, 1);
  assert.equal(await rounds.getCurrentLeagueRound("PL", NOW + 300000), 11);
  assert.equal(calls, 2);
});

test("failed queries back off, remain manually retryable and never produce a hardcoded round range", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? { ok: false, status: 429 } : ok("PD", [match(12)]);
  await assert.rejects(rounds.getCurrentLeagueRound("PD", NOW), /잠시 제한/);
  await assert.rejects(rounds.getCurrentLeagueRound("PD", NOW + 1000), /잠시 제한/);
  assert.equal(calls, 1);
  assert.equal(await rounds.getCurrentLeagueRound("PD", NOW, { force: true }), 12);
  assert.equal(calls, 2);
});

test("wrong competitions and malformed match lists are rejected; genuine preseason is zero", async () => {
  globalThis.fetch = async () => ok("PL", [match(38)]);
  await assert.rejects(rounds.getCurrentLeagueRound("BL1", NOW, { force: true }), /확인할 수/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ matches: null }) });
  await assert.rejects(rounds.getCurrentLeagueRound("BL1", NOW, { force: true }), /확인할 수/);
  globalThis.fetch = async () => ok("BL1", []);
  assert.equal(await rounds.getCurrentLeagueRound("BL1", NOW, { force: true }), 0);
});

test("leagues without round metadata do not invent numbered rounds or make an unrelated API call", async () => {
  globalThis.fetch = async () => { throw new Error("must not fetch"); };
  assert.equal(await rounds.getCurrentLeagueRound("unknown-league", NOW), 0);
});

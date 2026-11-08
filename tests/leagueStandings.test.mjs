import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const originalFetch = globalThis.fetch;
let server, standings;
const row = (position, teamId = 9000 + position) => ({
  position, team: { id: teamId, name: `Team ${position}`, shortName: `Club ${position}`, crest: `/crest-${teamId}.svg` },
  playedGames: 10, won: 4, draw: 3, lost: 3, points: 15, goalsFor: 9, goalsAgainst: 12, goalDifference: -3,
});
const result = (code, table) => ({ competition: { code }, standings: [{ stage: "REGULAR_SEASON", type: "TOTAL", table }] });
const response = (data) => ({ ok: true, json: async () => data });

before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  standings = await server.ssrLoadModule("/src/service/leagueStandingsService.js");
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => { await server?.close(); });

test("overall API positions select ranks 1–10 without re-ranking equal points; duplicate requests share a cache", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(url, "/football-data/competitions/PL/standings");
    await new Promise(setImmediate);
    const data = result("PL", Array.from({ length: 20 }, (_, index) => row(index + 1, index === 0 ? 57 : undefined)).reverse());
    data.standings.unshift({ type: "HOME", table: [row(1, 73)] });
    return response(data);
  };
  const [first, second] = await Promise.all([standings.getFootballStandings("PL"), standings.getFootballStandings("PL")]);
  assert.deepEqual(first.map(team => team.rank), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(first[0].teamName, "아스날");
  assert.match(first[0].logoPath, /arsenal/);
  assert.equal(first[1].teamName, "Club 2");
  assert.equal(first[1].logoPath, "/crest-9002.svg");
  assert.equal(first[0].goalDiff, -3);
  assert.deepEqual(first, second);
  await standings.getFootballStandings("PL");
  assert.equal(calls, 1);
});

test("zero values stay zero and missing statistics stay unknown", async () => {
  globalThis.fetch = async () => response(result("PD", [{ ...row(1), points: 0, won: 0, draw: null, goalsFor: undefined, goalsAgainst: "0", goalDifference: "-2" }]));
  const [team] = await standings.getFootballStandings("PD");
  assert.equal(team.points, 0);
  assert.equal(team.win, 0);
  assert.equal(team.draw, null);
  assert.equal(team.goalsFor, null);
  assert.equal(team.goalsAgainst, 0);
  assert.equal(team.goalDiff, -2);
});

test("failed authentication does not become an empty or cached standings result", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? { ok: false, status: 401 } : response(result("FL1", [row(1)]));
  await assert.rejects(standings.getFootballStandings("FL1"), /401/);
  assert.equal((await standings.getFootballStandings("FL1")).length, 1);
  assert.equal(calls, 2);
});

test("home-only, wrong-competition and malformed-team responses are rejected", async () => {
  globalThis.fetch = async () => response({ competition: { code: "DED" }, standings: [{ type: "HOME", table: [row(1)] }] });
  await assert.rejects(standings.getFootballStandings("DED"), /종합 순위/);
  globalThis.fetch = async () => response(result("PL", [row(1)]));
  await assert.rejects(standings.getFootballStandings("BL1"), /일치하지/);
  globalThis.fetch = async () => response(result("ELC", [{ ...row(1), position: null }]));
  await assert.rejects(standings.getFootballStandings("ELC"), /올바르지/);
});

test("a genuine empty overall table stays empty and unsupported cups make no request", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response(result("ELC", [])); };
  assert.deepEqual(await standings.getFootballStandings("ELC"), []);
  assert.equal(standings.supportsFootballStandings("FAC"), false);
  await assert.rejects(standings.getFootballStandings("FAC"), RangeError);
  assert.equal(calls, 1);
});

test("a timeout leaves the request retryable", async () => {
  globalThis.fetch = async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); };
  await assert.rejects(standings.getFootballStandings("DED"), /시간이 초과/);
  globalThis.fetch = async () => response(result("DED", [row(1)]));
  assert.equal((await standings.getFootballStandings("DED"))[0].rank, 1);
});

test("rate-limited standings fall back to ESPN with local team IDs and reuse the successful result", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.startsWith("/football-data/")) return { ok: false, status: 429 };
    assert.equal(url, "/espn-standings/soccer/ger.1/standings");
    return response({ children: [{ standings: { entries: [
      { team: { id: "132", displayName: "Bayern Munich" }, stats: Object.entries({ rank: 1, points: 27, gamesPlayed: 10, wins: 9, ties: 0, losses: 1, pointsFor: 31, pointsAgainst: 7, pointDifferential: 24 }).map(([name,value])=>({name,value})) },
      { team: { id: "unmapped", displayName: "Promoted Club", logos: [{ href: "/promoted.svg" }] }, stats: [{ name: "rank", value: 2 }, { name: "points", value: 0 }] },
    ] } }] });
  };
  const rows = await standings.getFootballStandings("BL1");
  assert.equal(rows[0].sourceProvider, "espn");
  assert.equal(rows[0].teamName, "바이에른 뮌헨");
  assert.notEqual(String(rows[0].teamId), "132");
  assert.equal(rows[0].points, 27);
  assert.equal(rows[0].goalDiff, 24);
  assert.equal(rows[1].teamId, "espn:unmapped");
  assert.equal(rows[1].points, 0);
  assert.equal(rows[1].win, null);
  await standings.getFootballStandings("BL1");
  assert.equal(calls.length, 2);
});

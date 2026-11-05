import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const originalFetch = globalThis.fetch;
let server;
let service;
let teams;
let leagues;

before(async () => {
  server = await createServer({
    root, configFile: false, logLevel: "error", appType: "custom",
    server: { middlewareMode: true, watch: null },
  });
  service = { ...await server.ssrLoadModule("/src/service/sportsService.js") };
  service.normalizeEspnEvent = (await server.ssrLoadModule("/src/service/espnService.js")).normalizeEspnEvent;
  teams = await server.ssrLoadModule("/src/data/sportsTeams.js");
  leagues = await server.ssrLoadModule("/src/data/sportsLeagues.js");
});

after(async () => {
  globalThis.fetch = originalFetch;
  await server?.close();
});

function fixture(id, date, state = "pre", homeId = "359", awayId = "360") {
  return {
    id, date,
    status: { type: { state, completed: state === "post" } },
    competitions: [{
      date,
      // ESPN의 배열 순서에 기대지 않도록 원정팀을 먼저 둡니다.
      competitors: [
        { homeAway: "away", score: "1", team: { id: awayId, displayName: "External away" } },
        { homeAway: "home", score: "3", team: { id: homeId, displayName: "External home" } },
      ],
    }],
  };
}

const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

test("ESPN IDs keep existing subscription IDs and Coupang names; scheduled scores stay hidden", () => {
  const game = service.normalizeEspnEvent("PL", fixture("one", "2026-11-05T12:00Z"));
  assert.equal(game.home.name, "아스날");
  assert.equal(game.home.id, "PL:57");
  assert.equal(game.away.name, "맨유");
  assert.equal(game.away.id, "PL:66");
  assert.equal(game.home.espnTeamId, "359");
  assert.equal(game.home.score, null);
  assert.equal(game.away.score, null);
  assert.equal(game.status, "SCHEDULED");
  assert.match(game.home.crest, /team-arsenal/);
  assert.equal(leagues.SPORTS_LEAGUES.length, 58);
  assert.equal(leagues.SPORTS_LEAGUES.filter((league) => league.espnPath).length, 19);
});

test("finished/live status, score objects and postponed status normalize correctly", () => {
  const raw = fixture("two", "2026-11-05T12:00Z", "post");
  raw.competitions[0].competitors[1].score = { value: 3 };
  const finished = service.normalizeEspnEvent("PL", raw);
  assert.equal(finished.status, "FINISHED");
  assert.equal(finished.home.score, 3);
  assert.equal(finished.away.score, 1);
  raw.competitions[0].status = { type: { state: "in" } };
  assert.equal(service.normalizeEspnEvent("PL", raw).status, "IN_PLAY");
  raw.competitions[0].status = { type: { name: "STATUS_POSTPONED", state: "pre" } };
  assert.equal(service.normalizeEspnEvent("PL", raw).status, "POSTPONED");
  assert.equal(service.normalizeEspnEvent("PL", raw).home.score, null);
});

test("unsupported leagues, unknown teams, cross-league teams and invalid dates are excluded", () => {
  assert.equal(service.normalizeEspnEvent("SA", fixture("x", "2026-01-01")), null);
  assert.equal(service.normalizeEspnEvent("PL", fixture("x", "2026-01-01", "pre", "999999")), null);
  assert.equal(service.normalizeEspnEvent("PD", fixture("x", "2026-01-01")), null);
  assert.equal(service.normalizeEspnEvent("PL", fixture("x", "bad-date")), null);
});

test("two separate ESPN date queries filter Korean midnight boundaries and deduplicate events", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return response({ events: [
      fixture("too-early", "2026-01-01T14:59:59Z"),
      fixture("midnight", "2026-01-01T15:00:00Z"),
      fixture("last-second", "2026-01-02T14:59:59Z"),
      fixture("too-late", "2026-01-02T15:00:00Z"),
    ] });
  };
  const games = await service.getFootballMatches("PL", "2026-01-02");
  assert.deepEqual(games.map((game) => game.sourceEventId), ["midnight", "last-second"]);
  assert.equal(calls.length, 2);
  assert(calls.some((url) => url.includes("dates=20260101")));
  assert(calls.some((url) => url.includes("dates=20260102")));
  assert(calls.every((url) => !url.includes("20260101-20260102")));
});

test("NBA uses ESPN's own ID namespace, KST dates, local names and local subscription IDs", async () => {
  globalThis.fetch = async () => response({ events: [
    fixture("nba-today", "2026-11-05T01:00:00Z", "post", "13", "2"),
    fixture("nba-tomorrow", "2026-11-05T16:00:00Z", "pre", "13", "2"),
  ] });
  const games = await service.getNbaGamesForSeoulDate("2026-11-05");
  assert.equal(games.length, 1);
  assert.equal(games[0].home.name, "LA 레이커스");
  assert.equal(games[0].away.name, "보스턴");
  assert.equal(games[0].home.id, "nba:nba-lal");
  assert.equal(games[0].sourceProvider, "espn");
});

test("concurrent and repeated requests share cached ESPN responses", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ events: [] }); };
  await Promise.all([
    service.getFootballMatches("PL", "2026-02-01"),
    service.getFootballMatches("PL", "2026-02-01"),
  ]);
  await service.getFootballMatches("PL", "2026-02-01");
  assert.equal(calls, 2);
});

test("a failed league reports partial errors without hiding successfully loaded games", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes("soccer/ger.1/")) return response({}, 503);
    return response({ events: String(url).includes("soccer/eng.1/")
      ? [fixture("partial", "2026-03-01T12:00:00Z")] : [] });
  };
  const result = await service.getFootballScheduleForDate("2026-03-01");
  assert.equal(result.games.length, 1);
  assert.equal(result.errors.length, 2);
  assert(result.errors.every((message) => message.includes("분데스리가")));
});

test("team enrichment preserves IDs, allowed team counts and order", async () => {
  globalThis.fetch = async () => response({ sports: [{ leagues: [{ teams: [
    { team: { id: "360", displayName: "Manchester United", logos: [{ href: "https://example.com/united.png" }] } },
    { team: { id: "999999", displayName: "Not in supplied list" } },
  ] }] }] });
  const remote = await service.getFootballTeams("PL");
  assert.equal(remote.length, 1);
  assert.equal(remote[0].id, "PL:66");
  const merged = teams.mergeSportsTeamDetails("PL", remote);
  assert.equal(merged.length, 20);
  assert.deepEqual(merged.map((team) => team.id), teams.SPORTS_TEAMS_BY_LEAGUE.PL.map((team) => team.id));
  assert.equal(teams.mergeSportsTeamDetails("FAC", []).length, 54);
});

test("invalid date and unsupported competition never cause network calls; malformed payload is an error", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ error: "not a scoreboard" }); };
  assert.deepEqual(await service.getFootballMatches("SA", "2026-01-01"), []);
  assert.deepEqual(await service.getFootballTeams("f1"), []);
  await assert.rejects(service.getFootballMatches("PL", "2026-02-30"), RangeError);
  assert.equal(calls, 0);
  await assert.rejects(service.getFootballMatches("PL", "2026-04-01"), /응답 형식/);
});

test("Kleague still uses the original monthly schedule source", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    const leagueId = JSON.parse(options.body).leagueId;
    return response({ resultCode: "200", data: { scheduleList: leagueId === "1" ? [{
      leagueId: "1", gameId: "domestic", gameDate: "2026.11.05", gameTime: "19:00",
      homeTeam: "K09", awayTeam: "K01",
    }] : [] } });
  };
  const games = await service.getKleagueMatchesForDate("2026-11-05");
  assert.equal(games.length, 1);
  assert.equal(games[0].home.name, "서울");
  assert(calls.every((url) => url.startsWith("/kleague/")));
});

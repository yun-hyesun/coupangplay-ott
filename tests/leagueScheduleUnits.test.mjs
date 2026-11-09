import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const NOW = Date.parse("2026-11-08T11:55:00Z");
const originalFetch = globalThis.fetch;
let server, units, service, espn;
const ok = data => ({ ok: true, json: async () => data });
const game = (fields = {}) => ({ competitionCode: "PL", matchday: 10, status: "FINISHED", utcDate: "2026-11-07T17:30:00Z", ...fields });
const event = (id, slug, date, year = 2026, state = "post") => ({ id, date, season: { year, type: 1, slug }, status: { type: { state, completed: state === "post" } }, competitions: [{}] });

before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  units = await server.ssrLoadModule("/src/data/leagueScheduleUnits.js");
  service = await server.ssrLoadModule("/src/service/leagueScheduleUnitsService.js");
  espn = await server.ssrLoadModule("/src/service/espnService.js");
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => { await server?.close(); });

test("schedule cards and select values preserve rounds, weeks and knockout stages as distinct units", () => {
  assert.equal(units.getScheduleUnit(game()).value, "10");
  assert.equal(units.getScheduleUnit(game({ competitionCode: "nba", scheduleSegment: "3주차" })).value, "week:3");
  assert.equal(units.getScheduleUnit(game({ matchday: null, scheduleSegment: "8강" })).value, "stage:8강");
  assert.equal(units.getScheduleUnit(game({ competitionCode: "nba", matchday: 82 })), null);
  assert.equal(units.getScheduleUnit(game({ matchday: null })), null);
});

test("only started units are included; late lower-round fixtures cannot reduce the current round", () => {
  const result = units.buildScheduleUnitOptions([game(), game({ matchday: 9, utcDate: "2026-11-08T10:00Z" }), game({ matchday: 11, status: "SCHEDULED" }), game({ matchday: 12, status: "POSTPONED" }), game({ matchday: 13, utcDate: "2026-11-08T12:00Z" })], NOW);
  assert.equal(result.options.length, 10);
  assert.equal(result.currentLabel, "10라운드");
  const stages = units.buildScheduleUnitOptions([game({ matchday: null, scheduleSegment: "16강" }), game({ matchday: null, scheduleSegment: "8강", utcDate: "2026-11-08T10:00Z" })], NOW);
  assert.deepEqual(stages.options.map(unit => unit.label), ["16강", "8강"]);
});

test("video filters use actual fixture weeks/stages and explicit video rounds", () => {
  assert.equal(units.matchesScheduleUnit("week:3", game({ competitionCode: "nba", scheduleSegment: "3주차" })), true);
  assert.equal(units.matchesScheduleUnit("week:3", game({ competitionCode: "nba", scheduleSegment: "2주차" })), false);
  assert.equal(units.matchesScheduleUnit("week:9", null, "NFL Week 9 highlights"), true);
  assert.equal(units.matchesScheduleUnit("stage:8강", game({ matchday: null, scheduleSegment: "8강" })), true);
  assert.equal(units.matchesScheduleUnit("10", game(), "9R highlights", "9"), false);
});

test("NBA uses the API season year and week metadata, not games played or a fixed round count", async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    if (url.includes("scoreboard")) return ok({ leagues: [{ season: { year: 2027, type: { id: "2" } } }], events: [] });
    assert.equal(url, "/espn-core/sports/basketball/leagues/nba/seasons/2027/types/2");
    return ok({ week: { number: 3, startDate: "2026-11-03T08:00Z", endDate: "2026-11-10T07:59Z" } });
  };
  const [a, b] = await Promise.all([service.getLeagueRoundOptions("nba", NOW), service.getLeagueRoundOptions("nba", NOW)]);
  assert.deepEqual(a.options.map(unit => unit.label), ["1주차", "2주차", "3주차"]);
  assert.deepEqual(a, b);
  await service.getLeagueRoundOptions("nba", NOW + 60000);
  assert.equal(calls.length, 2);
});

test("NFL does not advance to a future API week before its start date", async () => {
  globalThis.fetch = async url => {
    if (url.includes("scoreboard")) return ok({ leagues: [{ season: { year: 2026, type: { id: "2" } } }], events: [] });
    if (url.endsWith("/weeks/9")) return ok({ number: 9, startDate: "2026-11-04T08:00Z" });
    return ok({ week: { number: 10, startDate: "2026-11-11T08:00Z" } });
  };
  const result = await service.getLeagueRoundOptions("nfl", NOW);
  assert.equal(result.options.length, 9);
  assert.equal(result.options.at(-1).value, "week:9");
});

test("F1 reads season round/date/time and excludes the next Grand Prix", async () => {
  globalThis.fetch = async url => {
    assert.match(url, /\/jolpica\/f1\/2026\/races/);
    return ok({ MRData: { RaceTable: { Races: [{ round: "19", date: "2026-10-25", time: "17:00:00Z" }, { round: "20", date: "2026-11-08", time: "17:00:00Z" }] } } });
  };
  const result = await service.getLeagueRoundOptions("f1", NOW);
  assert.equal(result.options.length, 19);
});

test("K League uses roundId, actual Korean kickoff and status, falling back to the last played month", async () => {
  const months = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    months.push(body.month);
    return ok({ resultCode: "200", data: { scheduleList: [{ leagueId: 2, roundId: body.month === "11" ? 33 : 32, gameDate: body.month === "11" ? "2026.11.09" : "2026.10.31", gameTime: "14:00", endYn: body.month === "11" ? "N" : "Y", gameStatus: body.month === "11" ? "NS" : "FE" }] } });
  };
  const result = await service.getLeagueRoundOptions("kleague-2", NOW);
  assert.equal(result.options.length, 32);
  assert.deepEqual(months, ["11", "10"]);
});

test("cup stages come from played current-season events, not a calendar's prematurely active next stage", async () => {
  globalThis.fetch = async () => ok({ leagues: [{ season: { year: 2026, startDate: "2026-07-01T00:00Z" } }], events: [event("old-final", "final", "2026-05-01T00:00Z", 2025), event("first", "first-round", "2026-08-01T00:00Z"), event("second", "second-round", "2026-10-28T00:00Z"), event("future", "round-of-16", "2026-12-01T00:00Z", 2026, "pre")] });
  const result = await service.getLeagueRoundOptions("dfb", NOW);
  assert.deepEqual(result.options.map(unit => unit.label), ["1라운드", "2라운드"]);
  assert.equal(espn.getScheduleStageLabel("quarter-finals"), "8강");
});

test("ESPN phase-only and absent metadata remain truthful instead of manufacturing numbered rounds", async () => {
  globalThis.fetch = async url => ok({ leagues: [{ season: { year: 2026 } }], events: [event("phase", url.includes("esp.2") ? "regular-season" : "2026-27-turkish-super-lig", "2026-11-01T00:00Z")] });
  assert.deepEqual((await service.getLeagueRoundOptions("PD2", NOW)).options.map(unit => unit.label), ["정규시즌"]);
  assert.equal((await service.getLeagueRoundOptions("super-lig", NOW)).unavailable, true);
});

test("MLS follows page tokens before selecting the highest match_day", async () => {
  let pages = 0;
  globalThis.fetch = async url => {
    if (url.includes("competitions/")) return ok({ seasons: [{ season: 2026, season_id: "season-2026" }] });
    if (url.includes("/espn/")) return ok({ leagues: [{ season: { year: 2026 } }], events: [] });
    const next = url.includes("page_token=");
    pages++;
    return ok({ schedule: [{ match_day: next ? 35 : 34, planned_kickoff_time: "2026-11-07T00:00Z", match_status: "finalWhistle" }], next_page_token: next ? "" : "next-page" });
  };
  const result = await service.getLeagueRoundOptions("mls", NOW);
  assert.equal(result.options.length, 35);
  assert.equal(pages, 2);
});

test("NBA postseason preserves the API phase label instead of inventing regular-season weeks", async () => {
  const postseason = await server.ssrLoadModule("/src/service/leagueScheduleUnitsService.js?postseason-test");
  globalThis.fetch = async url => url.includes("scoreboard")
    ? ok({ leagues: [{ season: { year: 2027, type: { id: "3" } } }], events: [] })
    : ok({ slug: "post-season", name: "Postseason", startDate: "2027-04-13T00:00Z" });
  const result = await postseason.getLeagueRoundOptions("nba", Date.parse("2027-04-14T00:00Z"));
  assert.deepEqual(result.options.map(unit => unit.label), ["플레이오프"]);
});

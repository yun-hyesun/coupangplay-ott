import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, createService, leagues, calendar;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  createService = (await server.ssrLoadModule("/src/service/leagueMonthAvailabilityService.js")).createLeagueMonthService;
  leagues = (await server.ssrLoadModule("/src/data/sportsLeagues.js")).SPORTS_LEAGUES;
  calendar = await server.ssrLoadModule("/src/data/leagueSeasonCalendar.js");
});
after(async () => { await server?.close(); });
const packet = games => ({ games, complete: true, source: "test" });
const match = (gameId, utcDate) => ({ gameId, utcDate });
const active = data => Object.keys(data.months).filter(key => data.months[key] === "active");

test("European seasons cover both halves of the selected year and use Korean month/year boundaries", async () => {
  const calls = [];
  const duplicate = match("midnight", "2026-06-30T15:00:00Z");
  const service = createService({ football: async (league, season) => {
    calls.push([league, season]);
    return packet(season === 2025 ? [match("new-year", "2025-12-31T15:00:00Z"), match("spring", "2026-05-24T12:00:00Z"), duplicate]
      : [duplicate, match("autumn", "2026-08-20T12:00:00Z"), match("next-year", "2027-01-01T12:00:00Z")]);
  } });
  const data = await service.getYear("PL", 2026);
  assert.deepEqual(calls, [["PL", 2025], ["PL", 2026]]);
  assert.deepEqual(active(data), ["2026-01", "2026-05", "2026-07", "2026-08"]);
  assert.equal(data.counts["2026-07"], 1);
  assert.equal(data.months["2026-06"], "inactive");
  assert.ok(!Object.values(data.months).includes("unknown"));
});

test("a failed season uses its league's fallback while unverified months never become off-season", async () => {
  const calls = [];
  const service = createService({ football: async () => { throw new Error("rate limit"); }, espn: async (league, year, first, last) => {
    calls.push([league, year, first, last]);
    if (first === 7) throw new Error("offline");
    return packet([match("winter", "2026-02-10T12:00:00Z")]);
  } });
  const data = await service.getYear("PD", 2026);
  assert.deepEqual(calls, [["PD", 2026, 1, 6], ["PD", 2026, 7, 12]]);
  assert.equal(data.months["2026-02"], "active");
  assert.equal(data.months["2026-06"], "inactive");
  for (let month = 7; month <= 12; month++) assert.equal(data.months[`2026-${String(month).padStart(2, "0")}`], "unknown");
});

test("large NBA inventories use bounded quarterly requests, with summer gaps derived from fixtures", async () => {
  let running = 0, peak = 0;
  const quarters = [];
  const service = createService({ espn: async (league, year, first, last) => {
    assert.equal(league, "nba");
    peak = Math.max(peak, ++running);
    quarters.push([first, last]);
    await new Promise(setImmediate);
    running--;
    return packet(first === 7 ? [] : Array.from({ length: 3 }, (_, index) => match(String(first + index), `${year}-${String(first + index).padStart(2, "0")}-15T12:00:00Z`)));
  } });
  const data = await service.getYear("nba", 2026);
  assert.deepEqual(quarters, [[1, 3], [4, 6], [7, 9], [10, 12]]);
  assert.equal(peak, 2);
  assert.deepEqual([7, 8, 9].map(month => data.months[`2026-0${month}`]), ["inactive", "inactive", "inactive"]);
  assert.equal(data.months["2026-06"], "active");
  assert.equal(data.months["2026-10"], "active");
});

test("K League checks each actual calendar month and isolates a failed month", async () => {
  const months = [];
  const service = createService({ kleague: async (league, year, month) => {
    assert.equal(league, "kleague-2");
    months.push(month);
    if (month === 7) throw new Error("offline");
    return packet(month >= 3 && month <= 11 ? [{ gameId: month, dateKey: `${year}-${String(month).padStart(2, "0")}-15` }] : []);
  } });
  const data = await service.getYear("kleague-2", 2026);
  assert.equal(months.length, 12);
  assert.equal(data.months["2026-02"], "inactive");
  assert.equal(data.months["2026-03"], "active");
  assert.equal(data.months["2026-07"], "unknown");
  assert.equal(data.months["2026-12"], "inactive");
});

test("F1 uses the selected year's race calendar without fetching race results", async () => {
  let calls = 0;
  const service = createService({ f1: async year => {
    calls++;
    assert.equal(year, 2026);
    return packet([match("race", "2026-03-15T08:00:00Z")]);
  } });
  const data = await service.getYear("f1", 2026);
  assert.equal(calls, 1);
  assert.deepEqual(active(data), ["2026-03"]);
  assert.equal(data.months["2026-01"], "inactive");
});

test("truncated or malformed dates preserve unknown months instead of falsely marking a break", async () => {
  const service = createService({ espn: async () => ({ games: [match("known", "2026-01-05T12:00:00Z"), match("bad", "invalid")], complete: false }) });
  const data = await service.getYear("nfl", 2026);
  assert.equal(data.months["2026-01"], "active");
  assert.equal(data.months["2026-07"], "unknown");
});

test("cancelled views cannot cancel another caller's shared calendar lookup", async () => {
  let calls = 0;
  const service = createService({ football: async () => { calls++; await new Promise(setImmediate); return packet([]); } });
  const controller = new AbortController();
  const cancelled = service.getYear("BL1", 2026, { signal: controller.signal });
  const retained = service.getYear("BL1", 2026);
  controller.abort();
  const [a, b] = await Promise.allSettled([cancelled, retained]);
  assert.equal(a.status, "rejected");
  assert.equal(a.reason.name, "AbortError");
  assert.equal(b.status, "fulfilled");
  assert.equal(calls, 2);
  await service.getYear("BL1", 2026);
  assert.equal(calls, 2);
});

test("failed lookups are retryable and successful calendars are cached with a bounded lifetime", async () => {
  let time = 0, fail = true, calls = 0;
  const service = createService({ now: () => time, f1: async () => { calls++; if (fail) throw new Error("offline"); return packet([]); } });
  assert.equal((await service.getYear("f1", 2026)).months["2026-03"], "unknown");
  fail = false;
  assert.equal((await service.getYear("f1", 2026, { force: true })).months["2026-03"], "inactive");
  await service.getYear("f1", 2026);
  assert.equal(calls, 2);
  time = 12 * 60 * 60 * 1000 + 1;
  await service.getYear("f1", 2026);
  assert.equal(calls, 3);
});

test("month navigation skips empty months, crosses years and respects the current-month cap", async () => {
  const service = createService({ espn: async (league, year, first, last) => packet([1, 2, 8, 9, 10, 11, 12]
    .filter(month => month >= first && month <= last).map(month => match(`${year}:${month}`, `${year}-${String(month).padStart(2, "0")}-15T12:00:00Z`))) });
  const spring = await service.getNeighbors("nfl", "2026-03", "2026-11");
  assert.deepEqual([spring.previous, spring.next, spring.status], ["2026-02", "2026-08", "inactive"]);
  assert.equal((await service.getNeighbors("nfl", "2026-01", "2026-11")).previous, "2025-12");
  assert.equal((await service.getNeighbors("nfl", "2026-11", "2026-11")).next, null);
});

test("all 23 leagues currently exposed by the site use supported calendar sources", async () => {
  assert.equal(leagues.length, 23);
  const empty = async () => packet([]);
  const service = createService({ football: empty, espn: empty, kleague: empty, f1: empty });
  for (const league of leagues) {
    const data = await service.getYear(league.id, 2026);
    assert.equal(Object.keys(data.months).length, 12, league.id);
    assert.ok(Object.values(data.months).every(status => status === "inactive"), league.id);
  }
  await assert.rejects(service.getYear("not-a-league", 2026));
  await assert.rejects(service.getYear("PL", 2009));
});

test("NBA calendar keeps undecided playoffs available without treating training-camp September as a game month", () => {
  const data = calendar.readEspnSeasonMonths("nba", {
    calendarType: "day", season: { startDate: "2026-09-30T07:00Z", endDate: "2027-06-26T06:59Z" },
    calendar: ["2026-10-03T07:00Z", "2027-04-11T07:00Z"],
  });
  assert.equal(data.complete, true);
  assert.ok(data.activeMonths.includes("2027-05"));
  assert.ok(data.activeMonths.includes("2027-06"));
  assert.ok(!data.activeMonths.includes("2026-09"));
  assert.ok(!data.activeMonths.includes("2027-07"));
});

test("cup calendars use actual round month labels rather than broad inter-round date windows", () => {
  const data = calendar.readEspnSeasonMonths("dfb", {
    calendarType: "list", season: { startDate: "2025-07-01T04:00Z" },
    calendar: [{ label: "German Cup", entries: [
      { label: "First Round", detail: "Aug 15-27", startDate: "2025-07-01T07:00Z", endDate: "2025-08-28T06:59Z" },
      { label: "Second Round", detail: "Oct 28-29", startDate: "2025-08-28T07:00Z", endDate: "2025-11-02T06:59Z" },
      { label: "Quarterfinals", detail: "Feb 3-11" }, { label: "Final", detail: "May 23" },
    ] }],
  });
  assert.deepEqual(data.activeMonths, ["2025-08", "2025-10", "2026-02", "2026-05"]);
  assert.equal(calendar.readEspnSeasonMonths("dfb", {}).complete, false);
});

test("NFL metadata excludes its explicit off-season entry and retains postseason months across years", () => {
  const data = calendar.readEspnSeasonMonths("nfl", {
    calendarType: "list", season: { startDate: "2026-08-06T07:00Z" }, calendar: [
      { label: "Regular Season", entries: [{ detail: "Sep 6-15" }, { detail: "Dec 30-Jan 5" }] },
      { label: "Postseason", entries: [{ detail: "Jan 27-Feb 2" }] },
      { label: "Off Season", startDate: "2027-02-16T08:00Z", endDate: "2027-08-01T06:59Z" },
    ],
  });
  assert.deepEqual(data.activeMonths, ["2026-09", "2026-12", "2027-01", "2027-02"]);
});

test("official K League 2026 dates cover early-season archives and the World Cup break", () => {
  for (const league of ["kleague-1", "kleague-2"]) {
    const months = calendar.getPublishedLeagueMonths(league, 2026);
    assert.deepEqual(months, ["2026-02", "2026-03", "2026-04", "2026-05", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    assert.equal(calendar.getPublishedLeagueMonths(league, 2025), null);
  }
});

import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const NOW = Date.parse("2026-11-08T13:00:00Z");
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const match = (matchday = 12, fields = {}) => ({ matchday, status: "FINISHED", utcDate: "2026-11-07T20:00:00Z", stage: "REGULAR_SEASON", season: { startDate: "2026-08-01" }, homeTeam: { name: "not-needed-in-storage" }, ...fields });
const ok = (matches = [match()]) => ({ ok: true, json: async () => ({ competition: { code: "PD" }, filters: { season: "2026" }, matches }) });
let server, units, number = 0;
const freshService = () => server.ssrLoadModule(`/src/service/leagueScheduleUnitsService.js?recovery=${++number}`);
function storage() {
  const values = new Map();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) } } });
  return values;
}
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
  units = await server.ssrLoadModule("/src/data/leagueScheduleUnits.js");
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
});
after(async () => { await server?.close(); });

test("transient failures retain the last verified round and its real check time; manual retry advances it", async () => {
  const service = await freshService();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 2) return { ok: false, status: 429 };
    return ok([match(calls > 2 ? 13 : 12)]);
  };
  const first = await service.getLeagueRoundOptions("PD", NOW);
  const stale = await service.getLeagueRoundOptions("PD", NOW + 300000);
  assert.equal(stale.options.length, 12);
  assert.equal(stale.stale, true);
  assert.equal(stale.checkedAt, first.checkedAt);
  assert.match(stale.warning, /마지막으로 확인/);
  await service.getLeagueRoundOptions("PD", NOW + 301000);
  assert.equal(calls, 2);
  const recovered = await service.getLeagueRoundOptions("PD", NOW + 302000, { force: true });
  assert.equal(recovered.options.length, 13);
  assert.equal(recovered.stale, false);
  assert.equal(recovered.warning, "");
  assert.equal(calls, 3);
});

test("a reload restores validated API evidence without another request, then survives a timed-out refresh", async () => {
  const values = storage();
  globalThis.fetch = async () => ok();
  await (await freshService()).getLeagueRoundOptions("PD", NOW);
  const saved = values.get("sports-rounds:v1:PD");
  assert.ok(saved);
  assert.ok(!saved.includes("not-needed-in-storage"));
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); };
  const reloaded = await freshService();
  assert.equal((await reloaded.getLeagueRoundOptions("PD", NOW + 60000)).options.length, 12);
  assert.equal(calls, 0);
  const stale = await reloaded.getLeagueRoundOptions("PD", NOW + 360000);
  assert.equal(stale.options.length, 12);
  assert.equal(stale.stale, true);
  assert.equal(stale.checkedAt, new Date(NOW).toISOString());
  assert.equal(calls, 1);
});

test("expired, corrupt, wrong-league or previous-season browser values cannot fabricate a current round", async () => {
  const values = storage();
  const valid = { leagueId: "PD", at: NOW, data: { source: "Football-Data", seasonYear: "2026", matches: [match()] } };
  const invalid = ["{broken", JSON.stringify({ ...valid, at: NOW - 86400000 }), JSON.stringify({ ...valid, leagueId: "PL" }),
    JSON.stringify({ ...valid, data: { ...valid.data, seasonYear: "2025" } }),
    JSON.stringify({ ...valid, data: { ...valid.data, matches: [match(999)] } })];
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  for (const entry of invalid) {
    values.set("sports-rounds:v1:PD", entry);
    await assert.rejects((await freshService()).getLeagueRoundOptions("PD", NOW), /불러오지/);
  }
});

test("failure without any verified data stays honest and automatic retry respects its cooldown", async () => {
  const service = await freshService();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false, status: 503 }; };
  await assert.rejects(service.getLeagueRoundOptions("PD", NOW));
  await assert.rejects(service.getLeagueRoundOptions("PD", NOW + 59000));
  assert.equal(calls, 1);
  await assert.rejects(service.getLeagueRoundOptions("PD", NOW + 60000));
  assert.equal(calls, 2);
});

test("blocked browser storage does not turn a successful API response into an error", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("storage blocked"); } } });
  globalThis.fetch = async () => ok();
  const result = await (await freshService()).getLeagueRoundOptions("PD", NOW);
  assert.equal(result.options.length, 12);
  assert.equal(result.stale, false);
});

test("initial failures can use started current-month fixtures, without using historical videos or future games", () => {
  const failed = { leagueId: "PD", options: [], error: "현재 라운드를 불러오지 못했습니다." };
  const fixtures = [match(12, { competitionCode: "PD" }), match(13, { utcDate: "2026-11-09T00:00:00Z", status: "SCHEDULED" })];
  const fallback = units.resolveScheduleUnitState(failed, fixtures, "2026-11", "2026-11", NOW);
  assert.equal(fallback.options.length, 12);
  assert.equal(fallback.error, "");
  assert.match(fallback.warning, /경기 일정/);
  assert.equal(units.resolveScheduleUnitState(failed, fixtures, "2026-10", "2026-11", NOW), failed);
  assert.equal(units.resolveScheduleUnitState(failed, [], "2026-11", "2026-11", NOW), failed);
  const known = { ...failed, options: [{ value: "14", label: "14라운드" }] };
  assert.equal(units.resolveScheduleUnitState(known, fixtures, "2026-11", "2026-11", NOW), known);
});

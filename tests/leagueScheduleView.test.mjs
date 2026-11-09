import assert from "node:assert/strict";
import { test } from "node:test";
import { getCalendarDays, getRecentScheduleGame, getRoundWindow, getScheduleDateWindow, getScheduleRounds, getScheduleSeason, getSeasonRange, groupScheduleGames } from "../src/data/leagueScheduleView.js";

const game = (id, utcDate, matchday, status = "SCHEDULED") => ({ gameId: id, utcDate, matchday, status, competitionCode: "PL" });

test("season navigation uses football seasons and calendar-year competitions", () => {
  assert.equal(getScheduleSeason("PL", "2027-01-01"), 2026);
  assert.equal(getScheduleSeason("PL", "2026-11-09"), 2026);
  assert.equal(getScheduleSeason("kleague-1", "2027-01-01"), 2027);
  assert.deepEqual(getSeasonRange("PL", 2026), { from: "2026-07-01", to: "2027-06-30", label: "2026-27" });
  assert.deepEqual(getSeasonRange("f1", 2026), { from: "2026-01-01", to: "2026-12-31", label: "2026" });
});

test("round options come only from actual fixtures and the five-item window stops at each edge", () => {
  const rounds = getScheduleRounds([game("two", "2026-09-01", 2), game("one", "2026-08-01", 1), game("dup", "2026-09-01", 2), game("none", "2026-09-01", "")]);
  assert.deepEqual(rounds.map(round => round.value), ["1", "2"]);
  const options = Array.from({ length: 38 }, (_, index) => ({ value: String(index + 1) }));
  assert.deepEqual(getRoundWindow(options, "8").items.map(option => option.value), ["6", "7", "8", "9", "10"]);
  assert.equal(getRoundWindow(options, "1").hasPrevious, false);
  assert.equal(getRoundWindow(options, "38").hasNext, false);
  assert.deepEqual(getRoundWindow(options, "38").items.map(option => option.value), ["34", "35", "36", "37", "38"]);
  assert.equal(getRoundWindow(options, "1", 5).start, 5);
  assert.equal(getRoundWindow(options, "38", -5).start, 28);
});

test("date groups use Korean midnight and round groups keep postponed fixtures on their actual date", () => {
  const fixtures = [game("late", "2026-10-26T15:00:00Z", 8), game("early", "2026-10-26T14:59:59Z", 8), game("other", "2026-10-28T01:00:00Z", 9), game("rearranged", "2026-12-01T12:00:00Z", 8)];
  assert.deepEqual(groupScheduleGames(fixtures, { mode: "date", dateKey: "2026-10-27" })[0].matches.map(item => item.gameId), ["late"]);
  assert.deepEqual(groupScheduleGames([...fixtures, fixtures[0]], { mode: "round", round: "8" }).map(group => group.date), ["2026-10-26", "2026-10-27", "2026-12-01"]);
  assert.deepEqual(groupScheduleGames(fixtures, { mode: "round", round: "10" }), []);
});

test("recent selection prioritizes live fixtures, then the next fixture, then the final result", () => {
  const fixtures = [game("old", "2026-10-20T00:00:00Z", 7, "FINISHED"), game("next", "2026-10-27T00:00:00Z", 8), game("live", "2026-10-26T00:00:00Z", 8, "IN_PLAY")];
  assert.equal(getRecentScheduleGame(fixtures, "2026-10-26").gameId, "live");
  assert.equal(getRecentScheduleGame(fixtures.slice(0, 2), "2026-10-26").gameId, "next");
  assert.equal(getRecentScheduleGame(fixtures.slice(0, 2), "2027-01-01").gameId, "next");
  assert.equal(getRecentScheduleGame([], "2026-10-26"), undefined);
});

test("calendar has six weeks with leap day and adjacent-month dates", () => {
  const days = getCalendarDays("2028-02");
  assert.equal(days.length, 42);
  assert.equal(new Date(`${days[0]}T00:00:00Z`).getUTCDay(), 0);
  assert.ok(days.includes("2028-02-29"));
  assert.ok(days.includes("2028-01-31"));
  assert.ok(days.includes("2028-03-01"));
});

test("date buttons contain only actual Korean match dates and skip long gaps without duplicate days", () => {
  const fixtures = [
    game("before-midnight", "2026-11-07T14:59:00Z", 12),
    game("after-midnight", "2026-11-07T15:00:00Z", 12),
    game("same-day", "2026-11-08T01:00:00Z", 12),
    game("monday", "2026-11-08T20:00:00Z", 12),
    game("after-break", "2026-11-20T15:00:00Z", 13),
    game("invalid", "invalid", 13),
  ];
  const window = getScheduleDateWindow(fixtures, "2026-11-10");
  assert.deepEqual(window.items, ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-21"]);
  assert.equal(window.selectedDate, "2026-11-21");
  assert.equal(window.hasPrevious, false);
  assert.equal(window.hasNext, false);
});

test("date navigation moves between fixture days across months and stops at the season edges", () => {
  const dates = ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-12-01", "2026-12-02", "2026-12-04", "2026-12-05", "2026-12-06", "2026-12-10"];
  const fixtures = dates.map((date, index) => game(String(index), `${date}T12:00:00+09:00`, 12));
  const middle = getScheduleDateWindow(fixtures, "2026-11-09");
  assert.deepEqual(middle.items, ["2026-11-02", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-21", "2026-11-22", "2026-11-23"]);
  assert.equal(middle.previousDate, "2026-10-31");
  assert.equal(middle.nextDate, "2026-12-04");
  const last = getScheduleDateWindow(fixtures, middle.nextDate);
  assert.equal(last.selectedDate, "2026-12-04");
  assert.equal(last.hasNext, false);
  assert.equal(getScheduleDateWindow(fixtures, "2020-01-01").hasPrevious, false);
  assert.equal(getScheduleDateWindow(fixtures, "2027-01-01").selectedDate, "2026-12-10");
  assert.deepEqual(getScheduleDateWindow([], "2026-11-09").items, []);
});

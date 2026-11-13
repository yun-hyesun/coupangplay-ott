import test from "node:test";
import assert from "node:assert/strict";
import { buildTournamentBracket, isKnockoutLeague } from "./leagueTournamentBracket.js";

const team = (id, score, extra = {}) => ({ id, espnTeamId: id, name: id, score, ...extra });
const game = (id, phase, home, away, extra = {}) => ({
  gameId: id, seasonPhase: phase, seasonYear: 2026, status: "FINISHED",
  utcDate: "2026-04-01T12:00:00Z", home, away, ...extra,
});
const NOW = Date.parse("2026-11-13T00:00:00Z");
const build = (games, leagueId = "FAC") => buildTournamentBracket(games, { leagueId, season: 2026, now: NOW });
const matches = (bracket, size) => bracket.rounds.find(round => round.size === size).slots.filter(Boolean);

test("the six knockout cups exclude competitions with group or regular-season standings", () => {
  for (const id of ["FAC", "carabao", "dfb", "copa-del-rey", "coupe-de-france", "concacaf-champions-cup"]) assert.equal(isKnockoutLeague(id), true);
  for (const id of ["acle", "acl2", "PL", "nba", "nfl", "mls"]) assert.equal(isKnockoutLeague(id), false);
});

test("unpublished rounds preserve four quarterfinals, two semifinals and one final without inventing teams", () => {
  const bracket = build([]);
  assert.deepEqual(bracket.rounds.map(round => round.slots.length), [4, 2, 1]);
  assert(bracket.rounds.every(round => round.slots.every(tie => tie === null)));
  assert(bracket.rounds.every(round => round.connections.every(connection => !connection.confirmed)));
  assert.equal(bracket.champion, null);
});

test("published quarterfinals do not assume an unpublished semifinal draw", () => {
  const bracket = build([game("q1", "quarterfinals", team("A", 1), team("B", 0))]);
  assert.equal(matches(bracket, 8).length, 1);
  assert.equal(matches(bracket, 4).length, 0);
  assert.equal(bracket.rounds[0].connections.filter(connection => connection.confirmed).length, 0);
});

test("confirmed participants determine bracket ordering instead of fixture dates", () => {
  const bracket = build([
    game("q1", "quarterfinals", team("A", 1), team("B", 0)),
    game("q2", "quarterfinals", team("C", 2), team("D", 1)),
    game("q3", "quarterfinals", team("E", 3), team("F", 0)),
    game("q4", "quarterfinals", team("G", 1), team("H", 0)),
    game("s1", "semifinals", team("C", 2), team("A", 0)),
    game("s2", "semifinals", team("G", 0), team("E", 2)),
    game("f", "final", team("E", 3), team("C", 1)),
  ]);
  assert.deepEqual(matches(bracket, 4).map(tie => tie.game.gameId), ["s2", "s1"]);
  assert.deepEqual(matches(bracket, 8).map(tie => tie.game.gameId), ["q4", "q3", "q2", "q1"]);
  assert.equal(bracket.champion.key, "E");
  assert.equal(bracket.rounds[0].connections.filter(connection => connection.confirmed).length, 4);
});

test("home and away legs form one tie and use aggregate scores rather than the second-leg winner", () => {
  const first = game("s1", "semifinals", team("A", 3, { winner: true }), team("B", 1));
  const second = game("s2", "semifinals", team("B", 1, { winner: true }), team("A", 0), { utcDate: "2026-04-08T12:00:00Z" });
  const tie = matches(build([second, first, first], "copa-del-rey"), 4)[0];
  assert.equal(tie.games.length, 2);
  assert.deepEqual(tie.teams.map(item => item.score), [3, 2]);
  assert.equal(tie.winnerKey, "A");
});

test("a completed first leg does not decide a two-legged tie", () => {
  const first = game("s1", "semifinals", team("A", 2, { winner: true }), team("B", 0));
  const tie = matches(build([first], "carabao"), 4)[0];
  assert.equal(tie.completed, false);
  assert.equal(tie.winnerKey, "");
  assert.deepEqual(tie.teams.map(item => item.score), [2, 0]);
});

test("a live second leg displays the running aggregate without declaring a winner", () => {
  const first = game("s1", "semifinals", team("A", 2), team("B", 0));
  const second = game("s2", "semifinals", team("B", 3), team("A", 1), { status: "IN_PLAY", utcDate: "2026-04-08T12:00:00Z" });
  const tie = matches(build([first, second], "carabao"), 4)[0];
  assert.equal(tie.live, true);
  assert.equal(tie.completed, false);
  assert.equal(tie.scoresAreAggregate, true);
  assert.deepEqual(tie.teams.map(item => item.score), [3, 3]);
  assert.equal(tie.winnerKey, "");
});

test("official completed-series metadata retains the result when only the deciding leg is returned", () => {
  const second = game("s2", "semifinals", team("A", 1, { aggregateScore: 4, seriesWinner: true }), team("B", 0, { aggregateScore: 1 }), { seriesCompleted: true });
  const tie = matches(build([second], "carabao"), 4)[0];
  assert.equal(tie.completed, true);
  assert.equal(tie.scoresAreAggregate, true);
  assert.deepEqual(tie.teams.map(item => item.score), [4, 1]);
  assert.equal(tie.winnerKey, "A");
});

test("official series winners resolve tied aggregates including away-goal decisions", () => {
  const first = game("q1", "quarterfinals", team("A", 2), team("B", 0));
  const second = game("q2", "quarterfinals", team("B", 3), team("A", 1, { seriesWinner: true }), { utcDate: "2026-04-08T12:00:00Z" });
  const tie = matches(build([first, second], "concacaf-champions-cup"), 8)[0];
  assert.deepEqual(tie.teams.map(item => item.score), [3, 3]);
  assert.equal(tie.winnerKey, "A");
});

test("penalty shootouts select the winner without replacing the match score", () => {
  const final = game("f", "final", team("A", 1, { shootoutScore: 5 }), team("B", 1, { shootoutScore: 6 }));
  const bracket = build([final]);
  assert.equal(bracket.champion.key, "B");
  assert.deepEqual(matches(bracket, 2)[0].teams.map(item => item.score), [1, 1]);
});

test("previous seasons and the round of 16 cannot leak into the three-round bracket", () => {
  const bracket = build([
    game("old", "final", team("A", 1), team("B", 0), { seasonYear: 2025 }),
    game("early", "round-of-16", team("C", 1), team("D", 0)),
    game("current", "quarterfinals", team("E", 0), team("F", 1)),
  ]);
  assert.equal(bracket.publishedTies, 1);
  assert.equal(bracket.champion, null);
});

test("scheduled zero scores and unknown participants do not create results or confirmed paths", () => {
  const bracket = build([game("future", "final", team("TBD", 0), team("미정", 0), { status: "SCHEDULED" })]);
  assert.equal(bracket.publishedTies, 0);
  assert.equal(bracket.champion, null);
});

test("2026-27 fixtures appear only after kickoff with a live or completed status", () => {
  const bracket = build([
    game("scheduled", "quarterfinals", team("A", 0), team("B", 0), { status: "SCHEDULED" }),
    game("postponed", "quarterfinals", team("C", 0), team("D", 0), { status: "POSTPONED" }),
    game("cancelled", "quarterfinals", team("E", 0), team("F", 0), { status: "CANCELED" }),
    game("next-year", "semifinals", team("G", 1), team("H", 0), { utcDate: "2027-01-01T12:00:00Z" }),
    game("live", "quarterfinals", team("I", 0), team("J", 0), { status: "IN_PLAY" }),
    game("ended", "quarterfinals", team("K", 2), team("L", 1)),
  ]);
  assert.deepEqual(matches(bracket, 8).map(tie => tie.game.gameId).sort(), ["ended", "live"]);
  assert.equal(matches(bracket, 4).length, 0);
});

test("a 2027 match stays hidden until both kickoff and the provider's started status", () => {
  const kickoff = Date.parse("2027-02-10T12:00:00Z");
  const fixture = game("2027-live", "quarterfinals", team("A", 0), team("B", 0), { status: "IN_PLAY", seasonYear: 2027, utcDate: "2027-02-10T12:00:00Z" });
  const options = { leagueId: "concacaf-champions-cup", season: 2027 };
  assert.equal(buildTournamentBracket([fixture], { ...options, now: kickoff - 1 }).publishedTies, 0);
  assert.equal(buildTournamentBracket([{ ...fixture, status: "SCHEDULED" }], { ...options, now: kickoff + 1 }).publishedTies, 0);
  assert.equal(buildTournamentBracket([fixture], { ...options, now: kickoff }).publishedTies, 1);
  assert.equal(buildTournamentBracket([{ ...fixture, status: "FINISHED" }], { ...options, now: kickoff + 1 }).publishedTies, 1);
});

test("an unplayed next-round fixture cannot reveal future participants or connect the bracket", () => {
  const bracket = build([
    game("q1", "quarterfinals", team("A", 2), team("B", 0)),
    game("s1", "semifinals", team("A", 0), team("C", 0), { status: "SCHEDULED" }),
  ]);
  assert.equal(bracket.publishedTies, 1);
  assert.equal(matches(bracket, 4).length, 0);
  assert.equal(bracket.rounds[0].connections.some(connection => connection.confirmed), false);
});

test("Carabao standings map the third and fourth rounds to 32 and 16 teams without including earlier or unplayed fixtures", () => {
  const bracket = buildTournamentBracket([
    game("first", "first-round", team("early-A", 2), team("early-B", 0)),
    game("second", "second-round", team("early-C", 1), team("early-D", 0)),
    game("third", "third-round", team("A", 2), team("B", 0)),
    game("third-other", "third-round", team("C", 1), team("D", 0)),
    game("fourth", "fourth-round", team("C", 1), team("A", 0)),
    game("quarter", "quarterfinals", team("C", 0), team("E", 0), { status: "SCHEDULED" }),
  ], { leagueId: "carabao", season: 2026, now: NOW, startRound: 32 });
  assert.deepEqual(bracket.rounds.map(round => round.label), ["32강", "16강", "8강", "4강", "결승"]);
  assert.deepEqual(bracket.rounds.map(round => round.slots.length), [16, 8, 4, 2, 1]);
  assert.equal(bracket.publishedTies, 3);
  assert.equal(matches(bracket, 8).length, 0);
  assert.deepEqual(matches(bracket, 32).map(tie => tie.game.gameId), ["third-other", "third"]);
  assert.equal(bracket.rounds[0].connections.filter(connection => connection.confirmed).length, 2);
  assert.equal(bracket.champion, null);
});

test("a complete 32-team Carabao bracket links every elimination round to the champion, including two semifinal legs", () => {
  const games = [];
  let contenders = Array.from({ length: 32 }, (_, index) => `T${index}`);
  for (const [size, phase] of [[32, "third-round"], [16, "fourth-round"], [8, "quarterfinals"], [4, "semifinals"], [2, "final"]]) {
    const winners = [];
    for (let index = 0; index < contenders.length; index += 2) {
      const [home, away] = contenders.slice(index, index + 2);
      games.push(game(`${size}-${index}`, phase, team(home, 2), team(away, 0)));
      if (size === 4) games.push(game(`${size}-${index}-second`, phase, team(away, 1), team(home, 0), { utcDate: "2026-04-08T12:00:00Z" }));
      winners.push(home);
    }
    contenders = winners;
  }
  const bracket = buildTournamentBracket(games.reverse(), { leagueId: "carabao", season: 2026, now: NOW, startRound: 32 });
  assert.equal(bracket.publishedTies, 31);
  assert.deepEqual(bracket.rounds.map(round => round.slots.filter(Boolean).length), [16, 8, 4, 2, 1]);
  assert.deepEqual(bracket.rounds.map(round => round.connections.filter(connection => connection.confirmed).length), [16, 8, 4, 2, 0]);
  assert.equal(bracket.champion.key, "T0");
  for (let index = 0; index < bracket.rounds.length - 1; index++) {
    for (const connection of bracket.rounds[index].connections) {
      const tie = bracket.rounds[index].slots[connection.from];
      const parent = bracket.rounds[index + 1].slots[connection.to];
      assert(parent.teams.some(candidate => candidate.key === tie.winnerKey));
    }
  }
});

test("Carabao's numbered rounds do not change the other cups or the existing eight-team home preview", () => {
  const games = [
    game("third", "third-round", team("A", 2), team("B", 0)),
    game("fourth", "fourth-round", team("A", 1), team("C", 0)),
    game("quarter", "quarterfinals", team("A", 3), team("D", 0)),
  ];
  assert.equal(build(games, "carabao").publishedTies, 1);
  const otherCup = buildTournamentBracket(games, { leagueId: "FAC", season: 2026, now: NOW, startRound: 32 });
  assert.equal(matches(otherCup, 32).length, 0);
  assert.equal(matches(otherCup, 16).length, 0);
  assert.equal(otherCup.publishedTies, 1);
});

test("played matches can lead to neutral empty slots without publishing a scheduled opponent or declaring advancement", () => {
  const bracket = buildTournamentBracket([
    game("third", "third-round", team("A", 2), team("B", 0)),
    game("fourth", "fourth-round", team("A", 0), team("future-opponent", 0), { status: "SCHEDULED" }),
  ], { leagueId: "carabao", season: 2026, now: NOW, startRound: 32 });
  assert.equal(bracket.publishedTies, 1);
  assert.deepEqual(bracket.rounds.map(round => round.connections.length), [16, 8, 4, 2, 0]);
  assert(bracket.rounds.every(round => round.connections.every(connection => !connection.confirmed)));
  assert(bracket.rounds.slice(1).every(round => round.slots.every(tie => tie === null)));
  assert.equal(bracket.champion, null);
  assert.equal(JSON.stringify(bracket).includes("future-opponent"), false);
});

test("neutral placeholder paths do not connect unrelated real matches when a provider omits results", () => {
  const bracket = build([
    game("quarter", "quarterfinals", team("A", 1), team("B", 0)),
    game("semi", "semifinals", team("C", 2), team("D", 0)),
  ], "carabao");
  const quarterfinals = bracket.rounds[0];
  assert.equal(quarterfinals.slots[0].winnerKey, "A");
  assert.equal(quarterfinals.connections.some(connection => connection.from === 0), false);
});

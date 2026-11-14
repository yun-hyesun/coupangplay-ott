const KNOCKOUT_LEAGUES = new Set(["carabao", "dfb", "FAC", "copa-del-rey", "coupe-de-france", "concacaf-champions-cup"]);
const ROUNDS = [{ size: 32, label: "32강" }, { size: 16, label: "16강" }, { size: 8, label: "8강" }, { size: 4, label: "4강" }, { size: 2, label: "결승" }];

export const isKnockoutLeague = leagueId => KNOCKOUT_LEAGUES.has(leagueId);

function teamKey(team) {
  if (!team?.name || /^(TBD|TBC|미정|To Be Determined)$/i.test(team.name.trim())) return "";
  return String(team.espnTeamId || team.teamId || team.id || team.name);
}

function stageSize(game, leagueId) {
  const phase = String(game.seasonPhase || "").toLowerCase().replaceAll("-", "");
  if (phase === "roundof32" || (leagueId === "carabao" && phase === "thirdround")) return 32;
  if (phase === "roundof16" || (leagueId === "carabao" && phase === "fourthround")) return 16;
  if (/^quarterfinals?$/.test(phase)) return 8;
  if (/^semifinals?$/.test(phase)) return 4;
  if (phase === "final") return 2;
  const label = String(game.scheduleSegment || game.stage || "").trim();
  if (leagueId === "carabao" && label === "3라운드") return 32;
  if (leagueId === "carabao" && label === "4라운드") return 16;
  return ROUNDS.find(round => round.label === label)?.size || null;
}

const isFinished = game => /^(FINISHED(?:_AET|_PEN)?|FULL_TIME|FINAL|ENDED|COMPLETED?|AWARDED)$/i.test(game.status || "");
const isLive = game => /^(IN_PLAY|LIVE|PAUSED|EXTRA_TIME|PENALTY_SHOOTOUT)$/i.test(game.status || "");
const gameTime = game => String(game.utcDate || game.startTime || game.dateKey || "");
const hasStarted = (game, now) => {
  const kickoff = Date.parse(gameTime(game));
  return Number.isFinite(kickoff) && kickoff <= now && (isLive(game) || isFinished(game));
};
const numberOrNull = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const participants = game => [game.home, game.away];

function buildTie(games, leagueId, size) {
  const ordered = [...games].sort((a, b) => gameTime(a).localeCompare(gameTime(b)));
  const first = ordered[0];
  const last = ordered.at(-1);
  const twoLegged = ordered.some(game => Number(game.seriesTotalCompetitions) > 1)
    || (leagueId === "concacaf-champions-cup" && size !== 2)
    || (["carabao", "copa-del-rey"].includes(leagueId) && size === 4);
  const completed = ordered.every(isFinished) && (!twoLegged || ordered.length >= 2 || last.seriesCompleted === true);
  const latestResult = ordered.filter(game => isFinished(game) || isLive(game)).at(-1);
  const scoresAreAggregate = twoLegged && (completed || (ordered.length >= 2 && latestResult === last));
  const teams = participants(first).map(team => {
    const key = teamKey(team);
    if (!key) return null;
    const latestTeam = latestResult && participants(latestResult).find(candidate => teamKey(candidate) === key);
    const legScores = ordered.map(game => participants(game).find(candidate => teamKey(candidate) === key)?.score);
    const aggregate = numberOrNull(latestTeam?.aggregateScore);
    const score = scoresAreAggregate
      ? aggregate ?? (legScores.every(value => numberOrNull(value) != null) ? legScores.reduce((total, value) => total + Number(value), 0) : null)
      : numberOrNull(latestTeam?.score);
    return { ...team, key, score, shootoutScore: numberOrNull(latestTeam?.shootoutScore) };
  });
  let winnerKey = "";
  if (completed) {
    const declared = participants(last).find(team => twoLegged ? team?.seriesWinner : team?.winner);
    if (declared) winnerKey = teamKey(declared);
    else if (teams.every(Boolean)) {
      const [home, away] = teams;
      if (home.score != null && away.score != null && home.score !== away.score) winnerKey = home.score > away.score ? home.key : away.key;
      else if (home.shootoutScore != null && away.shootoutScore != null && home.shootoutScore !== away.shootoutScore) {
        winnerKey = home.shootoutScore > away.shootoutScore ? home.key : away.key;
      }
    }
  }
  const game = ordered.find(isLive) || ordered.find(item => !isFinished(item)) || last;
  return {
    id: `${size}:${first.gameId}`, size, teams, games: ordered, game,
    startTime: gameTime(first), endTime: gameTime(last), twoLegged, scoresAreAggregate, completed, winnerKey,
    live: ordered.some(isLive),
  };
}

// Only confirmed participants link two rounds. A future draw must not be inferred
// from fixture dates or the order returned by the schedule provider.
function alignPreviousRound(ties, nextRound, capacity) {
  const slots = Array(capacity).fill(null);
  const used = new Set();
  const connections = [];
  nextRound.forEach((parent, parentIndex) => {
    parent?.teams.forEach((team, teamIndex) => {
      if (!team) return;
      const tie = ties.find(candidate => !used.has(candidate.id) && candidate.teams.some(item => item?.key === team.key));
      if (!tie) return;
      const index = parentIndex * 2 + teamIndex;
      slots[index] = { ...tie, winnerKey: tie.winnerKey || (tie.completed ? team.key : "") };
      used.add(tie.id);
      connections.push({ from: index, to: parentIndex, confirmed: true });
    });
  });
  for (const tie of ties.filter(item => !used.has(item.id))) {
    const index = slots.indexOf(null);
    if (index === -1) break;
    slots[index] = tie;
  }
  slots.forEach((tie, index) => {
    if (!connections.some(connection => connection.from === index) && (!tie || !nextRound[Math.floor(index / 2)])) {
      connections.push({ from: index, to: Math.floor(index / 2), confirmed: false });
    }
  });
  return { slots, connections };
}

export function buildTournamentBracket(games, { leagueId, season, now = Date.now(), startRound = 8 }) {
  const visibleRounds = ROUNDS.filter(round => round.size <= startRound);
  const allowedSizes = new Set(visibleRounds.map(round => round.size));
  const groups = new Map();
  const seen = new Set();
  for (const game of games) {
    const size = stageSize(game, leagueId);
    if (!allowedSizes.has(size) || !hasStarted(game, now) || (game.seasonYear != null && Number(game.seasonYear) !== Number(season))) continue;
    const identity = game.gameId || `${size}:${gameTime(game)}:${teamKey(game.home)}:${teamKey(game.away)}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const keys = participants(game).map(teamKey);
    const pair = keys.every(Boolean) ? [...keys].sort().join(":") : identity;
    const key = `${size}:${pair}`;
    if (!groups.has(key)) groups.set(key, { size, games: [] });
    groups.get(key).games.push(game);
  }
  const ties = [...groups.values()].map(group => buildTie(group.games, leagueId, group.size))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  const final = ties.find(tie => tie.size === 2) || null;
  const bySize = new Map();
  for (const round of [...visibleRounds].reverse()) {
    const layout = round.size === 2 ? { slots: [final], connections: [] }
      : alignPreviousRound(ties.filter(tie => tie.size === round.size), bySize.get(round.size / 2).slots, round.size / 2);
    bySize.set(round.size, { ...round, ...layout });
  }
  const rounds = visibleRounds.map(round => bySize.get(round.size));
  return { rounds, publishedTies: ties.length, champion: final?.teams.find(team => team?.key === final.winnerKey) || null };
}

export function selectLeagueStandings(rows, limit = 20, { allowUnranked = false } = {}) {
  return rows.map((row, index) => ({ row, index, rank: row.rank == null ? null : Number(row.rank) }))
    .filter(({ rank }) => rank === null ? allowUnranked : Number.isInteger(rank) && rank >= 1 && rank <= limit)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.index - b.index)
    .slice(0, limit)
    .map(({ row }) => row);
}

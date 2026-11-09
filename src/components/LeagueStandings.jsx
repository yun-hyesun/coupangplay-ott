import { EmptyMessage } from "./LeagueDetailShared";

export function LeagueStandings({ league, standingsState, tableRows, tableNote, tableColumns, isBasketball }) {
  return (
    <section className="league-detail__section league-detail__standings" aria-labelledby="league-detail-standings-title">
      <div className="league-detail__section-heading">
        <h2 id="league-detail-standings-title">리그 순위</h2>
      </div>
      {tableNote && <p className="league-detail__table-note">{tableNote}</p>}
      {standingsState.loading ? (
        <EmptyMessage>순위 정보를 불러오는 중입니다.</EmptyMessage>
      ) : tableRows.length ? (
        <div className="league-detail__table-wrap">
          <table aria-label={`${league.name} 리그 순위 상위 10팀`}>
            <thead><tr>{tableColumns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {tableRows.slice(0, 10).map((row, index) => (
                <tr key={row.teamId || row.teamName || index}>
                  <td>{row.rank ?? "—"}</td>
                  <td className="league-detail__table-team">
                    {row.logoPath && <img src={row.logoPath} alt="" loading="lazy" />}
                    <span>{row.teamName}</span>
                  </td>
                  {isBasketball ? (
                    <>
                      <td>{row.winPct == null ? "—" : (Number(row.winPct) * 100).toFixed(1) + "%"}</td>
                      <td>{row.played ?? "—"}</td><td>{row.win ?? "—"}</td><td>{row.loss ?? "—"}</td><td>{row.gamesBehind ?? "—"}</td>
                    </>
                  ) : (
                    <>
                      <td>{row.points ?? "—"}</td><td>{row.played ?? "—"}</td><td>{row.win ?? "—"}</td><td>{row.draw ?? "—"}</td><td>{row.loss ?? "—"}</td><td>{row.goalsFor ?? "—"}</td><td>{row.goalsAgainst ?? "—"}</td><td>{row.goalDiff ?? "—"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyMessage>{standingsState.error || "현재 제공되는 순위 데이터가 없습니다."}</EmptyMessage>
      )}
    </section>
  );
}

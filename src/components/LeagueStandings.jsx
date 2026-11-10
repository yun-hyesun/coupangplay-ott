import { EmptyMessage } from "./LeagueDetailShared";
import { selectLeagueStandings } from "../data/leagueStandingsView";

export function LeagueStandings({ league, standingsState, tableRows, tableNote, tableColumns, isBasketball, fullPage = false, onShowAll }) {
  const limit = 20;
  const visibleRows = selectLeagueStandings(tableRows, limit, { allowUnranked: !fullPage });
  return (
    <section className={"league-detail__section league-detail__standings" + (fullPage ? " league-detail__standings--page" : "")} aria-label={fullPage ? `${league.name} 순위` : undefined} aria-labelledby={fullPage ? undefined : "league-detail-standings-title"} aria-busy={standingsState.loading}>
      {!fullPage && <div className="league-detail__section-heading">
        <h2 id="league-detail-standings-title">리그 순위</h2>
        {onShowAll && <button type="button" className="league-detail__standings-more" onClick={onShowAll}>전체보기 <span aria-hidden="true">›</span></button>}
      </div>}
      {tableNote && <p className="league-detail__table-note">{tableNote}</p>}
      {standingsState.loading ? (
        <EmptyMessage>순위 정보를 불러오는 중입니다.</EmptyMessage>
      ) : visibleRows.length ? (
        <div className="league-detail__table-wrap">
          <table aria-label={`${league.name} 리그 순위 상위 ${visibleRows.length}팀`}>
            <thead><tr>{tableColumns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {visibleRows.map((row, index) => (
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

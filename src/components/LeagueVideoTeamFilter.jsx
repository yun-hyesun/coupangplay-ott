import { TeamImage } from "./LeagueDetailShared";
import { useHorizontalDragScroll } from "../hooks/useHorizontalDragScroll";

const ASSETS = "/images/sports/league-detail/videos/";

export function LeagueVideoTeamFilter({ league, teams, selectedTeamId, subscribedTeamIds = [], onSelectTeam }) {
  const { scrollRef, isDragging, onPointerDown, onClickCapture, onDragStart } = useHorizontalDragScroll();
  return (
    <div className={"league-video-feed__teams" + (isDragging ? " is-dragging" : "")}
      ref={scrollRef} tabIndex={0} role="group" aria-label={`${league.name} 영상 팀 선택`}
      onPointerDown={onPointerDown} onClickCapture={onClickCapture} onDragStart={onDragStart}>
      <button type="button" className="league-video-feed__team-card league-video-feed__team-card--all"
        aria-label="팀 전체 영상 조회" aria-pressed={!selectedTeamId} onClick={() => onSelectTeam("")}>
        <span className="league-video-feed__team-picture">
          {league.id === "PL" ? <span className="league-video-feed__all-pl" aria-hidden="true">
            <img src={ASSETS + "team-all-pl-inner.svg"} alt="" />
            <img className="league-video-feed__all-pl-white" src={ASSETS + "team-all-pl-white.png"} alt="" />
          </span> : <img className="league-video-feed__all-logo" src={league.whiteLogoPath || league.logoPath} alt="" />}
        </span>
        <span className="league-video-feed__team-name">팀 전체</span>
      </button>
      {teams.map(team => (
        <button key={team.id} type="button" className="league-video-feed__team-card" title={team.name}
          aria-label={`${team.name} 영상 조회${subscribedTeamIds.includes(team.id) ? ", 찜한 팀" : ""}`} aria-pressed={selectedTeamId === team.id} onClick={() => onSelectTeam(team.id)}>
          <span className="league-video-feed__team-picture">
            <TeamImage team={team} leagueId={league.id} className="league-video-feed__team-logo" />
            {subscribedTeamIds.includes(team.id) && <img className="league-video-feed__team-check" src={ASSETS + "team-selected.svg"} alt="" />}
          </span>
          <span className="league-video-feed__team-name">{team.name}</span>
        </button>
      ))}
    </div>
  );
}

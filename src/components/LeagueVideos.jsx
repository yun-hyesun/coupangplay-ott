import { Link } from "react-router-dom";
import { EmptyMessage, VideoCard } from "./LeagueDetailShared";

export function LeagueVideos({ league, allLeagueVideos, videoGroups, selectedTeams }) {
  return (
    <>
      <section className="league-detail__section league-detail__popular" aria-labelledby="league-detail-popular-title">
        <div className="league-detail__section-heading">
          <h2 id="league-detail-popular-title">인기 동영상 TOP 10</h2>
        </div>
        {allLeagueVideos.length ? (
          <div className="league-detail__popular-grid">
            {allLeagueVideos.slice(0, 10).map((video, index) => <VideoCard key={video.title + index} video={video} rank={index + 1} />)}
          </div>
        ) : (
          <EmptyMessage>{league.name} 관련 동영상이 아직 등록되지 않았습니다.</EmptyMessage>
        )}
      </section>

      <section className="league-detail__section league-detail__my-team" aria-labelledby="league-detail-my-team-title">
        <div className="league-detail__section-heading">
          <h2 id="league-detail-my-team-title">마이팀 인기영상</h2>
          <Link to="/sports#sports-leagues-title">마이 팀 설정 <span aria-hidden="true">→</span></Link>
        </div>
        {videoGroups.length ? (
          <div className="league-detail__team-video-groups">
            {videoGroups.map(({ team, videos }) => (
              <div className="league-detail__team-video-group" key={team.id}>
                <div className="league-detail__team-heading">
                  {team.logoPath && <img src={team.logoPath} alt="" />}
                  <h3>{team.name}</h3>
                </div>
                <div className="league-detail__team-video-grid">
                  {videos.map((video, index) => <VideoCard key={video.title + index} video={video} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage>{selectedTeams.length ? "선택한 팀의 인기 영상이 아직 없습니다." : "마이 팀을 설정하면 응원하는 팀의 영상을 모아볼 수 있습니다."}</EmptyMessage>
        )}
      </section>
    </>
  );
}

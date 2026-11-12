import { useEffect, useState } from "react";
import { EmptyMessage, TeamImage, VideoCard } from "./LeagueDetailShared";
import { getMyTeamPopularVideos } from "../service/myTeamPopularVideosService";

export function LeagueMyTeamVideos({ league, selectedTeams, onOpenTeamSettings }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${league.id}:${selectedTeams.map(team => team.id).sort().join(",")}:${attempt}`;
  const loading = selectedTeams.length > 0 && result?.key !== key;
  const state = result?.key === key ? result : { groups: [], error: "" };
  useEffect(() => {
    if (!selectedTeams.length) return;
    const controller = new AbortController();
    getMyTeamPopularVideos(league.id, selectedTeams.map(team => team.id), { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ ...data, key, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ groups: [], key, error: error.message });
    });
    return () => controller.abort();
  }, [league.id, selectedTeams, key]);
  return <section className="league-detail__section league-detail__my-team" aria-labelledby="league-detail-my-team-title">
    <div className="league-detail__section-heading">
      <h2 id="league-detail-my-team-title">마이팀 인기영상</h2>
    </div>
    {!selectedTeams.length ? <EmptyMessage>마이 팀을 설정하면 팀별 인기 동영상을 4개씩 볼 수 있습니다. <button type="button" className="league-detail__my-team-settings" onClick={onOpenTeamSettings}>마이 팀 설정</button></EmptyMessage>
      : loading ? <div className="league-detail__team-video-grid" role="status" aria-label="마이팀 인기영상을 불러오는 중입니다.">
        {[0, 1, 2, 3].map(index => <div key={index} className="league-detail__my-team-skeleton" />)}
      </div> : <>
        <div className="league-detail__team-video-groups">
          {state.groups.map(({ team, videos, notice, error }) => <div className="league-detail__team-video-group" key={team.id} aria-label={`${team.name} 인기영상`}>
            <div className="league-detail__team-heading"><TeamImage team={team} leagueId={league.id} /><h3>{team.name}</h3></div>
            {videos.length ? <div className="league-detail__team-video-grid">
              {videos.map(video => <VideoCard key={video.id} video={video} badge={video.kind === "replay" ? "다시보기" : video.kind === "highlight" ? "하이라이트" : "주요장면"} />)}
            </div> : !error && <EmptyMessage>확인된 {team.name} 인기영상이 없습니다.</EmptyMessage>}
            {(error || notice) && <p className="league-detail__my-team-notice" role={error ? "alert" : "status"}>{error || notice} <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></p>}
          </div>)}
        </div>
        {state.error && <p className="league-detail__my-team-notice" role="alert">{state.error} <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></p>}
      </>}
  </section>;
}

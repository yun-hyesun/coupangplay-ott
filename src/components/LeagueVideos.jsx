import { LeagueMyTeamVideos } from "./LeagueMyTeamVideos";
import { EmptyMessage, VideoCard } from "./LeagueDetailShared";
import { LEAGUE_POPULAR_VIDEOS, LEAGUE_POPULAR_VIDEO_SOURCES } from "../data/leaguePopularVideos";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export function LeagueVideos({ league, allLeagueVideos, selectedTeams, onOpenTeamSettings }) {
  const rankedVideos = LEAGUE_POPULAR_VIDEOS[league.id];
  const popularVideos = (rankedVideos ? [...rankedVideos].sort((first, second) => second.viewCount - first.viewCount) : allLeagueVideos).slice(0, 10);
  const source = LEAGUE_POPULAR_VIDEO_SOURCES[league.id];
  const sourceDescription = source ? `쿠팡플레이 스포츠 공식 채널 · ${league.name} 일반 동영상 조회수 순 · ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(source.checkedAt))} 확인` : undefined;
  return (
    <>
      <section className="league-detail__section league-detail__popular" aria-labelledby="league-detail-popular-title" aria-description={sourceDescription}>
        <div className="league-detail__section-heading">
          <h2 id="league-detail-popular-title" title={sourceDescription}>인기 동영상 TOP 10</h2>
        </div>
        {popularVideos.length ? (
          <Swiper
            key={league.id}
            className="league-detail__popular-carousel"
            role="region"
            aria-label="인기 동영상 TOP 10 목록"
            modules={[Navigation, A11y]}
            navigation
            slidesPerView="auto"
            spaceBetween={24}
            watchOverflow
            a11y={{ prevSlideMessage: "이전 인기 동영상", nextSlideMessage: "다음 인기 동영상" }}
          >
            {popularVideos.map((video, index) => (
              <SwiperSlide key={video.title + index} className={index === 9 ? "league-detail__popular-slide--double" : ""}>
                <VideoCard video={video} rank={index + 1} />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <EmptyMessage>{league.name} 관련 동영상이 아직 등록되지 않았습니다.</EmptyMessage>
        )}
      </section>

      {selectedTeams.length > 0 && <LeagueMyTeamVideos league={league} selectedTeams={selectedTeams} onOpenTeamSettings={onOpenTeamSettings} />}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Navigation } from "swiper/modules";
import { getScheduleUnitLabel } from "../data/leagueScheduleUnits";
import { selectMatchVideos } from "../data/matchRelatedVideos";
import { getMatchVideoPage } from "../service/matchRelatedVideosService";
import { VideoCard } from "./LeagueDetailShared";
import "swiper/css";
import "swiper/css/navigation";
import "./scss/MatchRelatedVideos.scss";

export function MatchRelatedVideos({ game, id, initialVideos = [] }) {
  const { competitionCode, matchday, scheduleSegment, raceName } = game;
  const homeName = game.home?.name;
  const awayName = game.away?.name;
  const kickoff = game.utcDate || game.startTime;
  const match = useMemo(() => ({
    competitionCode, matchday, scheduleSegment, raceName, utcDate: kickoff,
    home: { name: homeName }, away: { name: awayName },
  }), [competitionCode, matchday, scheduleSegment, raceName, kickoff, homeName, awayName]);
  const [request, setRequest] = useState({ cursor: null, attempt: 0 });
  const [result, setResult] = useState({ videos: initialVideos, loading: true, error: "", nextCursor: null, incomplete: false });

  useEffect(() => {
    const controller = new AbortController();
    getMatchVideoPage(match, { signal: controller.signal, cursor: request.cursor }).then(page => {
      if (!controller.signal.aborted) setResult(previous => ({
        ...page, videos: selectMatchVideos(match, [...previous.videos, ...page.videos]), loading: false, error: "",
      }));
    }).catch(error => {
      if (!controller.signal.aborted) setResult(previous => ({ ...previous, loading: false, error: error.message || "관련 영상을 불러오지 못했습니다." }));
    });
    return () => controller.abort();
  }, [match, request]);

  const load = cursor => {
    setResult(previous => ({ ...previous, loading: true, error: "" }));
    setRequest(previous => ({ cursor, attempt: previous.attempt + 1 }));
  };
  const meta = [game.competitionName, getScheduleUnitLabel(game)].filter(Boolean).join(" · ");
  return (
    <section id={id} className="sports-match-videos" aria-labelledby={`${id}-heading`} aria-busy={result.loading}>
      <h3 id={`${id}-heading`}>관련 영상</h3>
      {result.videos.length > 0 && <Swiper
        className="sports-match-videos__carousel" modules={[Navigation, A11y]} navigation watchOverflow
        slidesPerView={1.15} spaceBetween={16}
        breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 24 }, 960: { slidesPerView: 3, spaceBetween: 24 }, 1280: { slidesPerView: 4, spaceBetween: 24 } }}
        a11y={{ prevSlideMessage: "이전 관련 영상", nextSlideMessage: "다음 관련 영상", slideLabelMessage: "관련 영상 {{index}} / {{slidesLength}}" }}
      >
        {result.videos.map(video => <SwiperSlide key={video.id}>
          <VideoCard video={{ ...video, meta }} variant="fixture" />
        </SwiperSlide>)}
      </Swiper>}
      {result.loading && result.videos.length === 0 && <div className="sports-match-videos__loading" role="status">
        <span className="sports-match-videos__sr-only">쿠팡플레이 스포츠 관련 영상을 불러오는 중입니다.</span>
        {Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden="true" />)}
      </div>}
      {!result.loading && !result.error && !result.incomplete && !result.nextCursor && result.videos.length === 0 && (
        <p className="sports-match-videos__message" role="status">공식 채널에서 이 경기와 일치하는 영상을 찾지 못했습니다. 영상이 올라오면 확인할 수 있습니다.</p>
      )}
      {result.error && <div className="sports-match-videos__message" role="alert">
        <p>관련 영상을 불러오지 못했습니다. {result.error}</p>
        <button type="button" onClick={() => load(request.cursor)}>다시 시도</button>
      </div>}
      {!result.error && (result.nextCursor || result.loading && result.videos.length > 0) && <div className="sports-match-videos__more">
        {result.incomplete && <p role="status">일부 영상을 확인하지 못했습니다. 다시 조회해 주세요.</p>}
        <button type="button" disabled={result.loading} onClick={() => load(result.nextCursor)}>
          {result.loading ? "영상을 불러오는 중…" : result.incomplete ? "다시 조회" : "관련 영상 더 보기"}
        </button>
      </div>}
    </section>
  );
}

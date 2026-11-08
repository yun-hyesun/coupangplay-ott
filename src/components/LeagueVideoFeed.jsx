import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Navigation } from "swiper/modules";
import { SPORTS_TEAMS_BY_LEAGUE } from "../data/sportsTeams";
import { formatVideoDate, formatVideoMonth, getCurrentVideoMonth, groupLeagueVideos, shiftVideoMonth } from "../data/leagueVideoGroups";
import { getMatchesForRange } from "../service/sportsService";
import { getLeagueVideoPage } from "../service/leagueVideosService";
import { getLeagueRoundOptions } from "../service/leagueScheduleUnitsService";
import { resolveScheduleUnitState } from "../data/leagueScheduleUnits";
import { EmptyMessage, TeamImage, VideoCard } from "./LeagueDetailShared";
import { LeagueVideoTeamFilter } from "./LeagueVideoTeamFilter";
import "swiper/css";
import "swiper/css/navigation";
import "./scss/LeagueVideoFeed.scss";

const ASSETS = "/images/sports/league-detail/videos/";
const EMPTY_RESULT = { videos: [], nextPageToken: "", error: "", loadingMore: false };
const EMPTY_FIXTURES = [];

export function LeagueVideoFeed({ league, scoresOn }) {
  const [mode, setMode] = useState("date");
  const [month, setMonth] = useState(getCurrentVideoMonth);
  const [teamId, setTeamId] = useState("");
  const [round, setRound] = useState("");
  const [roundResult, setRoundResult] = useState(null);
  const [roundAttempt, setRoundAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [fixtureResult, setFixtureResult] = useState(null);
  const [currentFixtureResult, setCurrentFixtureResult] = useState(null);
  const moreController = useRef(null);
  const teams = SPORTS_TEAMS_BY_LEAGUE[league.id] || [];
  const selectedTeam = mode === "team" ? teams.find(team => team.id === teamId) : null;
  const fixtureKey = `${league.id}:${month}`;
  const fixtures = fixtureResult?.key === fixtureKey ? fixtureResult.games : EMPTY_FIXTURES;
  const currentMonth = getCurrentVideoMonth();
  const currentFixtures = currentFixtureResult?.leagueId === league.id && currentFixtureResult.month === currentMonth ? currentFixtureResult.games : EMPTY_FIXTURES;
  const roundState = resolveScheduleUnitState(roundResult?.leagueId === league.id ? roundResult : null, currentFixtures, currentFixtureResult?.month, currentMonth);
  const roundOptions = roundState?.options || [];
  const selectedRound = roundOptions.some(option => option.value === round) ? round : "";
  const queryMonth = mode === "date" ? month : "";
  const query = useMemo(() => ({ league: league.id, scope: mode === "team" ? "team" : "month", month: queryMonth, team: selectedTeam?.name || "" }), [league.id, mode, queryMonth, selectedTeam?.name]);
  const key = JSON.stringify(query) + ":" + selectedRound + ":" + attempt;
  const state = result?.key === key ? result : EMPTY_RESULT;
  const loading = result?.key !== key;
  const groups = useMemo(() => groupLeagueVideos({ leagueId: league.id, videos: state.videos, fixtures, teamId: selectedTeam?.id, round: selectedRound, month: queryMonth }), [league.id, state.videos, fixtures, selectedTeam?.id, selectedRound, queryMonth]);

  useEffect(() => {
    let active = true;
    const refresh = async ({ force = false } = {}) => {
      try {
        const value = await getLeagueRoundOptions(league.id, Date.now(), { force });
        if (active) setRoundResult({ ...value, leagueId: league.id, error: "" });
      } catch (error) {
        if (active) setRoundResult(previous => ({ ...(previous?.leagueId === league.id ? previous : { options: [] }), leagueId: league.id, error: error.message }));
      }
    };
    refresh({ force: roundAttempt > 0 });
    const refreshInBackground = () => refresh();
    const timer = window.setInterval(refreshInBackground, 60000);
    window.addEventListener("focus", refreshInBackground);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refreshInBackground); };
  }, [league.id, roundAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    getLeagueVideoPage(query, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ ...data, key, error: "", loadingMore: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ ...EMPTY_RESULT, key, error: error.message });
    });
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [query, key]);

  useEffect(() => {
    const controller = new AbortController();
    const end = shiftVideoMonth(month, 1) + "-01";
    const endDate = new Date(`${end}T00:00:00Z`);
    endDate.setUTCDate(0);
    const to = endDate.toISOString().slice(0, 10);
    // Match dates and scores are optional enrichment; YouTube results render independently.
    getMatchesForRange(league.id, month + "-01", to, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) {
        setFixtureResult({ key: fixtureKey, games: data.games });
        if (month === getCurrentVideoMonth()) setCurrentFixtureResult({ leagueId: league.id, month, games: data.games });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setFixtureResult({ key: fixtureKey, games: [] });
    });
    return () => controller.abort();
  }, [league.id, month, fixtureKey]);

  async function loadMore() {
    if (!state.nextPageToken || state.loadingMore || loading) return;
    const controller = new AbortController();
    moreController.current = controller;
    setResult(previous => ({ ...previous, loadingMore: true, error: "" }));
    try {
      const data = await getLeagueVideoPage({ ...query, pageToken: state.nextPageToken }, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(previous => ({ ...previous, ...data,
        videos: [...new Map([...previous.videos, ...data.videos].map(video => [video.id, video])).values()],
        classificationIncomplete: previous.classificationIncomplete || data.classificationIncomplete,
        notice: data.notice || previous.notice || "", loadingMore: false, error: "" }));
    } catch (error) {
      if (!controller.signal.aborted) setResult(previous => ({ ...previous, loadingMore: false, error: error.message }));
    }
  }

  function changeMonth(event) {
    if (event.target.validity.valid && event.target.value) setMonth(event.target.value);
  }

  return (
    <section className={"league-video-feed" + (mode === "team" ? " league-video-feed--team" : "")} aria-label={`${league.name} 동영상`}>
      <div className="league-video-feed__toolbar">
        <div className="league-video-feed__filter-row">
          <div className="league-video-feed__modes" role="group" aria-label="영상 조회 방식">
            <button type="button" aria-pressed={mode === "date"} onClick={() => setMode("date")}>날짜별</button>
            <button type="button" aria-pressed={mode === "team"} onClick={() => setMode("team")}>팀별</button>
          </div>
          <label className="league-video-feed__select league-video-feed__round">
            <span className="league-video-feed__sr-only">라운드 선택</span>
            <select value={selectedRound} onChange={event => setRound(event.target.value)} aria-label="라운드 선택" disabled={!roundState} aria-busy={!roundState} title={!roundState ? "경기 구분을 조회하는 중입니다." : roundState.error || (roundState.currentLabel ? `현재 ${roundState.currentLabel}까지 진행됐습니다.` : "API에서 확인된 경기 구분이 없습니다.")}>
              <option value="">전체라운드</option>
              {roundOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <img src={ASSETS + "select-down.svg"} alt="" />
          </label>
        </div>
        {(roundState?.error || roundState?.warning) && <p className="league-video-feed__round-error" role="status">{roundState.error || roundState.warning}
          {roundState.stale && roundState.checkedAt && <span> ({new Date(roundState.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 확인)</span>}
          {" "}<button type="button" onClick={() => setRoundAttempt(value => value + 1)}>다시 조회</button></p>}
        {roundState?.unavailable && !roundState.error && <p className="league-video-feed__round-error" role="status">현재 API에서 확인된 경기 구분이 없습니다.</p>}
        {mode === "team" ? <LeagueVideoTeamFilter league={league} teams={teams} selectedTeamId={selectedTeam?.id || ""} onSelectTeam={setTeamId} /> : <div className="league-video-feed__date-row">
          <div className="league-video-feed__month-controls">
            <button className="league-video-feed__month-arrow league-video-feed__month-arrow--prev" type="button" aria-label="이전 달" disabled={month <= "2010-01"} onClick={() => setMonth(value => shiftVideoMonth(value, -1))}>
              <span><img src={ASSETS + "month-prev.svg"} alt="" /></span>
            </button>
            <h2>{formatVideoMonth(month)}</h2>
            <label className="league-video-feed__calendar" title="조회할 월 선택">
              <img src={ASSETS + "calendar.svg"} alt="" />
              <input type="month" aria-label="조회할 월 선택" min="2010-01" max={currentMonth} value={month} onChange={changeMonth} onInput={changeMonth} />
            </label>
            <button className="league-video-feed__month-arrow" type="button" aria-label="다음 달" disabled={month >= currentMonth} onClick={() => setMonth(value => shiftVideoMonth(value, 1))}>
              <img src={ASSETS + "month-next.svg"} alt="" />
            </button>
          </div>
          <button className="league-video-feed__recent" type="button" onClick={() => { setMonth(currentMonth); setRound(""); }}>최근</button>
        </div>}
      </div>

      <div className="league-video-feed__results" aria-busy={loading || state.loadingMore}>
        {loading ? <div className="league-video-feed__loading" role="status">
          <span className="league-video-feed__sr-only">쿠팡플레이 스포츠 영상을 불러오는 중입니다.</span>
          <div className="league-video-feed__skeleton-heading" />
          <div className="league-video-feed__skeletons">{Array.from({ length: 5 }, (_, index) => <div key={index} />)}</div>
        </div> : <>
          {groups.map(group => (
            <article className="league-video-feed__match" key={group.key}>
              <div className="league-video-feed__match-heading">
                <p><time dateTime={group.dateKey}>{formatVideoDate(group.dateKey)}</time>{!group.isMatchDate && <span> · 업로드</span>}</p>
                <h3>
                  {group.home ? <><TeamImage team={group.home} leagueId={league.id} /><span>{group.home.name}</span></> : <span>{league.name}</span>}
                  {group.away && <><b>{scoresOn && group.homeScore != null && group.awayScore != null ? `${group.homeScore} : ${group.awayScore}` : "VS"}</b><span>{group.away.name}</span><TeamImage team={group.away} leagueId={league.id} /></>}
                </h3>
              </div>
              <Swiper className="league-video-feed__carousel" modules={[Navigation, A11y]} navigation watchOverflow slidesPerView={1} spaceBetween={24}
                breakpoints={{ 480: { slidesPerView: 2 }, 850: { slidesPerView: 3 }, 1200: { slidesPerView: 4 }, 1600: { slidesPerView: 5 } }}
                a11y={{ prevSlideMessage: "이전 경기 영상", nextSlideMessage: "다음 경기 영상" }} aria-label={`${group.home?.name || league.name} ${group.away?.name || ""} 경기 영상`}>
                {group.videos.map(video => <SwiperSlide key={video.id}><VideoCard video={video} variant="feed" /></SwiperSlide>)}
              </Swiper>
            </article>
          ))}
          {!groups.length && !state.error && !state.notice && <EmptyMessage>선택한 날짜·팀·라운드에 해당하는 쿠팡플레이 스포츠 영상이 없습니다.</EmptyMessage>}
          {state.notice && <p className="league-video-feed__round-error" role="status">{state.notice} <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button></p>}
          {state.error && <div className="league-video-feed__error" role="alert"><p>{state.error}</p><button type="button" onClick={() => state.videos.length ? loadMore() : setAttempt(value => value + 1)}>다시 시도</button></div>}
          {state.nextPageToken && <button className="league-video-feed__more" type="button" onClick={loadMore} disabled={state.loadingMore}>{state.loadingMore ? "불러오는 중…" : "영상 더 보기"}</button>}
          <p className="league-video-feed__source"><a href="https://www.youtube.com/@CoupangPlaySports" target="_blank" rel="noopener noreferrer">쿠팡플레이 스포츠 공식 YouTube</a> · {selectedTeam?.name || league.name}</p>
        </>}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useMovieStore } from '../../store/useMovieStore';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './Watch.scss';

const EMPTY = [];
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const Watch = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const content = state?.content ?? {};
  const seasonNumber = state?.seasonNumber ?? 1;
  const episodeNumber = state?.episodeNumber || 1;
  const storedEpisodes = useMovieStore(s => s.episodes[`${id}-${seasonNumber}`] ?? EMPTY);
  const episodes = storedEpisodes.length ? storedEpisodes : (state?.episodes ?? []);
  const movieVideos = useMovieStore(s => s.popVideo[id] ?? EMPTY);
  const tvVideos = useMovieStore(s => s.tvVideo[id] ?? EMPTY);
  const episodeVideos = useMovieStore(s => s.episodeVideo[`${id}-${seasonNumber}-${episodeNumber}`] ?? EMPTY);
  const onFetchVideo = useMovieStore(s => s.onFetchVideo);
  const onFetchTvVideo = useMovieStore(s => s.onFetchTvVideo);
  const onFetchSeason = useMovieStore(s => s.onFetchSeason);
  const onFetchEpisode = useMovieStore(s => s.onFetchEpisode);
  const onFetchEpisodeVideo = useMovieStore(s => s.onFetchEpisodeVideo);
  useEffect(() => {
    if (!id) return;
    if (type === 'movie') onFetchVideo(id);
    if (type === 'tv') {
      onFetchTvVideo(id);
      onFetchSeason(id);
      onFetchEpisode(id, seasonNumber);
      onFetchEpisodeVideo(id, seasonNumber, episodeNumber);
    }
  }, [id, type, seasonNumber, episodeNumber, onFetchVideo, onFetchTvVideo, onFetchSeason, onFetchEpisode, onFetchEpisodeVideo]);
  const availableVideos = type === 'tv' ? [...episodeVideos, ...tvVideos] : movieVideos;
  const selectedVideo = availableVideos.find(v => v.site === 'YouTube' && v.key && v.type === 'Trailer') || availableVideos.find(v => v.site === 'YouTube' && v.key);
  const youtubeKey = selectedVideo?.key;
  // videoSrc는 사용 가능한 직접 재생 영상 파일(mp4/webm)의 URL입니다.
  // TMDB 유튜브 예고편 키는 HTML video src로 직접 사용할 수 없습니다.
  const videoSrc = state?.videoSrc ?? '';
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [panel, setPanel] = useState(null);
  const [settingsTab, setSettingsTab] = useState('main');
  const [speed, setSpeed] = useState(1);
  const title = content.title || content.name || '콘텐츠 제목';

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); } catch { setPlaying(false); }
    } else video.pause();
  };
  const seek = (seconds) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };
  const changeProgress = (e) => {
    const video = videoRef.current;
    if (video && duration) video.currentTime = Number(e.target.value);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.querySelector('.watch-page')?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <main className="watch-page">
      <div className="watch-player">
        {/* 영상 영역: 실제 파일 연결 전에는 빈 플레이어가 표시됩니다. */}
        {videoSrc ? (
          <video ref={videoRef} className="watch-player__video" src={videoSrc}
            playsInline muted={muted}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        ) : youtubeKey ? (
          <iframe className="watch-player__youtube" title={`${title} 관련 영상`} src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&playsinline=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : <div className="watch-player__placeholder">재생 가능한 예고편·클립이 없습니다.</div>}

        <header className="watch-player__header">
          <button className="watch-icon-button" type="button" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <h1>{title}{type === 'tv' ? ` · ${episodeNumber}화` : ''}</h1>
        </header>

        {videoSrc ? <div className="watch-player__bottom">
          <label className="watch-player__progress-label">
            <span className="sr-only">영상 재생 위치</span>
            <input className="watch-player__progress" type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
              onChange={changeProgress} disabled={!videoSrc || !duration}
              style={{ '--progress': `${duration ? currentTime / duration * 100 : 0}%` }} />
          </label>
          <div className="watch-controls">
            <div className="watch-controls__left">
              <button type="button" onClick={togglePlay} aria-label={playing ? '일시 정지' : '재생'}>{playing ? 'Ⅱ' : '▶'}</button>
              <button type="button" onClick={() => seek(-10)} aria-label="10초 뒤로">↶<small>10</small></button>
              <button type="button" onClick={() => seek(10)} aria-label="10초 앞으로">↷<small>10</small></button>
              <button type="button" onClick={() => setMuted(v => !v)} aria-label={muted ? '음소거 해제' : '음소거'}>{muted ? '🔇' : '◖))'}</button>
              <span className="watch-controls__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="watch-controls__right">
              <button type="button" aria-label="자막 설정" onClick={() => { setPanel('settings'); setSettingsTab('subtitles'); }}>CC</button>
              <button type="button" aria-label="회차 목록" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')}>☷</button>
              <button type="button" aria-label="와우 클립" onClick={() => setPanel(panel === 'clips' ? null : 'clips')}>▣</button>
              <button type="button" aria-label="설정" onClick={() => { setPanel(panel === 'settings' ? null : 'settings'); setSettingsTab('main'); }}>⚙</button>
              <button type="button" aria-label="리뷰 및 채팅" onClick={() => setPanel(panel === 'reviews' ? null : 'reviews')}>▤</button>
              <button type="button" aria-label="전체 화면" onClick={toggleFullscreen}>⛶</button>
            </div>
          </div>
        </div> : <div className="watch-player__quick-actions">
          <button type="button" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')}>회차 목록</button>
          <button type="button" onClick={() => setPanel(panel === 'reviews' ? null : 'reviews')}>리뷰 · 채팅</button>
        </div>}

        {panel && (
          <aside className="watch-panel" aria-label="플레이어 부가 패널">
            <div className="watch-panel__header"><h2>{({ episodes: '회차', settings: '설정', reviews: '리뷰 · 채팅', clips: '와우 클립' })[panel]}</h2><button type="button" onClick={() => setPanel(null)} aria-label="패널 닫기">✕</button></div>
            {panel === 'episodes' && <div className="watch-panel__body">
              {episodes.length === 0 ? <p>회차 정보는 시즌 API 연결 후 표시됩니다.</p> : episodes.map((ep, index) => (
                <button className="watch-episode" key={ep.id || index} type="button" onClick={() => navigate(`/watch/tv/${id}`, { state: { ...state, episodes, seasonNumber, episodeNumber: ep.episode_number || index + 1 } })}>
                  <span className="watch-episode__thumb">▶</span><span>{ep.episode_number || index + 1}화 · {ep.name || '에피소드'}</span>
                </button>
              ))}
            </div>}
            {panel === 'settings' && <div className="watch-panel__body watch-settings">
              {settingsTab !== 'main' && <button type="button" onClick={() => setSettingsTab('main')}>← 설정</button>}
              {settingsTab === 'main' && <>
                <button type="button" onClick={() => setSettingsTab('quality')}>해상도 <span>›</span></button>
                <button type="button" onClick={() => setSettingsTab('speed')}>재생 속도 <span>{speed}× ›</span></button>
                <button type="button" onClick={() => setSettingsTab('subtitles')}>자막 <span>›</span></button>
                <button type="button" onClick={() => setSettingsTab('audio')}>음성 <span>›</span></button>
              </>}
              {settingsTab === 'speed' && [0.5, 0.75, 1, 1.25, 1.5, 2].map(v => <button type="button" key={v} onClick={() => { setSpeed(v); if (videoRef.current) videoRef.current.playbackRate = v; }}>{v}× {speed === v ? '✓' : ''}</button>)}
              {settingsTab === 'quality' && <p>해상도 선택은 영상 소스가 지원할 때 연결합니다.</p>}
              {settingsTab === 'subtitles' && <p>자막 트랙 연결 후 선택할 수 있습니다.</p>}
              {settingsTab === 'audio' && <p>음성 트랙 연결 후 선택할 수 있습니다.</p>}
            </div>}
            {panel === 'reviews' && <div className="watch-panel__body"><p>실시간 채팅과 리뷰 목록 영역</p><div className="watch-review-compose"><input aria-label="리뷰 입력" placeholder="감상평을 입력하세요" /><button type="button">등록</button></div></div>}
            {panel === 'clips' && <div className="watch-panel__body"><p>와우 클립 목록 영역</p></div>}
          </aside>
        )}
      </div>
    </main>
  );
};

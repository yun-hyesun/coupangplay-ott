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
  const [volume, setVolume] = useState(70);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [quality, setQuality] = useState(1080);
  const [clipSort, setClipSort] = useState('recommended');
  const [togetherTab, setTogetherTab] = useState('clips');
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [panel, setPanel] = useState(null);
  const [settingsTab, setSettingsTab] = useState('main');
  const [speed, setSpeed] = useState(1);
  const updateVolume = (next) => {
    setVolume(next);
    setMuted(next === 0);
    if (videoRef.current) { videoRef.current.volume = next / 100; videoRef.current.muted = next === 0; }
  };
  const togglePanel = (next) => { setPanel(current => current === next ? null : next); };
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
            playsInline muted={muted} onLoadedData={(e) => { e.currentTarget.volume = volume / 100; e.currentTarget.playbackRate = speed; }}
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

        <div className="watch-player__bottom">
          {videoSrc && <label className="watch-player__progress-label">
            <span className="sr-only">영상 재생 위치</span>
            <input className="watch-player__progress" type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
              onChange={changeProgress} disabled={!duration}
              style={{ '--progress': `${duration ? currentTime / duration * 100 : 0}%` }} />
          </label>}
          <div className="watch-controls">
            <div className="watch-controls__left">
              <button type="button" onClick={togglePlay} disabled={!videoSrc} aria-label={playing ? '일시 정지' : '재생'}>{playing ? 'Ⅱ' : '▶'}</button>
              <button type="button" onClick={() => seek(-10)} disabled={!videoSrc} aria-label="10초 뒤로">↶<small>10</small></button>
              <button type="button" onClick={() => seek(10)} disabled={!videoSrc} aria-label="10초 앞으로">↷<small>10</small></button>
              <div className="watch-volume">
                <button type="button" onClick={() => setVolumeOpen(open => !open)} aria-expanded={volumeOpen} aria-label="볼륨 열기">{muted || volume === 0 ? '🔇' : '◖))'}</button>
                {volumeOpen && <div className="watch-volume__levels" aria-label="볼륨 선택">{[0, 35, 70, 100].map(v => <button key={v} className={volume === v ? 'is-active' : ''} type="button" onClick={() => updateVolume(v)} aria-label={`볼륨 ${v}%`}>{v}</button>)}</div>}
              </div>
              <span className="watch-controls__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="watch-controls__right">
              <button type="button" aria-label="회차 목록" aria-expanded={panel === 'episodes'} onClick={() => togglePanel('episodes')}>☷</button>
              <button type="button" aria-label="와우 클립" aria-expanded={panel === 'clips'} onClick={() => togglePanel('clips')}>▣</button>
              <button type="button" aria-label="설정" aria-expanded={panel === 'settings'} onClick={() => { togglePanel('settings'); setSettingsTab('main'); }}>⚙</button>
              <button type="button" aria-label="같이 보기" aria-expanded={panel === 'together'} onClick={() => { togglePanel('together'); }}>▤</button>
              <button type="button" aria-label="전체 화면" onClick={toggleFullscreen}>⛶</button>
            </div>
          </div>
        </div>

        {panel === 'settings' && <section className="watch-settings-popup" aria-label="영상 설정">
          <div className="watch-settings-popup__heading">
            {settingsTab !== 'main' && <button type="button" onClick={() => setSettingsTab('main')} aria-label="설정으로 돌아가기">←</button>}
            <span>{({ main: '설정', quality: '해상도', speed: '재생속도', subtitles: '자막', audio: '음성' })[settingsTab]}</span>
          </div>
          <div className="watch-settings-popup__items">
            {settingsTab === 'main' && <>
              <button type="button" onClick={() => setSettingsTab('quality')}>해상도 <span>{quality} ›</span></button>
              <button type="button" onClick={() => setSettingsTab('speed')}>재생속도 <span>{speed.toFixed(1)}배속 ›</span></button>
              <button type="button" onClick={() => setSettingsTab('subtitles')}>자막 <span>›</span></button>
              <button type="button" onClick={() => setSettingsTab('audio')}>음성 <span>›</span></button>
            </>}
            {settingsTab === 'quality' && [360, 480, 720, 1080].map(v => <button type="button" key={v} onClick={() => setQuality(v)}>{v}p <span>{quality === v ? '✓' : ''}</span></button>)}
            {settingsTab === 'speed' && [0.5, 1, 1.5, 2].map(v => <button type="button" key={v} onClick={() => { setSpeed(v); if (videoRef.current) videoRef.current.playbackRate = v; }}>{v.toFixed(1)}배속 <span>{speed === v ? '✓' : ''}</span></button>)}
            {settingsTab === 'subtitles' && <p>자막 트랙이 연결되면 선택할 수 있습니다.</p>}
            {settingsTab === 'audio' && <p>추가 음성 트랙이 연결되면 선택할 수 있습니다.</p>}
          </div>
        </section>}

        {panel && panel !== 'settings' && <aside className="watch-panel" aria-label="플레이어 우측 패널">
          <div className="watch-panel__header"><h2>{({ episodes: '회차', clips: '와우 클립', together: '같이 보기' })[panel]}</h2><button type="button" onClick={() => setPanel(null)} aria-label="패널 닫기">✕</button></div>
          {panel === 'episodes' && <div className="watch-panel__body">
            <p>시즌 {seasonNumber} · 회차 선택</p>
            {episodes.length === 0 ? <p>회차 정보가 없습니다.</p> : episodes.map((ep, index) => {
              const number = ep.episode_number || index + 1;
              return <button className={`watch-episode ${number === episodeNumber ? 'is-active' : ''}`} key={ep.id || index} type="button" onClick={() => navigate(`/watch/tv/${id}`, { state: { ...state, episodes, seasonNumber, episodeNumber: number } })}>
                <span className="watch-episode__thumb">{ep.still_path ? <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" /> : '▶'}</span>
                <span className="watch-episode__info"><strong>{number}회</strong><small>{number === episodeNumber ? '현재 재생 중' : '재생하기'}</small><span>{ep.overview || ep.name || '회차 정보'}</span></span>
              </button>;
            })}
          </div>}
          {panel === 'clips' && <div className="watch-panel__body">
            <p>시청자가 AI로 만든 공개 클립</p>
            <div className="watch-panel__tabs"><button type="button" className={clipSort === 'recommended' ? 'is-active' : ''} onClick={() => setClipSort('recommended')}>추천순</button><button type="button" className={clipSort === 'recent' ? 'is-active' : ''} onClick={() => setClipSort('recent')}>최신순</button></div>
            <p>연결된 공개 클립 데이터가 없습니다.</p>
            <button type="button" className="watch-panel__primary" disabled title="클립 제작 화면이 아직 연결되지 않았습니다">AI로 클립 만들기</button>
          </div>}
          {panel === 'together' && <div className="watch-panel__body">
            <div className="watch-panel__tabs"><button type="button" className={togetherTab === 'clips' ? 'is-active' : ''} onClick={() => setTogetherTab('clips')}>와우 클립</button><button type="button" className={togetherTab === 'chat' ? 'is-active' : ''} onClick={() => setTogetherTab('chat')}>실시간 채팅</button></div>
            {togetherTab === 'clips' ? <p>같이 보기 클립 데이터가 없습니다.</p> : <><p>함께 보고 있는 사람들과 이야기해요.</p><div className="watch-chat-messages" aria-live="polite">{chatMessages.map((msg, index) => <p key={index}><strong>나</strong> {msg}</p>)}</div><form className="watch-review-compose" onSubmit={e => { e.preventDefault(); if (chatText.trim()) { setChatMessages(items => [...items, chatText.trim()]); setChatText(''); } }}><input aria-label="채팅 입력" placeholder="메시지를 입력하세요" value={chatText} onChange={e => setChatText(e.target.value)} /><button type="submit">전송</button></form><small>프로토타입: 메시지는 이 화면에서만 표시됩니다.</small></>}
          </div>}
        </aside>}

      </div>
    </main>
  );
};

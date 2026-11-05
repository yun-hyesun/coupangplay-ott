import { useEffect, useRef, useState } from 'react';
import { useMovieStore } from '../../store/useMovieStore';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import WatchIcon from './WatchIcon';
import './Watch.scss';

const EMPTY = [];
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

// 실제 클립 API 연결 전에는 공개 클립을 허위로 생성하지 않습니다.
const PUBLIC_CLIPS = [];
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SETTINGS_OPTIONS = [
  { tab: 'quality', label: '해상도' },
  { tab: 'speed', label: '재생 속도' },
  { tab: 'subtitles', label: '자막' },
  { tab: 'audio', label: '음성' },
];
const SETTINGS_MESSAGES = {
  quality: '해상도 선택은 영상 소스가 지원할 때 연결합니다.',
  subtitles: '자막 트랙 연결 후 선택할 수 있습니다.',
  audio: '음성 트랙 연결 후 선택할 수 있습니다.',
};

export const Watch = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
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

  const openEpisode = (nextNumber, autoPlayNext = false) => {
    const episode = episodes.find(ep => Number(ep.episode_number) === Number(nextNumber));
    const nextVideoSrc = episode?.videoSrc || state?.videoSrcByEpisode?.[nextNumber] || '';
    navigate(`/watch/tv/${id}`, {
      state: {
        ...state, episodes, seasonNumber, episodeNumber: nextNumber,
        videoSrc: nextVideoSrc, autoPlayNext, showNextEpisodeNotice: autoPlayNext,
      },
    });
  };

  const goToNextEpisode = () => {
    if (type !== 'tv') return;

    const currentNumber = Number(episodeNumber);

    const next = episodes.find(
      ep => Number(ep.episode_number) === currentNumber + 1
    );

    if (!next) {
      console.log('마지막 회차입니다.');
      return;
    }

    const nextNumber = Number(next.episode_number);

    openEpisode(nextNumber, true);
  };

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
  const autoPlayAttemptedRef = useRef(false);
  const [nextEpisodeNotice, setNextEpisodeNotice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [clipSort, setClipSort] = useState('recommended');
  const [togetherMode, setTogetherMode] = useState(false);
  const [communityTab, setCommunityTab] = useState('clips');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [panel, setPanel] = useState(null);
  const [settingsTab, setSettingsTab] = useState('main');
  const [speed, setSpeed] = useState(1);

  // 같은 URL의 다음 회차로 이동해도 location.key 변경으로 알림을 갱신합니다.
  // 타이머는 페이지 전환/언마운트 시 정리해 이전 알림이 남지 않도록 합니다.
  useEffect(() => {
    if (!state?.showNextEpisodeNotice) {
      setNextEpisodeNotice(false);
      return;
    }
    setNextEpisodeNotice(true);
    const timer = window.setTimeout(() => setNextEpisodeNotice(false), 2500);
    return () => window.clearTimeout(timer);
  }, [location.key, state?.showNextEpisodeNotice]);

  // videoSrc가 변경되면 재생 시간/버튼 상태를 초기화합니다.
  // 자동 재생은 브라우저 정책에 따라 차단될 수 있으므로 실패를 처리합니다.
  useEffect(() => {
    autoPlayAttemptedRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
  }, [videoSrc, episodeNumber]);

  const handleVideoReady = async (event) => {
    if (!state?.autoPlayNext || autoPlayAttemptedRef.current) return;
    autoPlayAttemptedRef.current = true;
    try {
      await event.currentTarget.play();
    } catch {
      setPlaying(false);
    }
  };
  const setVideoVolume = (next) => { setVolume(next); setMuted(next === 0); if (videoRef.current) videoRef.current.volume = next / 100; };
  const title = content.title || content.name || '콘텐츠 제목';
  // 같이 보기 해제 시 실시간 채팅 화면을 닫고 와우 클립으로 돌아갑니다.
  const toggleTogetherMode = () => {
    setTogetherMode(prev => {
      if (prev) setCommunityTab('clips');
      return !prev;
    });
  };
  const toggleCommunityPanel = () => {
    if (panel === 'clips') { setPanel(null); return; }
    setCommunityTab('clips');
    setPanel('clips');
  };
  const sendChat = (event) => {
    event.preventDefault();
    if (!togetherMode || !chatDraft.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now(), text: chatDraft.trim() }]);
    setChatDraft('');
  };

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
          <video ref={videoRef} className="watch-player__video" src={videoSrc} key={`${id}-${seasonNumber}-${episodeNumber}-${videoSrc}`}
            playsInline muted={muted}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onCanPlay={handleVideoReady}
            onEnded={goToNextEpisode}
          />
        ) : youtubeKey ? (
          <YouTube
            key={`${youtubeKey}-${episodeNumber}`}
            videoId={youtubeKey}
            className="watch-player__youtube"
            iframeClassName="watch-player__youtube-frame"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                playsinline: 1,
              },
            }}
            onEnd={goToNextEpisode}
          />
        ) : <div className="watch-player__placeholder">재생 가능한 예고편·클립이 없습니다.</div>}

        {nextEpisodeNotice && (
          <div className="watch-next-episode-notice" role="status" aria-live="polite">
            <WatchIcon name="play" />
            <span>다음 회차로 넘어갑니다.</span>
          </div>
        )}

        <header className="watch-player__header">
          <button className="watch-icon-button" type="button" onClick={() => navigate(-1)} aria-label="뒤로 가기"><WatchIcon name="back" /></button>
          <h1>{title}{type === 'tv' ? ` · ${episodeNumber}화` : ''}</h1>
          <button className={`watch-together-toggle ${togetherMode ? 'is-active' : ''}`} type="button" onClick={toggleTogetherMode} aria-pressed={togetherMode}>
            <WatchIcon name="together" /> 같이 보기 {togetherMode ? 'ON' : ''}
          </button>
        </header>

        <div className="watch-player__bottom">
          <label className="watch-player__progress-label">
            <span className="sr-only">영상 재생 위치</span>
            <input className="watch-player__progress" type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
              onChange={changeProgress} disabled={!videoSrc || !duration}
              style={{ '--progress': `${duration ? currentTime / duration * 100 : 0}%` }} />
          </label>
          <div className="watch-controls">
            <div className="watch-controls__left">
              <button type="button" disabled={!videoSrc} onClick={togglePlay} aria-label={playing ? '일시 정지' : '재생'}><WatchIcon name={playing ? 'pause' : 'play'} /></button>
              <button type="button" disabled={!videoSrc} onClick={() => seek(-10)} aria-label="10초 뒤로"><WatchIcon name="replay" /></button>
              <button type="button" disabled={!videoSrc} onClick={() => seek(10)} aria-label="10초 앞으로"><WatchIcon name="forward" /></button>
              <div className="watch-volume"><button type="button" onClick={() => setVolumeOpen(open => !open)} aria-expanded={volumeOpen} aria-label="볼륨 조절"><WatchIcon name={muted || volume === 0 ? 'mute' : 'volume'} /></button>{volumeOpen && <div className="watch-volume__levels" aria-label="볼륨 조절"><input type="range" min="0" max="100" value={volume} onChange={e => setVideoVolume(Number(e.target.value))} aria-label="볼륨" style={{ '--volume-progress': `${volume}%` }} /><span>{volume}%</span></div>}</div>
              <span className="watch-controls__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="watch-controls__right">
              <button type="button" aria-label="자막 설정" onClick={() => { setPanel('settings'); setSettingsTab('subtitles'); }}><WatchIcon name="subtitles" /></button>
              <button type="button" aria-label="회차 목록" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')}><WatchIcon name="episodes" /></button>
              <button type="button" aria-label={togetherMode ? '와우 클립 및 실시간 채팅' : '와우 클립'} aria-expanded={panel === 'clips'} onClick={toggleCommunityPanel}><WatchIcon name="clips" /></button>
              <button type="button" aria-label="설정" onClick={() => { setPanel(panel === 'settings' ? null : 'settings'); setSettingsTab('main'); }}><WatchIcon name="settings" /></button>
              <button type="button" aria-label="전체 화면" onClick={toggleFullscreen}><WatchIcon name="fullscreen" /></button>
            </div>
          </div>
        </div>

        {panel && (
          <aside className="watch-panel" aria-label="플레이어 부가 패널">
            <div className="watch-panel__header"><div><h2>{({ episodes: '회차', settings: '설정', clips: togetherMode && communityTab === 'chat' ? '실시간 채팅' : '와우 클립' })[panel]}</h2>{panel === 'clips' && communityTab !== 'chat' && <p className="watch-panel__subtitle">시청자가 AI로 만든 공개 클립</p>}</div><button type="button" onClick={() => setPanel(null)} aria-label="패널 닫기"><WatchIcon name="close" /></button></div>
            {panel === 'episodes' && <div className="watch-panel__body">
              {episodes.length === 0 ? <p>회차 정보는 시즌 API 연결 후 표시됩니다.</p> : episodes.map((ep, index) => (
                <button className="watch-episode" key={ep.id || index} type="button" onClick={() => openEpisode(ep.episode_number || index + 1)}>
                  <span className="watch-episode__thumb">{ep.still_path ? <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" /> : <WatchIcon name="play" />}</span><span className="watch-episode__info"><strong>{ep.episode_number || index + 1}회</strong><em className={Number(ep.episode_number || index + 1) === Number(episodeNumber) ? 'is-playing' : ''}>{Number(ep.episode_number || index + 1) === Number(episodeNumber) ? '현재 재생 중' : '재생하기'}</em><small>{ep.overview || ep.name || '에피소드'}</small></span>
                </button>
              ))}
            </div>}
            {panel === 'settings' && <div className="watch-panel__body watch-settings">
              {settingsTab !== 'main' && <button type="button" onClick={() => setSettingsTab('main')}>← 설정</button>}
              {settingsTab === 'main' && <>
                {SETTINGS_OPTIONS.map(({ tab, label }) => (
                  <button type="button" key={tab} onClick={() => setSettingsTab(tab)}>{label} <span>{tab === 'speed' ? `${speed}× ›` : '›'}</span></button>
                ))}
              </>}
              {settingsTab === 'speed' && PLAYBACK_SPEEDS.map(v => <button type="button" key={v} onClick={() => { setSpeed(v); if (videoRef.current) videoRef.current.playbackRate = v; }}>{v}× {speed === v ? '✓' : ''}</button>)}
              {settingsTab === 'quality' && <p>{SETTINGS_MESSAGES.quality}</p>}
              {settingsTab === 'subtitles' && <p>{SETTINGS_MESSAGES.subtitles}</p>}
              {settingsTab === 'audio' && <p>{SETTINGS_MESSAGES.audio}</p>}
            </div>}
            {panel === 'clips' && <div className="watch-clips">
              {togetherMode && <div className="watch-community-tabs" role="tablist" aria-label="같이 보기 메뉴">
                <button role="tab" aria-selected={communityTab === 'clips'} className={communityTab === 'clips' ? 'is-active' : ''} onClick={() => setCommunityTab('clips')} type="button">와우 클립</button>
                <button role="tab" aria-selected={communityTab === 'chat'} className={communityTab === 'chat' ? 'is-active' : ''} onClick={() => setCommunityTab('chat')} type="button">실시간 채팅</button>
              </div>}
              {communityTab === 'chat' && togetherMode ? <div className="watch-chat" role="tabpanel">
                <p className="watch-chat__notice">같이 보기 모드 · 이 화면의 메시지는 현재 브라우저에서만 표시됩니다.</p>
                <div className="watch-chat__messages" aria-live="polite">
                  {chatMessages.length === 0 ? <p>아직 메시지가 없습니다.</p> : chatMessages.map(message => <div className="watch-chat__message" key={message.id}><strong>나</strong><span>{message.text}</span></div>)}
                </div>
                <form className="watch-chat__form" onSubmit={sendChat}>
                  <input value={chatDraft} onChange={event => setChatDraft(event.target.value)} maxLength={300} placeholder="메시지를 입력하세요" aria-label="실시간 채팅 메시지" />
                  <button type="submit" disabled={!chatDraft.trim()} aria-label="메시지 보내기">전송</button>
                </form>
              </div> : <>
                <div className="watch-clips__sort" aria-label="클립 정렬">
                  <button type="button" className={clipSort === 'recommended' ? 'is-active' : ''} onClick={() => setClipSort('recommended')}>추천순</button>
                  <button type="button" className={clipSort === 'recent' ? 'is-active' : ''} onClick={() => setClipSort('recent')}>최신순</button>
                </div>
                <div className="watch-clips__list">
                  {PUBLIC_CLIPS.length === 0 ? <p className="watch-clips__empty">등록된 공개 클립이 없습니다.</p> : [...PUBLIC_CLIPS].sort((a, b) => clipSort === 'recent' ? new Date(b.createdAt) - new Date(a.createdAt) : (b.score || 0) - (a.score || 0)).map(clip => (
                    <button className="watch-clip-card" type="button" key={clip.id} onClick={() => clip.startTime != null && videoRef.current && (videoRef.current.currentTime = clip.startTime)}>
                      <span className="watch-clip-card__thumbnail">{clip.thumbnail && <img src={clip.thumbnail} alt="" />}<WatchIcon name="play" /><small>{clip.durationLabel}</small></span>
                      <span className="watch-clip-card__info"><strong>{clip.title}</strong><span>{clip.contentTitle}</span><span>{clip.author}</span><em>AI 클립 · 공개 · 조회 {clip.views ?? 0}</em></span>
                    </button>
                  ))}
                </div>
                <button className="watch-clips__create" type="button" disabled title="AI 클립 생성 기능은 별도 서비스 연동이 필요합니다">AI로 클립 만들기</button>
              </>}
            </div>}
          </aside>
        )}
      </div>
    </main>
  );
};

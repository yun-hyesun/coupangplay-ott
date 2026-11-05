import { useEffect, useRef, useState } from 'react';
import { useMovieStore } from '../../store/useMovieStore';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import WatchIcon from './WatchIcon';
import { FullVideoClipButton } from '../wowclip/FullVideoClipButton';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import './Watch.scss';
import { auth } from '../../firebase/firebase';
import { createWatchSession, joinWatchSession } from '../../service/sessionService';
import { subscribeSessionMessages, sendSessionMessage } from '../../service/chatService';
import { communityError } from '../../data/communityData';

const EMPTY = [];
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

// 실제 클립 API 연결 전에는 공개 클립을 허위로 생성하지 않습니다.
const PUBLIC_CLIPS = [];
const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];
const SETTINGS_OPTIONS = [
  { tab: 'quality', label: '해상도' },
  { tab: 'speed', label: '재생속도' },
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
  const uid = useAuthStore((value) => value.user?.uid);
  const profileId = useProfileStore((value) => value.currentProfile?.id);
  const ownerKey = uid && profileId ? `${uid}_${profileId}` : null;
  const state = !location.state?.ownerKey || location.state.ownerKey === ownerKey
    ? location.state
    : null;
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
  const onSaveHistory = useWatchHistoryStore(
    (state) => state.onSaveHistory
  );

  const openEpisode = (nextNumber, autoPlayNext = false) => {
    const episode = episodes.find(ep => Number(ep.episode_number) === Number(nextNumber));
    const nextVideoSrc = episode?.videoSrc || state?.videoSrcByEpisode?.[nextNumber] || '';
    navigate(`/watch/tv/${id}`, {
      state: {
        ...state, episodes, seasonNumber, episodeNumber: nextNumber,
        videoSrc: nextVideoSrc, resumeAt: 0, youtubeKey: '', autoPlayNext, showNextEpisodeNotice: autoPlayNext,
      },
    });
  };

  const goToNextEpisode = () => {
    if (type !== 'tv') return;

    const next = episodes.find(ep => Number(ep.episode_number) === Number(episodeNumber) + 1);
    if (!next) {
      console.log('마지막 회차입니다.');
      return;
    }
    openEpisode(Number(next.episode_number), true);
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
  const youtubeKey = state?.youtubeKey || selectedVideo?.key;
  // videoSrc는 사용 가능한 직접 재생 영상 파일(mp4/webm)의 URL입니다.
  // TMDB 유튜브 예고편 키는 HTML video src로 직접 사용할 수 없습니다.
  const videoSrc = state?.videoSrc ?? '';
  const videoRef = useRef(null);
  const lastSaved = useRef({ route: '', at: 0 });
  const youtubePlayer = useRef(null);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
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
  const [sessionId, setSessionId] = useState(null);
  const [chatError, setChatError] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [panel, setPanel] = useState(null);
  const [settingsTab, setSettingsTab] = useState('main');
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('1080');
  const [subtitle, setSubtitle] = useState('한국어');
  const [audio, setAudio] = useState('한국어');

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
  const setVideoVolume = (next) => {
    setVolume(next); setMuted(next === 0);
    if (videoRef.current) videoRef.current.volume = next / 100;
    else if (youtubePlayer.current) {
      youtubePlayer.current.setVolume(next);
      if (next === 0) youtubePlayer.current.mute();
      else youtubePlayer.current.unMute();
    }
  };
  const title = content.title || content.name || '콘텐츠 제목';
  // 같이 보기 해제 시 실시간 채팅 화면을 닫고 와우 클립으로 돌아갑니다.
  // URL의 ?session=... 을 공유하면 같은 시청 세션에 참여할 수 있습니다.
  useEffect(() => {
    if (!togetherMode || !sessionId) return;
    setChatMessages([]);
    return subscribeSessionMessages(sessionId, setChatMessages, err => setChatError(communityError(err)));
  }, [togetherMode, sessionId]);
  const toggleTogetherMode = async () => {
    if (togetherMode) {
      setTogetherMode(false);
      setCommunityTab('clips');
      setSessionId(null);
      return;
    }
    if (!auth.currentUser) { setChatError('같이 보기를 사용하려면 로그인해 주세요.'); setPanel('clips'); return; }
    try {
      setChatError('');
      const existing = new URLSearchParams(location.search).get('session');
      const args = { type, contentId: id, season: seasonNumber, episode: episodeNumber };
      const nextId = existing ? await joinWatchSession(existing, args) : await createWatchSession(args);
      setSessionId(nextId);
      setTogetherMode(true);
    } catch (err) { setChatError(communityError(err)); setPanel('clips'); }
  };
  const toggleCommunityPanel = () => {
    if (panel === 'clips') { setPanel(null); return; }
    setCommunityTab('clips');
    setPanel('clips');
  };
  const sendChat = async (event) => {
    event.preventDefault();
    if (!togetherMode || !sessionId || !chatDraft.trim() || sendingChat) return;
    setSendingChat(true);
    try { setChatError(''); await sendSessionMessage(sessionId, chatDraft); setChatDraft(''); }
    catch (err) { setChatError(communityError(err)); }
    finally { setSendingChat(false); }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      const player = youtubePlayer.current;
      if (player) { if (youtubePlaying) player.pauseVideo(); else player.playVideo(); }
      return;
    }
    if (video.paused) {
      try { await video.play(); } catch { setPlaying(false); }
    } else video.pause();
  };
  const seek = (seconds) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    else if (youtubePlayer.current) {
      const player = youtubePlayer.current;
      const next = Math.max(0, Math.min(player.getDuration(), player.getCurrentTime() + seconds));
      player.seekTo(next, true); setCurrentTime(next);
    }
  };
  const changeProgress = (e) => {
    const video = videoRef.current;
    if (video && duration) video.currentTime = Number(e.target.value);
    else if (youtubePlayer.current && duration) { youtubePlayer.current.seekTo(Number(e.target.value), true); setCurrentTime(Number(e.target.value)); }
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.querySelector('.watch-page')?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const savePlayback = (position, total, completed = false, periodic = false) => {
    if (!ownerKey || !id || !['movie', 'tv'].includes(type)) return;
    if (!Number.isFinite(position) || !Number.isFinite(total) || total <= 0) return;

    const now = Date.now();
    if (periodic && lastSaved.current.route === location.key && now - lastSaved.current.at < 10000) return;
    lastSaved.current = { route: location.key, at: now };

    return onSaveHistory({
      id, title, media_type: type, seasonNumber, episodeNumber,
      backdrop_path: content.backdrop_path || '',
      poster_path: content.poster_path || '',
      position: Math.floor(position),
      progress: completed ? 100 : Math.min(100, Math.round(position / total * 100)),
      completed,
      videoSrc,
      youtubeKey: videoSrc ? '' : youtubeKey,
      info: type === 'tv' ? `시즌 ${seasonNumber} ${episodeNumber}화` : '영화',
    }, ownerKey);
  };

  useEffect(() => {
    if (!youtubePlaying || !youtubeKey || videoSrc) return;

    const timer = window.setInterval(() => {
      const player = youtubePlayer.current;
      if (player) {
        setCurrentTime(player.getCurrentTime()); setDuration(player.getDuration());
        savePlayback(player.getCurrentTime(), player.getDuration(), false, true);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  });

  const goBack = async () => {
    const video = videoRef.current;
    const player = youtubePlayer.current;
    if (video && !video.ended) await savePlayback(video.currentTime, video.duration);
    if (!video && youtubePlaying && player) {
      await savePlayback(player.getCurrentTime(), player.getDuration());
    }
    navigate(-1);
  };

  return (
    <main className="watch-page">
      <div className="watch-player">
        {/* 영상 영역: 실제 파일 연결 전에는 빈 플레이어가 표시됩니다. */}
        {videoSrc ? (
          <video ref={videoRef} className="watch-player__video" src={videoSrc} key={`${id}-${seasonNumber}-${episodeNumber}-${videoSrc}`}
            playsInline muted={muted}
            onPlay={() => setPlaying(true)}
            onPause={(event) => {
              setPlaying(false);
              if (!event.currentTarget.ended) {
                savePlayback(event.currentTarget.currentTime, event.currentTarget.duration);
              }
            }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setCurrentTime(video.currentTime);
              if (!video.paused) savePlayback(video.currentTime, video.duration, false, true);
            }}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              setDuration(video.duration);
              if (state?.resumeAt > 0 && state.resumeAt < video.duration) {
                video.currentTime = state.resumeAt;
              }
            }}
            onCanPlay={handleVideoReady}
            onEnded={(event) => {
              savePlayback(event.currentTarget.duration, event.currentTarget.duration, true);
              goToNextEpisode();
            }}
          />
        ) : youtubeKey ? (
          <YouTube
            key={`${youtubeKey}-${episodeNumber}`}
            videoId={youtubeKey}
            className="watch-player__youtube"
            iframeClassName="watch-player__youtube-frame"
            onReady={({ target }) => {
              youtubePlayer.current = target;
              setDuration(target.getDuration()); setCurrentTime(target.getCurrentTime());
              target.setVolume(volume);
              if (muted) target.mute();
            }}
            onPlay={(event) => {
              youtubePlayer.current = event.target;
              setYoutubePlaying(true);
              setPlaying(true);
            }}
            onPause={(event) => {
              setYoutubePlaying(false);
              setPlaying(false);
              savePlayback(event.target.getCurrentTime(), event.target.getDuration());
            }}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 0,
                start: Math.max(0, Math.floor(state?.resumeAt || 0)),
                playsinline: 1,
              },
            }}
            onEnd={(event) => {
              setYoutubePlaying(false);
              setPlaying(false);
              const total = event.target.getDuration();
              savePlayback(total, total, true);
              goToNextEpisode();
            }}
          />
        ) : <div className="watch-player__placeholder">재생 가능한 예고편·클립이 없습니다.</div>}

        {nextEpisodeNotice && (
          <div className="watch-next-episode-notice" role="status" aria-live="polite">
            <WatchIcon name="play" />
            <span>다음 회차로 넘어갑니다.</span>
          </div>
        )}

        <header className="watch-player__header">
          <button className="watch-icon-button" type="button" onClick={goBack} aria-label="뒤로 가기"><WatchIcon name="back" /></button>
          <h1>{title}{type === 'tv' ? ` · ${episodeNumber}화` : ''}</h1>
          <button className={`watch-together-toggle ${togetherMode ? 'is-active' : ''}`} type="button" onClick={toggleTogetherMode} aria-pressed={togetherMode}>
            <WatchIcon name="together" /> 같이 보기 {togetherMode ? 'ON' : ''}
          </button>
        </header>

        <div className="watch-player__bottom">
          <label className="watch-player__progress-label">
            <span className="sr-only">영상 재생 위치</span>
            <input className="watch-player__progress" type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
              onChange={changeProgress} disabled={(!videoSrc && !youtubeKey) || !duration}
              style={{ '--progress': `${duration ? currentTime / duration * 100 : 0}%` }} />
          </label>
          <div className="watch-controls">
            <div className="watch-controls__left">
              <button type="button" disabled={!videoSrc && !youtubeKey} onClick={togglePlay} aria-label={playing ? '일시 정지' : '재생'}><WatchIcon name={playing ? 'pause' : 'play'} /></button>
              <button type="button" disabled={!videoSrc && !youtubeKey} onClick={() => seek(-10)} aria-label="10초 뒤로"><WatchIcon name="replay" /></button>
              <button type="button" disabled={!videoSrc && !youtubeKey} onClick={() => seek(10)} aria-label="10초 앞으로"><WatchIcon name="forward" /></button>
              <div className="watch-volume"><button type="button" onClick={() => setVolumeOpen(open => !open)} aria-expanded={volumeOpen} aria-label="볼륨 조절"><WatchIcon name={muted || volume === 0 ? 'mute' : 'volume'} /></button>{volumeOpen && <div className="watch-volume__levels" aria-label="볼륨 조절"><input type="range" min="0" max="100" value={volume} onChange={e => setVideoVolume(Number(e.target.value))} aria-label="볼륨" style={{ '--volume-progress': `${volume}%` }} /><span>{volume}%</span></div>}</div>
              <span className="watch-controls__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="watch-controls__right">
              <FullVideoClipButton disabled={!youtubeKey || !!videoSrc} getSource={() => {
                const player = youtubePlayer.current;
                const source = { content: { ...content, id, media_type: type }, videoKey: youtubeKey, videoTitle: selectedVideo?.name || title, currentTime: player?.getCurrentTime() || 0, duration: player?.getDuration() || 0 };
                player?.pauseVideo();
                return source;
              }} />
              <button type="button" aria-label="회차 목록" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')}><WatchIcon name="episodes" /></button>
              <button type="button" aria-label={togetherMode ? '와우 클립 및 실시간 채팅' : '와우 클립'} aria-expanded={panel === 'clips'} onClick={toggleCommunityPanel}><WatchIcon name="clips" /></button>
              <button type="button" aria-label="설정" onClick={() => { setPanel(panel === 'settings' ? null : 'settings'); setSettingsTab('main'); }}><WatchIcon name="settings" /></button>
              <button type="button" aria-label="전체 화면" onClick={toggleFullscreen}><WatchIcon name="fullscreen" /></button>
            </div>
          </div>
        </div>

        {panel && (
          <aside className={`watch-panel ${panel === 'settings' ? 'watch-panel--settings' : ''}`} aria-label="플레이어 부가 패널">
            {panel !== 'settings' && <div className="watch-panel__header"><div><h2>{({ episodes: '회차', clips: togetherMode && communityTab === 'chat' ? '실시간 채팅' : '와우 클립' })[panel]}</h2>{panel === 'clips' && communityTab !== 'chat' && <p className="watch-panel__subtitle">시청자가 AI로 만든 공개 클립</p>}</div><button type="button" onClick={() => setPanel(null)} aria-label="패널 닫기"><WatchIcon name="close" /></button></div>}
            {panel === 'episodes' && <div className="watch-panel__body">
              {episodes.length === 0 ? <p>회차 정보는 시즌 API 연결 후 표시됩니다.</p> : episodes.map((ep, index) => (
                <button className="watch-episode" key={ep.id || index} type="button" onClick={() => openEpisode(ep.episode_number || index + 1)}>
                  <span className="watch-episode__thumb">{ep.still_path ? <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" /> : <WatchIcon name="play" />}</span><span className="watch-episode__info"><strong>{ep.episode_number || index + 1}회</strong><em className={Number(ep.episode_number || index + 1) === Number(episodeNumber) ? 'is-playing' : ''}>{Number(ep.episode_number || index + 1) === Number(episodeNumber) ? '현재 재생 중' : '재생하기'}</em><small>{ep.overview || ep.name || '에피소드'}</small></span>
                </button>
              ))}
            </div>}
            {panel === 'settings' && <div className="watch-settings">
              <div className="watch-settings__header">
                {settingsTab !== 'main' && <button type="button" onClick={() => setSettingsTab('main')} aria-label="설정 메뉴로 돌아가기"><WatchIcon name="back" /></button>}
                <span>{settingsTab === 'main' ? '설정' : SETTINGS_OPTIONS.find(item => item.tab === settingsTab)?.label}</span>
              </div>
              <div className="watch-settings__items">
                {settingsTab === 'main' && SETTINGS_OPTIONS.map(({ tab, label }) => (
                  <button type="button" key={tab} onClick={() => setSettingsTab(tab)}>
                    <span>{label}</span><span className="watch-settings__trailing"><span>{({ quality, speed: `${speed.toFixed(1)}배속`, subtitles: subtitle, audio })[tab]}</span><span aria-hidden="true" className="watch-settings__chevron">›</span></span>
                  </button>
                ))}
                {settingsTab !== 'main' && (settingsTab === 'speed' ? PLAYBACK_SPEEDS.map(value => ({ label: `${value.toFixed(1)}배속`, value })) : settingsTab === 'quality' ? ['360', '480', '720', '1080'].map(value => ({ label: value, value })) : settingsTab === 'subtitles' ? ['끄기', '한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어'].map(value => ({ label: value, value })) : ['한국어', '영어'].map(value => ({ label: value, value }))).map(({ label, value }) => {
                  const selected = ({ speed, quality, subtitles: subtitle, audio })[settingsTab] === value;
                  return <button type="button" key={value} aria-pressed={selected} onClick={() => {
                    if (settingsTab === 'speed') { setSpeed(value); if (videoRef.current) videoRef.current.playbackRate = value; else youtubePlayer.current?.setPlaybackRate(value); }
                    if (settingsTab === 'quality') setQuality(value);
                    if (settingsTab === 'subtitles') setSubtitle(value);
                    if (settingsTab === 'audio') setAudio(value);
                  }}><span>{label}</span>{selected && <span className="watch-settings__check" aria-hidden="true">✓</span>}</button>;
                })}
              </div>
              {settingsTab !== 'main' && settingsTab !== 'speed' && <span className="sr-only" role="status">{SETTINGS_MESSAGES[settingsTab]}</span>}
            </div>}
            {panel === 'clips' && <div className="watch-clips">
              {chatError && !togetherMode && <p role="alert">{chatError}</p>}
              {togetherMode && <div className="watch-community-tabs" role="tablist" aria-label="같이 보기 메뉴">
                <button role="tab" aria-selected={communityTab === 'clips'} className={communityTab === 'clips' ? 'is-active' : ''} onClick={() => setCommunityTab('clips')} type="button">와우 클립</button>
                <button role="tab" aria-selected={communityTab === 'chat'} className={communityTab === 'chat' ? 'is-active' : ''} onClick={() => setCommunityTab('chat')} type="button">실시간 채팅</button>
              </div>}
              {communityTab === 'chat' && togetherMode ? <div className="watch-chat" role="tabpanel">
                <p className="watch-chat__notice">같이 보기 모드 · 같은 시청 세션 참여자에게 실시간으로 표시됩니다.</p>
                {sessionId && <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${location.pathname}?session=${encodeURIComponent(sessionId)}`)}>세션 초대 링크 복사</button>}
                {chatError && <p role="alert">{chatError}</p>}
                <div className="watch-chat__messages" aria-live="polite">
                  {chatMessages.length === 0 ? <p>아직 메시지가 없습니다.</p> : chatMessages.map(message => <div className="watch-chat__message" key={message.id}><strong>{message.senderId === auth.currentUser?.uid ? '나' : message.senderName || '사용자'}</strong><span>{message.text}</span></div>)}
                </div>
                <form className="watch-chat__form" onSubmit={sendChat}>
                  <input value={chatDraft} onChange={event => setChatDraft(event.target.value)} maxLength={300} placeholder="메시지를 입력하세요" aria-label="실시간 채팅 메시지" />
                  <button type="submit" disabled={!chatDraft.trim() || sendingChat} aria-label="메시지 보내기">전송</button>
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

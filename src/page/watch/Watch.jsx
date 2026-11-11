import { useEffect, useMemo, useRef, useState } from 'react';
import { useMovieStore } from '../../store/useMovieStore';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import WatchIcon from './WatchIcon';
import WatchSettingsPanel from './WatchSettingsPanel';
import WatchChatPanel from './WatchChatPanel';
import { FullVideoClipButton } from '../wowclip/components/FullVideoClipButton';
import { captureClipPlayback } from '../wowclip/utils/captureClipPlayback';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import './Watch.scss';
import { auth } from '../../firebase/firebase';
import { createWatchSession, joinWatchSession } from '../../service/sessionService';
import { subscribeSessionMessages, sendSessionMessage } from '../../service/chatService';
import { communityError } from '../../data/communityData';
import { getSportsLiveMatch, getWatchReturnDestination, resolveWatchMedia } from './watchMedia';
import { getLivePreviewVideo } from '../../service/matchRelatedVideosService';

const EMPTY = [];
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const Watch = () => {
  const { type, id } = useParams();
  const isSports = type === 'sports';
  const isLiveMode = isSports && id === 'live';
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((value) => value.user?.uid);
  const profileId = useProfileStore((value) => value.currentProfile?.id);
  const ownerKey = uid && profileId ? `${uid}_${profileId}` : null;
  const state = !location.state?.ownerKey || location.state.ownerKey === ownerKey
    ? location.state
    : null;
  const content = state?.content ?? {};
  const resumeAt = Number(state?.resumeAt ?? 0);
  const startAt = Number.isFinite(resumeAt) ? Math.max(0, resumeAt) : 0;
  const clipTvDetails = useMovieStore(s => type === 'tv' ? s.tvDetails[id] : null);
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
      replace: true,
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
  const liveMatch = useMemo(() => isLiveMode ? getSportsLiveMatch(location.search) : null, [isLiveMode, location.search]);
  const [liveVideoResult, setLiveVideoResult] = useState(null);
  const [liveAttempt, setLiveAttempt] = useState(0);
  const liveRequestKey = `${location.key}:${liveAttempt}`;
  const liveResult = liveVideoResult?.key === liveRequestKey ? liveVideoResult : null;
  const liveVideo = liveResult?.video;
  const liveLoading = isLiveMode && !liveResult;
  const { youtubeKey, videoSrc, title: mediaTitle } = resolveWatchMedia({ type, id, state, selectedVideo, liveVideo });
  const title = isLiveMode ? liveMatch.title : mediaTitle;
  // videoSrc는 사용 가능한 직접 재생 영상 파일(mp4/webm)의 URL입니다.
  // TMDB 유튜브 예고편 키는 HTML video src로 직접 사용할 수 없습니다.
  const videoRef = useRef(null);
  const lastSaved = useRef({ route: '', at: 0 });
  const youtubePlayer = useRef(null);
  const liveAutoplayTimer = useRef(null);
  const [liveNeedsStart, setLiveNeedsStart] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const autoPlayAttemptedRef = useRef(false);
  const [nextEpisodeNotice, setNextEpisodeNotice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [togetherMode, setTogetherMode] = useState(false);
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
  const [failedSource, setFailedSource] = useState(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const sourceKey = videoSrc || youtubeKey;
  const hasPlaybackError = Boolean(sourceKey) && failedSource === sourceKey;
  const controlsDisabled = (!videoSrc && !youtubeKey) || hasPlaybackError;

  useEffect(() => {
    if (!isLiveMode) return undefined;
    const controller = new AbortController();
    getLivePreviewVideo(liveMatch, { signal: controller.signal }).then(video => {
      if (!controller.signal.aborted) setLiveVideoResult({ key: liveRequestKey, video, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setLiveVideoResult({ key: liveRequestKey, video: null, error: error.message || '이전 경기 영상을 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, [isLiveMode, liveMatch, liveRequestKey]);

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
    youtubePlayer.current = null;
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setYoutubePlaying(false);
    setLiveNeedsStart(false);
    return () => window.clearTimeout(liveAutoplayTimer.current);
  }, [videoSrc, youtubeKey, episodeNumber]);

  const handleVideoReady = async (event) => {
    if ((!state?.autoPlayNext && !isSports) || autoPlayAttemptedRef.current) return;
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
  // 같이 보기 해제 시 시청 세션 연결을 종료합니다.
  // URL의 ?session=... 을 공유하면 같은 시청 세션에 참여할 수 있습니다.
  useEffect(() => {
    if (!togetherMode || !sessionId) return;
    setChatMessages([]);
    return subscribeSessionMessages(sessionId, setChatMessages, err => setChatError(communityError(err)));
  }, [togetherMode, sessionId]);
  const toggleTogetherMode = async () => {
    if (togetherMode) {
      setTogetherMode(false);
      setSessionId(null);
      return;
    }
    if (!auth.currentUser) { setChatError('같이 보기를 사용하려면 로그인해 주세요.'); setPanel('chat'); return; }
    try {
      setChatError('');
      const existing = new URLSearchParams(location.search).get('session');
      const args = { type, contentId: id, season: seasonNumber, episode: episodeNumber };
      const nextId = existing ? await joinWatchSession(existing, args) : await createWatchSession(args);
      setSessionId(nextId);
      setTogetherMode(true);
    } catch (err) { setChatError(communityError(err)); setPanel('chat'); }
  };
  const toggleCommunityPanel = () => {
    if (panel === 'chat') { setPanel(null); return; }
    setPanel('chat');
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
    if (isLiveMode) return;
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    else if (youtubePlayer.current) {
      const player = youtubePlayer.current;
      const next = Math.max(0, Math.min(player.getDuration(), player.getCurrentTime() + seconds));
      player.seekTo(next, true); setCurrentTime(next);
    }
  };
  const changeProgress = (e) => {
    if (isLiveMode) return;
    const video = videoRef.current;
    if (video && duration) video.currentTime = Number(e.target.value);
    else if (youtubePlayer.current && duration) { youtubePlayer.current.seekTo(Number(e.target.value), true); setCurrentTime(Number(e.target.value)); }
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.querySelector('.watch-page')?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const savePlayback = (position, total, completed = false, periodic = false) => {
    if (isSports) return;
    if (!ownerKey || !id || !['movie', 'tv'].includes(type)) {
      console.warn('[시청내역] 저장 건너뜀', {
        hasOwner: Boolean(ownerKey),
        type,
        id,
      });
      return;
    }

    if (!Number.isFinite(position) || !Number.isFinite(total) || total <= 0) {
      console.warn('[시청내역] 재생 시간 확인 불가', { position, total });
      return;
    }

    console.log('[시청내역] 저장 시도', { type, id, position, total });

    const now = Date.now();
    if (periodic && lastSaved.current.route === location.key && now - lastSaved.current.at < 10000) return;
    lastSaved.current = { route: location.key, at: now };

    return onSaveHistory({
      id, title, media_type: type, seasonNumber, episodeNumber,
      backdrop_path: content.backdrop_path || '',
      poster_path: content.poster_path || '',
      position: Math.floor(position),
      duration: Math.floor(total),
      progress: completed ? 100 : Math.min(100, Math.round(position / total * 100)),
      completed,
      videoSrc,
      youtubeKey: videoSrc ? '' : youtubeKey,
      info: type === 'tv' ? `시즌 ${seasonNumber} ${episodeNumber}화` : '영화',
    }, ownerKey).then((saved) => {
      console.log('[시청내역] 저장 결과', saved);
      return saved;
    });
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
    if (isSports) {
      const { path, ...returnState } = getWatchReturnDestination(state);
      navigate(path, { replace: true, state: returnState });
      return;
    }
    const video = videoRef.current;
    const player = youtubePlayer.current;
    if (video && !video.ended) await savePlayback(video.currentTime, video.duration);
    if (!video && youtubePlaying && player) {
      await savePlayback(player.getCurrentTime(), player.getDuration());
    }
    navigate(-1);
  };

  const handlePlaybackError = () => {
    setFailedSource(sourceKey);
    setPlaying(false);
    setYoutubePlaying(false);
    youtubePlayer.current = null;
  };
  const retryPlayback = () => {
    setFailedSource(null);
    setPlaybackAttempt(value => value + 1);
    setCurrentTime(0);
    setDuration(0);
    if (isLiveMode) setLiveAttempt(value => value + 1);
  };

  return (
    <main className={`watch-page${isLiveMode ? ' watch-page--live' : ''}`} aria-label={title} data-player="shared">
      <div className="watch-player">
        {/* 영상 영역: 실제 파일 연결 전에는 빈 플레이어가 표시됩니다. */}
        {liveLoading ? <div className="watch-player__placeholder" role="status">같은 팀의 이전 경기 영상을 불러오는 중입니다.</div>
        : isLiveMode && liveResult?.error ? <div className="watch-player__placeholder watch-player__error" role="status">
          <p>{liveResult.error}</p><button type="button" onClick={retryPlayback}>다시 시도</button>
        </div> : hasPlaybackError ? <div className="watch-player__placeholder watch-player__error" role="status">
          <p>영상을 재생하지 못했습니다. 다시 시도해 주세요.</p>
          <button type="button" onClick={retryPlayback}>다시 시도</button>
        </div> : videoSrc ? (
          <video ref={videoRef} className="watch-player__video" src={videoSrc} key={`${id}-${seasonNumber}-${episodeNumber}-${videoSrc}-${playbackAttempt}`}
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
              if (startAt > 0 && startAt < video.duration) {
                video.currentTime = startAt;
              }
            }}
            onCanPlay={handleVideoReady}
            onError={handlePlaybackError}
            onEnded={(event) => {
              savePlayback(event.currentTarget.duration, event.currentTarget.duration, true);
              goToNextEpisode();
            }}
          />
        ) : youtubeKey ? (
          <YouTube
            key={`${youtubeKey}-${episodeNumber}-${playbackAttempt}`}
            videoId={youtubeKey}
            title={title}
            className="watch-player__youtube"
            iframeClassName="watch-player__youtube-frame"
            onReady={({ target }) => {
              youtubePlayer.current = target;
              const length = target.getDuration();
              setDuration(length);
              target.setVolume(volume);
              if (muted) target.mute();
              if (startAt > 0 && (length === 0 || startAt < length)) {
                target.seekTo(startAt, true);
                setCurrentTime(startAt);
              } else {
                setCurrentTime(target.getCurrentTime());
              }
              if (isLiveMode) {
                target.getIframe().tabIndex = -1;
                target.playVideo();
                window.clearTimeout(liveAutoplayTimer.current);
                liveAutoplayTimer.current = window.setTimeout(() => {
                  if (youtubePlayer.current === target && [-1, 2, 5].includes(target.getPlayerState())) setLiveNeedsStart(true);
                }, 2000);
              }
            }}
            onPlay={(event) => {
              youtubePlayer.current = event.target;
              setYoutubePlaying(true);
              setPlaying(true);
              if (isLiveMode) { window.clearTimeout(liveAutoplayTimer.current); setLiveNeedsStart(false); }
            }}
            onPause={(event) => {
              setYoutubePlaying(false);
              setPlaying(false);
              savePlayback(event.target.getCurrentTime(), event.target.getDuration());
              if (isLiveMode) setLiveNeedsStart(true);
            }}
            onError={handlePlaybackError}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 0,
                rel: 0,
                start: isLiveMode ? 0 : Math.max(0, Math.floor(state?.resumeAt || 0)),
                playsinline: 1,
                ...(isLiveMode ? { disablekb: 1, fs: 0, loop: 1, playlist: youtubeKey } : {}),
              },
            }}
            onEnd={(event) => {
              if (isLiveMode) return;
              setYoutubePlaying(false);
              setPlaying(false);
              const total = event.target.getDuration();
              savePlayback(total, total, true);
              goToNextEpisode();
            }}
          />
        ) : <div className="watch-player__placeholder" role="status">{isSports ? '재생할 영상을 찾을 수 없습니다.' : '재생 가능한 예고편·클립이 없습니다.'}</div>}

        {isLiveMode && liveNeedsStart && !hasPlaybackError && <button type="button" className="watch-player__live-start" onClick={() => {
          setLiveNeedsStart(false); youtubePlayer.current?.playVideo();
        }} aria-label="이전 경기 영상 재생 시작"><WatchIcon name="play" /><span>영상 재생 시작</span></button>}

        {nextEpisodeNotice && (
          <div className="watch-next-episode-notice" role="status" aria-live="polite">
            <WatchIcon name="play" />
            <span>다음 회차로 넘어갑니다.</span>
          </div>
        )}

        <header className="watch-player__header">
          <button className="watch-icon-button" type="button" onClick={goBack} aria-label="뒤로 가기"><WatchIcon name="back" /></button>
          <h1>{title}{type === 'tv' ? ` · ${episodeNumber}화` : ''}</h1>
          {!isSports && <button className={`watch-together-toggle ${togetherMode ? 'is-active' : ''}`} type="button" onClick={toggleTogetherMode} aria-pressed={togetherMode}>
            <WatchIcon name="together" /> 같이 보기 {togetherMode ? 'ON' : ''}
          </button>}
        </header>

        <div className="watch-player__bottom">
          {isLiveMode ? <>
            <div className="watch-player__live-status">
              <span className="watch-player__live-badge"><i aria-hidden="true" />LIVE</span>
              <span className="watch-player__live-source" title={liveVideo?.title}>이전 경기 영상{liveVideo?.title ? ` · ${liveVideo.title}` : ''}</span>
            </div>
            <div className="watch-player__live-track" aria-hidden="true" />
          </> : <><label className="watch-player__progress-label">
            <span className="sr-only">영상 재생 위치</span>
            <input className="watch-player__progress" type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
              onChange={changeProgress} disabled={controlsDisabled || !duration}
              style={{ '--progress': `${duration ? currentTime / duration * 100 : 0}%` }} />
          </label>
          <div className="watch-controls">
            <div className="watch-controls__left">
              <button type="button" disabled={controlsDisabled} onClick={togglePlay} aria-label={playing ? '일시 정지' : '재생'}><WatchIcon name={playing ? 'pause' : 'play'} /></button>
              <button type="button" disabled={controlsDisabled} onClick={() => seek(-10)} aria-label="10초 뒤로"><WatchIcon name="replay" /></button>
              <button type="button" disabled={controlsDisabled} onClick={() => seek(10)} aria-label="10초 앞으로"><WatchIcon name="forward" /></button>
              <div className="watch-volume"><button type="button" onClick={() => setVolumeOpen(open => !open)} aria-expanded={volumeOpen} aria-label="볼륨 조절"><WatchIcon name={muted || volume === 0 ? 'mute' : 'volume'} /></button>{volumeOpen && <div className="watch-volume__levels" aria-label="볼륨 조절"><input type="range" min="0" max="100" value={volume} onChange={e => setVideoVolume(Number(e.target.value))} aria-label="볼륨" style={{ '--volume-progress': `${volume}%` }} /><span>{volume}%</span></div>}</div>
              <span className="watch-controls__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="watch-controls__right">
              {!isSports && <FullVideoClipButton disabled={!youtubeKey || !!videoSrc || hasPlaybackError} getSource={() => {
                const player = youtubePlayer.current;
                const source = {
                  content: { ...clipTvDetails, ...content, id, media_type: type, number_of_seasons: clipTvDetails?.number_of_seasons ?? content.number_of_seasons ?? null },
                  seasonNumber: type === 'tv' ? seasonNumber : undefined,
                  episodeNumber: type === 'tv' ? episodeNumber : undefined,
                  videoKey: youtubeKey, videoTitle: selectedVideo?.name || title,
                  ...captureClipPlayback(player, { currentTime, duration }),
                };
                return source;
              }} />}
              {!isSports && <button type="button" aria-label="회차 목록" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')}><WatchIcon name="episodes" /></button>}
              {!isSports && <button type="button" aria-label="실시간 채팅" aria-expanded={panel === 'chat'} onClick={toggleCommunityPanel}><WatchIcon name="chat" /></button>}
              <button type="button" aria-label="설정" onClick={() => { setPanel(panel === 'settings' ? null : 'settings'); setSettingsTab('main'); }}><WatchIcon name="settings" /></button>
              <button type="button" aria-label="전체 화면" onClick={toggleFullscreen}><WatchIcon name="fullscreen" /></button>
            </div>
          </div>
          </>}
        </div>

        {!isLiveMode && panel === 'settings' && <WatchSettingsPanel
          tab={settingsTab} onTabChange={setSettingsTab} speed={speed} quality={quality}
          subtitle={subtitle} audio={audio} onClose={() => setPanel(null)}
          onSelect={(tab, value) => {
            if (tab === 'speed') {
              setSpeed(value);
              if (videoRef.current) videoRef.current.playbackRate = value;
              else youtubePlayer.current?.setPlaybackRate(value);
            }
            if (tab === 'quality') setQuality(value);
            if (tab === 'subtitles') setSubtitle(value);
            if (tab === 'audio') setAudio(value);
          }}
        />}
        {panel === 'chat' && <WatchChatPanel
          togetherMode={togetherMode} sessionId={sessionId} messages={chatMessages}
          draft={chatDraft} onDraftChange={setChatDraft} onSend={sendChat}
          onClose={() => setPanel(null)} error={chatError} sending={sendingChat}
          currentUid={auth.currentUser?.uid}
          onCopyInvite={() => navigator.clipboard?.writeText(`${window.location.origin}${location.pathname}?session=${encodeURIComponent(sessionId)}`)}
        />}
        {panel === 'episodes' && <aside className="watch-side-panel" aria-label="회차 목록">
          <header className="watch-side-panel__header"><h2>회차</h2><button type="button" onClick={() => setPanel(null)} aria-label="회차 목록 닫기"><WatchIcon name="close" /></button></header>
          <div className="watch-side-panel__episodes">
            {episodes.length === 0 ? <p>회차 정보는 시즌 API 연결 후 표시됩니다.</p> : episodes.map((ep, index) => (
              <button className="watch-episode" key={ep.id || index} type="button" onClick={() => openEpisode(ep.episode_number || index + 1)}>
                <span className="watch-episode__thumb">{ep.still_path ? <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" /> : <WatchIcon name="play" />}</span>
                <span className="watch-episode__info"><strong>{ep.episode_number || index + 1}회</strong><em className={Number(ep.episode_number || index + 1) === Number(episodeNumber) ? 'is-playing' : ''}>{Number(ep.episode_number || index + 1) === Number(episodeNumber) ? '현재 재생 중' : '재생하기'}</em><small>{ep.overview || ep.name || '에피소드'}</small></span>
              </button>
            ))}
          </div>
        </aside>}
      </div>
    </main>
  );
};

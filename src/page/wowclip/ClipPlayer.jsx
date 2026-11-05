import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { clipImage, formatTime } from './wowClipData';
import { clipPresentation, sourceLeftPercent } from './clipPresentation';
import { ClipIcon, IconButton } from './WowClipUi';
import './ClipPlayer.scss';

export const ClipPlayer = ({ clip, onDuration, preview = false, previewRequest, onPosition, autoPlay = false, loop = false, compact = false, controls = true, muted: givenMuted, onMutedChange, onPlaybackChange, onFirstPlay }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const countedRef = useRef(false);
  const [mounted, setMounted] = useState(preview || autoPlay);
  const [initialStart] = useState(clip.start);
  const pendingSeekRef = useRef(previewRequest?.time ?? clip.start);
  const previewingRef = useRef(preview);
  const desiredPlayingRef = useRef(!preview || autoPlay);
  const [playing, setPlaying] = useState(false);
  const [localMuted, setLocalMuted] = useState(autoPlay);
  const muted = givenMuted ?? localMuted;
  const [position, setPosition] = useState(clip.start);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [rate, setRate] = useState(1);
  const { layout, cropX } = clipPresentation(clip);
  const start = Math.max(0, clip.start);
  const end = Math.min(Math.max(start + 0.1, clip.end), duration || clip.end);

  useEffect(() => { if (muted) playerRef.current?.mute(); else playerRef.current?.unMute(); }, [muted]);
  useEffect(() => {
    if (!preview || !previewRequest) return;
    pendingSeekRef.current = previewRequest.time;
    previewingRef.current = !previewRequest.play;
    desiredPlayingRef.current = !!previewRequest.play;
    const player = playerRef.current;
    if (player) {
      if (!previewRequest.play) player.pauseVideo();
      player.seekTo(previewRequest.time, true);
      if (previewRequest.play) player.playVideo();
    }
  }, [preview, previewRequest]);
  useEffect(() => {
    if (!mounted) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime();
      if (!Number.isFinite(current)) return;
      onPosition?.(current);
      if (playing && !previewingRef.current && current >= end) {
        player.seekTo(start, true); setPosition(start);
        if (loop && desiredPlayingRef.current) player.playVideo();
        else { desiredPlayingRef.current = false; player.pauseVideo(); setPlaying(false); }
      } else if (playing && !previewingRef.current && current < start - 0.5) player.seekTo(start, true);
      else setPosition(current);
    }, 150);
    return () => window.clearInterval(timer);
  }, [mounted, playing, start, end, onPosition, loop]);
  const togglePlayback = () => {
    setError('');
    if (!mounted) { setMounted(true); return; }
    const player = playerRef.current;
    if (!player) return;
    let time = player.getCurrentTime();
    if (playing) { desiredPlayingRef.current = false; player.pauseVideo(); onPlaybackChange?.(false, time); }
    else {
      desiredPlayingRef.current = true; previewingRef.current = false;
      if (time < start || time >= end) { time = start; player.seekTo(start, true); }
      player.playVideo(); onPlaybackChange?.(true, time);
    }
  };
  const seek = (event) => { const time = Number(event.target.value); playerRef.current?.seekTo(time, true); setPosition(time); };
  const toggleSound = () => { setLocalMuted(!muted); onMutedChange?.(!muted); };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await containerRef.current?.requestFullscreen(); }
    catch { setError('이 브라우저에서는 전체 화면을 사용할 수 없어요.'); }
  };
  return <div className={'wowclip-player is-format-' + layout + (preview ? ' wowclip-player--preview' : '') + (compact ? ' wowclip-player--compact' : '') + (!controls ? ' wowclip-player--mirror' : '')} ref={containerRef} data-playing={playing} data-position={position.toFixed(2)}>
    <div className="wowclip-player-visual"><div className="wowclip-media-window"><div className="wowclip-media-source" style={layout === 'portrait' ? { width: '316.049383%', left: sourceLeftPercent(cropX) + '%' } : undefined}>
      {!mounted && <img className="wowclip-player-poster" src={clipImage(clip)} alt="" />}
      {mounted && <YouTube videoId={clip.videoKey} title={clip.videoTitle || clip.title} className="wowclip-youtube" iframeClassName="wowclip-youtube-frame" opts={{ width: '100%', height: '100%', playerVars: { controls: 0, playsinline: 1, rel: 0, start: Math.floor(initialStart) } }}
        onReady={({ target }) => { playerRef.current = target; const length = target.getDuration(); setDuration(length); onDuration?.(length); target.seekTo(preview ? pendingSeekRef.current : start, true); if (muted) target.mute(); if (!preview || desiredPlayingRef.current) target.playVideo(); }}
        onStateChange={({ data, target }) => {
          if (preview && data === 1 && !desiredPlayingRef.current) { target.pauseVideo(); setPlaying(false); }
          else {
            setPlaying(data === 1);
            if (data === 1 && !countedRef.current) { countedRef.current = true; onFirstPlay?.(); }
            if (data === 0 && loop && desiredPlayingRef.current) { target.seekTo(start, true); target.playVideo(); }
          }
        }}
        onError={() => { setPlaying(false); setError('영상을 불러오지 못했어요. 재생을 다시 눌러 주세요.'); setMounted(false); playerRef.current = null; }} />}
    </div></div></div>
    {controls && <div className="wowclip-player-controls">
      {!preview && <label className="wowclip-seek"><span className="sr-only">클립 재생 위치</span><input type="range" min={start} max={end} step="0.1" value={Math.max(start, Math.min(end, position))} onChange={seek} disabled={!mounted} /></label>}
      {!compact && <div className="wowclip-player-buttons">
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? '일시정지' : '구간 재생'} onClick={togglePlayback} />{preview && <span>구간 재생</span>}
        <IconButton icon={muted ? 'mute' : 'volume'} label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={toggleSound} />{preview ? <span>소리</span> : <span className="wowclip-player-time">{formatTime(Math.max(0, position - start))} / {formatTime(end - start)}</span>}
        <div className="wowclip-spacer" /><div className="wowclip-player-settings"><IconButton icon="settings" label="재생 설정" aria-expanded={settings} onClick={() => setSettings(!settings)} />
          {settings && <div className="wowclip-settings-popover"><label>재생 속도<select value={rate} onChange={(event) => { const next = Number(event.target.value); playerRef.current?.setPlaybackRate(next); setRate(next); }}>{[0.5, 1, 1.5, 2].map((value) => <option key={value} value={value}>{value}배</option>)}</select></label><p><a href={'https://www.youtube.com/watch?v=' + encodeURIComponent(clip.videoKey)} target="_blank" rel="noreferrer">YouTube에서 자막·화질 선택</a></p></div>}
        </div>{!preview && <IconButton icon="fullscreen" label="전체 화면" onClick={fullscreen} />}
      </div>}
    </div>}
    {compact && controls && <div className="wowclip-player-top-controls"><IconButton icon={muted ? 'mute' : 'volume'} label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={toggleSound} /><IconButton icon="fullscreen" label="전체 화면" onClick={fullscreen} /></div>}
    {error && <p className="wowclip-player-error" role="alert">{error}</p>}
    {controls && (!mounted || !playing || compact) && <button type="button" className={'wowclip-player-center' + (playing ? ' is-playing' : '')} aria-label={playing ? '일시정지' : preview ? '선택 구간 미리보기' : '클립 재생'} onClick={togglePlayback}><ClipIcon name={playing ? 'pause' : 'play'} /></button>}
  </div>;
};

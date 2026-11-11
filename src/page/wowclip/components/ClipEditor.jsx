import { useRef, useState } from 'react';
import { ClipModal } from './WowClipUi';
import { ClipPlayer } from './ClipPlayer';
import { contentTitle, formatTime, makeClip } from '../utils/wowClipData';
import { clipEpisodeLabel } from '../utils/clipSource';
import { initialClipWindow, moveClipRange } from '../utils/clipTimeline';
import { ClipCropSelector } from './ClipCropSelector';
import { useAuthStore } from '../../../store/useAuthStore';
import '../scss/ClipEditor.scss';

const Timeline = ({ range, onChange, minimum, maximum, position }) => {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const length = maximum - minimum;
  const percentage = (time) => (time - minimum) / length * 100;
  const change = (edge, value, original = range, play = false) => {
    const next = moveClipRange(original, edge, value, minimum, maximum);
    if (dragRef.current) dragRef.current.latest = next;
    onChange(next, play ? next.start : edge === 'end' ? next.end : next.start, play);
  };
  const pointerDown = (event, edge) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { edge, x: event.clientX, range: { ...range }, latest: { ...range } };
    onChange(range, edge === 'end' ? range.end : range.start);
  };
  const pointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const difference = (event.clientX - drag.x) / trackRef.current.clientWidth * length;
    change(drag.edge, (drag.edge === 'move' ? drag.range.start : drag.range[drag.edge]) + difference, drag.range);
  };
  const keyDown = (event, edge) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 1 : 0.1;
    change(edge, event.key === 'Home' ? minimum : event.key === 'End' ? maximum : range[edge] + (event.key === 'ArrowLeft' ? -step : step), range, true);
  };
  const stopDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag) onChange(drag.latest, drag.latest.start, true);
  };
  return <div className="wowclip-timeline">
    <div className="wowclip-timeline-labels"><span>{formatTime(minimum)}</span><span>{formatTime(maximum)}</span></div>
    <div className="wowclip-timeline-track" ref={trackRef}>
      <div className="wowclip-timeline-ticks" aria-hidden="true">{Array.from({ length: 21 }, (_, index) => <i key={index} style={{ left: `${index * 5}%` }} />)}</div>
      <div className="wowclip-timeline-selection" style={{ left: `${percentage(range.start)}%`, width: `${(range.end - range.start) / length * 100}%` }}>
        <div className="wowclip-timeline-move" aria-hidden="true" onPointerDown={(event) => pointerDown(event, 'move')} onPointerMove={pointerMove} onPointerUp={stopDrag} onLostPointerCapture={stopDrag} />
        {['start', 'end'].map((edge) => <button type="button" key={edge} className={`wowclip-timeline-handle is-${edge}`} role="slider" aria-label={edge === 'start' ? '클립 시작 시각' : '클립 종료 시각'} aria-valuemin={edge === 'start' ? minimum : range.start + Math.min(1, length)} aria-valuemax={edge === 'start' ? range.end - Math.min(1, length) : maximum} aria-valuenow={range[edge]} aria-valuetext={formatTime(range[edge])} onKeyDown={(event) => keyDown(event, edge)} onPointerDown={(event) => pointerDown(event, edge)} onPointerMove={pointerMove} onPointerUp={stopDrag} onLostPointerCapture={stopDrag}><span /></button>)}
      </div>
      <span className="wowclip-timeline-playhead" aria-hidden="true" style={{ left: `${Math.max(0, Math.min(100, percentage(position)))}%` }} />
    </div>
    <div className="wowclip-timeline-summary"><span>시작 {formatTime(range.start)} · 종료 {formatTime(range.end)}</span><strong>{Math.round((range.end - range.start) * 10) / 10}초</strong></div>
    <output className="wowclip-preview-position" aria-label="미리보기 원본 시각">미리보기 {formatTime(position)}</output>
  </div>;
};

export const ClipEditor = ({ owner, source, onClose, onSave }) => {
  const user = useAuthStore((state) => state.user);
  const [initial] = useState(() => initialClipWindow(source?.duration, source?.currentTime));
  const [range, setRange] = useState({ start: initial.start, end: initial.end });
  const [bounds, setBounds] = useState({ start: initial.contextStart, end: initial.contextEnd });
  const [previewRequest, setPreviewRequest] = useState({ time: initial.start, revision: 0 });
  const [layout, setLayout] = useState('landscape');
  const [cropX, setCropX] = useState(50);
  const [previewPosition, setPreviewPosition] = useState(initial.start);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [spoiler, setSpoiler] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  if (!user || !source?.fullVideo || !source.videoKey || !source.content) return null;
  const updateRange = (next, time, play = false) => {
    setRange(next);
    setPreviewRequest((previous) => ({ time, play, revision: previous.revision + 1 }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!ready) { setError('영상을 불러온 뒤 구간을 확인해 주세요.'); return; }
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try { await onSave(makeClip({ content: source.content, video: { key: source.videoKey, name: source.videoTitle }, seasonNumber: source.seasonNumber, episodeNumber: source.episodeNumber, title, ...range, visibility, spoiler, owner, layout, cropX })); }
    catch (failure) { setError(failure.message); savingRef.current = false; setSaving(false); }
  };

  return <ClipModal title="클립 만들기" onClose={onClose} className="wowclip-editor">
    <form className="wowclip-editor-body" onSubmit={submit}>
      <div className="wowclip-editor-preview">
        <div className="wowclip-editor-source-player"><ClipPlayer clip={{ videoKey: source.videoKey, videoTitle: source.videoTitle, ...range }} preview previewRequest={previewRequest} onPosition={setPreviewPosition} onDuration={(length) => {
          if (!(length > 0)) return;
          setReady(true);
          const corrected = initialClipWindow(length, source.currentTime);
          if (range.end > length || bounds.end > length) {
            const next = { start: corrected.start, end: corrected.end };
            setBounds({ start: corrected.contextStart, end: corrected.contextEnd });
            updateRange(next, next.start);
          }
        }} />{layout === 'portrait' && <ClipCropSelector value={cropX} onChange={setCropX} />}</div>
        <Timeline range={range} onChange={updateRange} minimum={bounds.start} maximum={bounds.end} position={previewPosition} />
      </div>
      <div className="wowclip-editor-details">
        <h3 className="wowclip-editor-preview-label wowclip-editor-video-heading wowclip-editor-source-heading"><span className="wowclip-editor-video-title" title={contentTitle(source.content)}>{contentTitle(source.content)}</span>{clipEpisodeLabel(source) && <span className="wowclip-editor-episode">· {clipEpisodeLabel(source)}</span>}</h3>
        <label className="wowclip-title-input">클립 제목<input value={title} maxLength={80} placeholder="이 장면에 제목을 붙여보세요." onChange={(event) => setTitle(event.target.value)} /></label>
        <fieldset className="wowclip-format-setting"><legend>화면 형식</legend><div className="wowclip-layout-options wowclip-segmented" data-selected-index={layout === 'portrait' ? 1 : 0}>{[['landscape', '가로형', '16:9'], ['portrait', '세로형', '9:16']].map(([value, label, ratio]) => <label key={value}><input type="radio" name="clip-layout" value={value} aria-label={`${label} ${ratio}`} checked={layout === value} onChange={() => setLayout(value)} /><span className="wowclip-layout-option"><span className="wowclip-layout-icon-slot" aria-hidden="true"><span className={'wowclip-layout-icon is-' + value} /></span><span className="wowclip-layout-label"><strong>{label}</strong><span>{ratio}</span></span></span></label>)}</div></fieldset>
        <fieldset className="wowclip-sharing"><legend>공유 설정</legend><div className="wowclip-share-options wowclip-segmented" data-selected-index={visibility === 'link' ? 1 : 0}>
          {[['public', '와우 클립에 공개'], ['link', '링크로만 공유']].map(([value, label]) => <label key={value}><input type="radio" name="clip-visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} /><span>{label}</span></label>)}
        </div><label className="wowclip-checkbox"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />스포일러 보호</label><p className="wowclip-sharing-help">{visibility === 'public' ? '와우 클립 목록에서 누구나 볼 수 있어요.' : '전체 목록에 표시하지 않고 링크가 있는 사람에게만 공유해요.'}</p></fieldset>
        {error && <p className="wowclip-error" role="alert">{error}</p>}
        <div className="wowclip-editor-submit"><p>선택한 영상의 구간을 클립으로 저장해요.</p><button type="submit" className="wowclip-button wowclip-button--primary" disabled={!ready || saving}>{saving ? '저장 중…' : visibility === 'public' ? '와우 클립에 공개' : '저장하고 링크 복사'}</button></div>
      </div>
    </form>
  </ClipModal>;
};

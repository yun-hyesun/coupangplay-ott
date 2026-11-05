import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClipRange, formatClipTime } from '../../components/wowclip/ClipRange';
import './WowClip.scss';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function WowClip() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const source = location.state || {};
  const video = useRef(null);
  const duration = Number.isFinite(source.duration) && source.duration > 0 ? source.duration : 1476;
  const initialTime = clamp(Math.floor(Number(source.currentTime) || 134), 0, duration);
  const windowMin = clamp(initialTime - 9, 0, Math.max(0, duration - 20));
  const windowMax = Math.min(duration, windowMin + 20);
  const [start, setStart] = useState(clamp(initialTime, windowMin, windowMax - 1));
  const [end, setEnd] = useState(clamp(initialTime + 5, start + 1, windowMax));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const titleOfContent = source.content?.name || source.content?.title || source.content?.original_name || source.content?.original_title || '시청 중인 영상';
  const videoSrc = source.videoSrc || '';
  const onRangeChange = (nextStart, nextEnd) => {
    setStart(nextStart);
    setEnd(nextEnd);
    setSaved(false);
    if (video.current) { video.current.pause(); video.current.currentTime = nextStart; }
    setPlaying(false);
  };
  useEffect(() => {
    if (!playing || !video.current) return;
    const player = video.current;
    const onTime = () => { if (player.currentTime >= end) { player.pause(); setPlaying(false); player.currentTime = start; } };
    player.addEventListener('timeupdate', onTime);
    return () => player.removeEventListener('timeupdate', onTime);
  }, [playing, start, end]);
  const preview = () => {
    if (!videoSrc || !video.current) { setNotice('현재 영상에는 직접 재생 가능한 원본 파일이 없어 구간 미리보기를 지원하지 않습니다.'); return; }
    const player = video.current;
    if (playing) { player.pause(); setPlaying(false); return; }
    player.currentTime = start;
    player.play().then(() => { setPlaying(true); setNotice(''); }).catch(() => setNotice('영상 재생이 제한되어 있습니다.'));
  };
  const saveDraft = () => {
    const draft = { contentType: type, contentId: id, episodeNumber: source.episodeNumber || 1, seasonNumber: source.seasonNumber || 1, contentTitle: titleOfContent, title: title.trim(), description: description.trim(), startTime: start, endTime: end, visibility, spoiler, captions, updatedAt: new Date().toISOString() };
    if (!draft.title) { setNotice('클립 제목을 입력해 주세요.'); return; }
    try { sessionStorage.setItem('wowclip-draft', JSON.stringify(draft)); setSaved(true); setNotice('편집 정보가 이 브라우저의 임시 보관함에 저장되었습니다. 실제 AI 편집·영상 생성·공개 업로드는 아직 연결되지 않았습니다.'); }
    catch { setNotice('임시 저장에 실패했습니다.'); }
  };
  return (
    <main className="wow-clip-page">
      <div className="wow-clip-page__backdrop" aria-hidden="true" />
      <section className="wow-clip-editor" aria-label="와우 클립 편집">
        <header className="wow-clip-editor__header"><div><h1>클립 만들기</h1><p>{titleOfContent} · {source.seasonNumber || 1}시즌 {source.episodeNumber || 1}화</p></div><button type="button" className="wow-clip-editor__close" aria-label="편집 닫기" onClick={() => navigate(-1)}>×</button></header>
        <div className="wow-clip-editor__body">
          <div className="wow-clip-editor__workspace">
            <div className="wow-clip-editor__preview">
              <div className="wow-clip-editor__screen">
                {videoSrc ? <video ref={video} src={videoSrc} playsInline muted={muted} onEnded={() => setPlaying(false)} onError={() => setNotice('원본 영상 파일을 불러올 수 없습니다.')} /> : <div className="wow-clip-editor__placeholder"><span>WOW CLIP</span><strong>{titleOfContent}</strong><p>클립 구간 미리보기</p><small>원본 영상 파일 연결 시 이곳에서 재생됩니다.</small></div>}
              </div>
              <div className="wow-clip-editor__player-actions"><button type="button" onClick={preview}>{playing ? 'Ⅱ' : '▶'} <span>구간 재생</span></button><button type="button" onClick={() => { setMuted(!muted); if (video.current) video.current.muted = !muted; }}>{muted ? '음소거' : '소리'}</button><button type="button" className="wow-clip-editor__captions" onClick={() => setCaptions(!captions)} aria-pressed={captions}>CC　자막 {captions ? '켜짐' : '꺼짐'}</button></div>
            </div>
            <ClipRange start={start} end={end} min={windowMin} max={windowMax} onChange={onRangeChange} />
            <p className="wow-clip-editor__help">양쪽 파란 손잡이로 시작·종료 시간을 조절하세요. 키보드 방향키로 1초씩 이동할 수 있습니다.</p>
          </div>
          <div className="wow-clip-editor__form">
            <label>클립 제목<input maxLength={60} value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} placeholder="장면을 소개하는 제목을 입력하세요" /></label>
            <label>클립 소개<textarea maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="이 장면을 추천하는 이유를 남겨보세요" /></label>
            <fieldset><legend>공개 범위</legend><label><input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> 와우클립 공개</label><label><input type="radio" checked={visibility === 'link'} onChange={() => setVisibility('link')} /> 링크 전용</label></fieldset>
            <label className="wow-clip-editor__checkbox"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> 스포일러 포함</label>
            <div className="wow-clip-editor__note">선택 구간: {formatClipTime(start)} – {formatClipTime(end)} ({end - start}초)</div>
            <button type="button" className="wow-clip-editor__submit" onClick={saveDraft}>{saved ? '임시 저장 완료' : '클립 정보 임시 저장'}</button>
            <p className="wow-clip-editor__disclaimer">AI 영상 편집·파일 생성·게시 API는 아직 연결되지 않았습니다.</p>
          </div>
        </div>
        {notice && <p className="wow-clip-editor__notice" role="status">{notice}</p>}
      </section>
    </main>
  );
}

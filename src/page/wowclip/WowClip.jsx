import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ClipCard } from './ClipCard';
import { ClipFeed } from './ClipFeed';
import { ClipModal, ClipSort, IconButton } from './WowClipUi';
import { contentTitle, formatTime } from './wowClipData';
import { buildClipFeed } from './clipPresentation';
import { useWowClipLibrary } from './useWowClipLibrary';
import './WowClip.scss';
import './WowClipBrowse.scss';

export const WowClip = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.currentProfile);
  const library = useWowClipLibrary();
  const [revealed, setRevealed] = useState(() => location.state?.createdClipId ? [location.state.createdClipId] : []);
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [now] = useState(() => Date.now());
  const owner = { id: (user?.uid || 'local') + ':' + (profile?.id || 'default'), name: profile?.name || user?.displayName || '나', avatar: profile?.avatar || '/images/profile.svg' };
  const mine = params.get('view') === 'mine';
  const sort = params.get('sort') === 'recent' ? 'recent' : 'popular';
  const period = params.get('period') || 'all';
  const selectedId = params.get('clip');
  const selected = library.clips.find((clip) => clip.id === selectedId);
  const protectedClip = selected?.spoiler && !revealed.includes(selected.id);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const updateParams = (change, replace = false) => {
    const next = new URLSearchParams(params);
    Object.entries(change).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace });
  };
  const backToList = () => { updateParams({ clip: null }); window.scrollTo({ top: 0 }); };
  const copyLink = async (clip) => {
    const url = new URL('/wowclip', window.location.origin);
    url.search = new URLSearchParams({ clip: clip.id });
    try { await navigator.clipboard.writeText(url.href); setNotice('이 브라우저에서 클립을 여는 링크를 복사했어요.'); }
    catch { setNotice('링크를 복사하지 못했어요. 주소창의 링크를 복사해 주세요.'); }
  };
  const visible = library.clips.filter((clip) => mine ? clip.ownerId === owner.id : clip.visibility === 'public')
    .filter((clip) => period === 'all' || now - new Date(clip.createdAt).getTime() <= (period === 'week' ? 7 : 1) * 86400000)
    .sort((a, b) => sort === 'recent' ? new Date(b.createdAt) - new Date(a.createdAt) : b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt));
  return <main className="wowclip-page">
    {selected ? <ClipFeed clips={buildClipFeed(visible, selected)} selectedId={selected.id} owner={owner} revealed={revealed}
      onSelect={(id) => updateParams({ clip: id }, true)} onBack={backToList} onLike={library.toggleLike} onCopy={copyLink} onDelete={setDeleteId}
      onAdd={library.addComment} onCommentLike={library.toggleLike} onRefresh={library.reload} onView={library.recordView} notify={setNotice} />
      : selectedId ? <div className="wowclip-state"><h1>클립을 찾을 수 없어요.</h1><p>삭제되었거나 이 브라우저에 저장되지 않은 클립이에요.</p><button className="wowclip-button" type="button" onClick={backToList}>와우 클립으로 돌아가기</button></div>
        : <>
          <div className="wowclip-heading"><h1>{mine ? '내 클립' : '와우 클립'}</h1><button className="wowclip-button" type="button" onClick={() => updateParams({ view: mine ? null : 'mine' })}>{mine ? '전체 클립' : '내 클립'}</button></div>
          <div className="wowclip-browse-controls"><div className="wowclip-periods" role="tablist" aria-label="클립 기간">{[['all', '전체'], ['day', '실시간'], ['week', '주간']].map(([value, label]) => <button type="button" role="tab" aria-selected={period === value} key={value} onClick={() => updateParams({ period: value === 'all' ? null : value })}>{label}</button>)}</div><ClipSort value={sort} onChange={(value) => updateParams({ sort: value })} /></div>
          {library.error ? <div className="wowclip-state" role="alert"><h2>클립을 불러오지 못했어요.</h2><p>{library.error}</p><button className="wowclip-button" type="button" onClick={library.reload}>다시 불러오기</button></div>
            : visible.length ? <div className="wowclip-grid">{visible.map((clip) => <ClipCard key={clip.id} clip={clip} onOpen={(clip) => updateParams({ clip: clip.id })} />)}</div>
              : <div className="wowclip-state"><h2>{mine ? '아직 만든 클립이 없어요.' : '아직 공개된 클립이 없어요.'}</h2><p>원본 영상을 시청하다 마음에 드는 장면을 클립으로 만들어보세요.</p><Link className="wowclip-button wowclip-button--primary" to="/">작품 둘러보기</Link></div>}
        </>}
    {protectedClip && <ClipModal title="스포일러가 있어요" icon="spoiler" onClose={backToList}><div className="wowclip-spoiler-info"><strong>{contentTitle(selected.content)}</strong><p>{formatTime(selected.end - selected.start)} · {selected.author}</p></div><p>장면·제목·댓글을 가려두었어요.</p><div className="wowclip-modal-actions"><button className="wowclip-button wowclip-button--primary" type="button" onClick={() => setRevealed((previous) => [...previous, selected.id])}>스포일러 열고 보기</button></div></ClipModal>}
    {deleteId && <ClipModal title="클립을 삭제할까요?" onClose={() => setDeleteId(null)}><p>삭제한 클립과 댓글은 다시 볼 수 없어요.</p><div className="wowclip-modal-actions"><button type="button" className="wowclip-button" onClick={() => setDeleteId(null)}>취소</button><button type="button" className="wowclip-button wowclip-button--primary" onClick={() => { try { library.removeClip(deleteId, owner.id); setDeleteId(null); backToList(); setNotice('클립을 삭제했어요.'); } catch (failure) { setNotice(failure.message); } }}>삭제</button></div></ClipModal>}
    {notice && <div className="wowclip-toast" role="status"><span>{notice}</span><IconButton icon="close" label="알림 닫기" onClick={() => setNotice('')} /></div>}
  </main>;
};
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClipRange, formatClipTime } from '../../components/wowclip/ClipRange';
import './WowClip.scss';
import { useAuthStore } from '../../store/useAuthStore';
import { saveClip } from '../../components/wowclip/clipStorage';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function WowClip() {
  const { type, id } = useParams();
  const user = useAuthStore((state) => state.user);
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
  const saveAndGo = (status) => {
    if (!title.trim()) { setNotice('클립 제목을 입력해 주세요.'); return; }
    const clip = {
      contentType: type, contentId: id,
      episodeNumber: source.episodeNumber || 1,
      seasonNumber: source.seasonNumber || 1,
      contentTitle: titleOfContent,
      title: title.trim(), description: description.trim(),
      startTime: start, endTime: end,
      visibility, spoiler, captions, status,
      // 영상 원본 URL은 영구 저장하지 않습니다. 서버 업로드가 연결되기 전까지 메타데이터만 저장됩니다.
    };
    try {
      saveClip(user?.uid, clip);
      setSaved(true);
      navigate(status === 'published' ? '/wowclip' : '/my/review?tab=wowclip', {
        state: {
          clipNotice: status === 'published'
            ? '게시 기록을 이 브라우저에 저장했습니다. 실제 다른 사용자에게 공개되지는 않습니다.'
            : '와우 클립이 임시 저장되었습니다.'
        }
      });
    } catch { setNotice('클립 정보를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
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
            <div className="wow-clip-editor__submit-actions">
              <button type="button" className="wow-clip-editor__draft" onClick={() => saveAndGo('draft')}>임시 저장</button>
              <button type="button" className="wow-clip-editor__submit" onClick={() => saveAndGo('published')}>게시하기</button>
            </div>
            <p className="wow-clip-editor__disclaimer">영상 파일 생성·실제 서버 게시 기능은 아직 연결되지 않았습니다. 게시 기록은 이 브라우저에만 표시됩니다.</p>
          </div>
        </div>
        {notice && <p className="wow-clip-editor__notice" role="status">{notice}</p>}
      </section>
    </main>
  );
}

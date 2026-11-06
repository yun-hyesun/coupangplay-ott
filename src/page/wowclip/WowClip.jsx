import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ClipCard } from './components/ClipCard';
import { ClipFeed } from './components/ClipFeed';
import { ClipModal, ClipSort, IconButton } from './components/WowClipUi';
import { contentTitle, formatTime } from './utils/wowClipData';
import { buildClipFeed } from './utils/clipPresentation';
import { useWowClipLibrary } from './hooks/useWowClipLibrary';
import './scss/WowClip.scss';
import './scss/WowClipBrowse.scss';

export const WowClip = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.currentProfile);
  const library = useWowClipLibrary();

  const [revealed, setRevealed] = useState(() =>
    location.state?.createdClipId ? [location.state.createdClipId] : []
  );
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [now] = useState(() => Date.now());

  const owner = {
    id: `${user?.uid || 'local'}:${profile?.id || 'default'}`,
    name: profile?.name || user?.displayName || '나',
    avatar: profile?.avatar || '/images/profile.svg',
  };

  const mine = params.get('view') === 'mine';
  const sort = params.get('sort') === 'recent' ? 'recent' : 'popular';
  const period = params.get('period') || 'all';
  const selectedId = params.get('clip');

  const selected = library.clips.find((clip) => clip.id === selectedId);
  const protectedClip =
    selected?.spoiler && !revealed.includes(selected.id);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(''), 5000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateParams = (change, replace = false) => {
    const next = new URLSearchParams(params);

    Object.entries(change).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    setParams(next, { replace });
  };

  const backToList = () => {
    updateParams({ clip: null });
    window.scrollTo({ top: 0 });
  };

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

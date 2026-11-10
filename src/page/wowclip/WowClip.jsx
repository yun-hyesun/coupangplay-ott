
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useProfileWatchHistory } from '../../store/useProfileWatchHistory';
import { ClipCard } from './components/ClipCard';
import { ClipFeed } from './components/ClipFeed';
import { ClipModal, ClipSort, IconButton } from './components/WowClipUi';
import { contentTitle, formatTime } from './utils/wowClipData';
import { buildClipFeed } from './utils/clipPresentation';
import { clipLikeCount } from './utils/cloudClipData';
import { useWowClipLibrary } from './hooks/useWowClipLibrary';
import { useSpoilerAccess } from './hooks/useSpoilerAccess';
import './scss/WowClip.scss';
import './scss/WowClipBrowse.scss';

// [추가] 마이페이지 전용 내비게이션 스타일
import './scss/MyWowClipNav.scss';

// [추가] 마이페이지 상단 콘텐츠 탭
const contentTabs = [
  { title: '시청내역', path: '/my/history' },
  { title: '찜한 콘텐츠', path: '/my/watchlist' },
  { title: '개별 구매', path: '/my/purchases' },
  { title: '내 와우 클립', path: '/wowclip?view=mine' },
  { title: '라이브 예약 알림', path: '/my/live' }
];

export const WowClip = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.currentProfile);
  const selectedId = params.get('clip');
  const library = useWowClipLibrary({ selectedId });
  const [revealed, setRevealed] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [busy, setBusy] = useState(false);
  const owner = { id: (user?.uid || 'local') + ':' + (profile?.id || 'default'), name: profile?.name || user?.displayName || '나', avatar: profile?.avatar || '/images/profile.svg' };
  const mine = params.get('view') === 'mine';
  const sort = params.get('sort') === 'recent' ? 'recent' : 'popular';
  const selected = library.clips.find((clip) => clip.id === selectedId);
  const { history } = useProfileWatchHistory({ clipId: selectedId });

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(''), 5000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateParams = (change, replace = false) => {
    const next = new URLSearchParams(params);
    next.delete('period');
    Object.entries(change).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace });
  };

  const backToList = () => {
    updateParams({ clip: null });
    window.scrollTo({ top: 0 });
  };

  const copyLink = async (clip) => {
    const url = new URL('/wowclip', window.location.origin);
    url.search = new URLSearchParams({ clip: clip.id });
    try { await navigator.clipboard.writeText(url.href); setNotice('클립 링크를 복사했어요.'); }
    catch { setNotice('링크를 복사하지 못했어요. 주소창의 링크를 복사해 주세요.'); }
  };
  const visible = library.clips.filter((clip) => mine ? clip.ownerId === owner.id : clip.visibility === 'public')
    .sort((a, b) => sort === 'recent' ? new Date(b.createdAt) - new Date(a.createdAt) : clipLikeCount(b) - clipLikeCount(a) || new Date(b.createdAt) - new Date(a.createdAt));
  const feed = selected ? buildClipFeed(visible, selected) : visible;
  const access = useSpoilerAccess(feed, history, selectedId);
  const isProtected = (clip) => access.isProtected(clip) &&
    !(revealed?.ownerId === owner.id && revealed.ids.includes(clip.id)) &&
    !(user && clip.id === location.state?.createdClipId && clip.ownerId === owner.id);
  const protectedClip = selected && isProtected(selected);
  return <main className="wowclip-page">
    {selected ? <ClipFeed clips={feed} selectedId={selected.id} owner={owner} isProtected={isProtected}
      onSelect={(id) => updateParams({ clip: id }, true)} onBack={backToList} onLike={library.toggleLike} onCopy={copyLink} onDelete={setDeleteId}
      onAdd={library.addComment} onCommentLike={library.toggleLike} onRefresh={library.reload} onView={(id) => library.recordView(id, profile?.id)} notify={setNotice}
      onCommentEdit={library.editComment} onCommentRemove={library.removeComment}
      commentsError={library.commentsError} commentsLoading={library.commentsLoading} userUid={user?.uid} />
      : selectedId ? <div className="wowclip-state">{library.loading ? <p role="status">클립을 불러오고 있어요.</p> : library.error ? <><h1>클립을 불러오지 못했어요.</h1><p role="alert">{library.error}</p><button className="wowclip-button" type="button" onClick={library.reload}>다시 불러오기</button></> : <><h1>클립을 찾을 수 없어요.</h1><p>삭제되었거나 열 수 없는 클립이에요.</p></>}<button className="wowclip-button" type="button" onClick={backToList}>와우 클립으로 돌아가기</button></div>
        : <>
          {/* [추가] 내 클립 화면에서만 마이페이지 내비게이션 표시 */}
          {mine && (
            <nav
              className="my-wowclip-tabs"
              aria-label="마이페이지 콘텐츠 메뉴"
            >
              {/* 마이페이지로 돌아가기 */}
              <Link
                to="/my"
                className="my-wowclip-back"
                aria-label="마이페이지로 돌아가기"
              >
                <img
                  src="/images/icon/icon-arrow_back_gray.svg"
                  alt=""
                />
              </Link>

              {/* 상단 콘텐츠 탭 */}
              {contentTabs.map((tab) => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={
                    tab.path === '/wowclip?view=mine'
                      ? 'active'
                      : ''
                  }
                >
                  {tab.title}
                </Link>
              ))}

              {/* 모바일 전용 제목 */}
              <h1 className="my-wowclip-mobile-title">
                내 와우 클립
              </h1>

            </nav>
          )}

          <div className="wowclip-heading">{!mine && <h1>와우 클립</h1>}<div className="wowclip-heading-actions"><button className="wowclip-button" type="button" onClick={() => { if (!user) navigate('/login'); else updateParams({ view: mine ? null : 'mine' }); }}>{mine ? '전체 클립' : '내 클립'}</button></div></div>
          <div className="wowclip-browse-controls"><ClipSort value={sort} onChange={(value) => updateParams({ sort: value })} /></div>
          {library.loading ? <div className="wowclip-state" role="status">클립을 불러오고 있어요.</div> : library.error ? <div className="wowclip-state" role="alert"><h2>클립을 불러오지 못했어요.</h2><p>{library.error}</p><button className="wowclip-button" type="button" onClick={library.reload}>다시 불러오기</button></div>
            : visible.length ? <div className="wowclip-grid">{visible.map((clip) => <ClipCard key={clip.id} clip={clip} protectedClip={isProtected(clip)} onOpen={(clip) => updateParams({ clip: clip.id })} />)}</div>
              : <div className="wowclip-state"><h2>{mine ? '아직 만든 클립이 없어요.' : '아직 공개된 클립이 없어요.'}</h2><p>원본 영상을 시청하다 마음에 드는 장면을 클립으로 만들어보세요.</p><Link className="wowclip-button wowclip-button--primary" to="/">작품 둘러보기</Link></div>}
        </>}
    {protectedClip && <ClipModal title="스포일러가 있어요" icon="spoiler" onClose={backToList}><div className="wowclip-spoiler-info"><strong>{contentTitle(selected.content)}</strong><p>{formatTime(selected.end - selected.start)} · {selected.author}</p></div><p>장면·제목·댓글을 가려두었어요.</p><div className="wowclip-modal-actions"><button className="wowclip-button wowclip-button--primary" type="button" onClick={() => setRevealed((previous) => ({ ownerId: owner.id, ids: [...(previous?.ownerId === owner.id ? previous.ids : []), selected.id] }))}>스포일러 열고 보기</button></div></ClipModal>}
    {deleteId && <ClipModal title="클립을 삭제할까요?" onClose={() => { if (!busy) setDeleteId(null); }}><p>삭제한 클립과 댓글은 다시 볼 수 없어요.</p><div className="wowclip-modal-actions"><button type="button" className="wowclip-button" disabled={busy} onClick={() => setDeleteId(null)}>취소</button><button type="button" className="wowclip-button wowclip-button--primary" disabled={busy} onClick={async () => { if (busy) return; setBusy(true); try { await library.removeClip(deleteId, owner.id); setDeleteId(null); backToList(); setNotice('클립을 삭제했어요.'); } catch (failure) { setNotice(failure.message); } finally { setBusy(false); } }}>{busy ? '삭제 중…' : '삭제'}</button></div></ClipModal>}
    {notice && <div className="wowclip-toast" role="status"><span>{notice}</span><IconButton icon="close" label="알림 닫기" onClick={() => setNotice('')} /></div>}
  </main>;
};

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { readClips } from '../../components/wowclip/clipStorage';
import { formatClipTime } from '../../components/wowclip/ClipRange';
import { createClipComment, deleteClipComment, subscribeClipComments } from '../../service/wowClipCommentService';
import { SAMPLE_CLIPS } from './WowClipGallery';
import './WowClipDetail.scss';

const dateText = (value) => value?.toDate?.()?.toLocaleString('ko-KR') || '방금 전';
export function WowClipDetail() {
  const { clipId } = useParams();
  const user = useAuthStore((s) => s.user);
  const clip = useMemo(() => [...readClips(user?.uid), ...SAMPLE_CLIPS].find((item) => item.id === clipId), [clipId, user?.uid]);
  const [comments, setComments] = useState([]);
  const [sort, setSort] = useState('new');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setComments([]); setError(''); setReplyTo(null); setRevealed(false);
    if (!clipId) return undefined;
    return subscribeClipComments(clipId, setComments, () => setError('댓글을 불러오지 못했습니다. Firebase 연결을 확인해주세요.'));
  }, [clipId]);
  const sorted = useMemo(() => [...comments].sort((a, b) => sort === 'old' ? (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)), [comments, sort]);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (busy) return;
    setBusy(true);
    try { await createClipComment(clipId, user, text, replyTo); setText(''); setReplyTo(null); }
    catch (err) { setError(err.message || '댓글 등록에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  const remove = async (comment) => {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    try { await deleteClipComment(comment, user); } catch (err) { setError(err.message || '삭제에 실패했습니다.'); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setNotice('링크를 복사했습니다.'); }
    catch { setNotice('링크를 복사하지 못했습니다.'); }
  };
  if (!clip || clip.status !== 'published' || clip.visibility !== 'public') return <main className="wowclip-detail wowclip-detail--missing"><h1>클립을 찾을 수 없습니다.</h1><Link to="/wowclip">와우 클립 목록으로</Link></main>;
  const duration = Math.max(0, (clip.endTime || 0) - (clip.startTime || 0));
  return (
    <main className="wowclip-detail">
      <div className="wowclip-detail__inner">
        <div className="wowclip-detail__top"><Link to="/wowclip">← 와우 클립</Link><button type="button" onClick={share}>↗ 링크 공유</button></div>
        <div className="wowclip-detail__layout">
          <section className="wowclip-detail__main" aria-label="클립 감상">
            <div className="wowclip-detail__player">
              <div className="wowclip-detail__scene"><span>WOW CLIP</span><strong>{clip.contentTitle || '와우 클립'}</strong>
                {clip.spoiler && !revealed && <div className="wowclip-detail__spoiler"><p>스포일러가 포함된 클립입니다.</p><button type="button" onClick={() => setRevealed(true)}>스포일러 보기</button></div>}
              </div>
              <div className="wowclip-detail__player-controls"><span aria-label="영상 재생 준비 중">▶</span><span>00:00 / {formatClipTime(duration)}</span><span className="wowclip-detail__player-spacer" /><span>영상 미리보기 준비 중</span></div>
            </div>
            <h1>{clip.title || '제목 없는 클립'}</h1>
            <div className="wowclip-detail__creator"><span className="wowclip-detail__avatar" aria-hidden="true">▶</span><div><strong>{clip.demo ? '예시 클립' : clip.ownerId === user?.uid ? '내 클립' : '제작자'}님의 클립</strong><p>{clip.demo ? 'Figma 예시 콘텐츠' : '브라우저에 저장된 게시 기록'} · 와우 클립에 공개</p></div><button type="button" onClick={share}>공유</button></div>
            {clip.description && <p className="wowclip-detail__description">{clip.description}</p>}
            <div className="wowclip-detail__source"><div><strong>{clip.contentTitle || '원본 영상'} · 시즌 {clip.seasonNumber || 1} · {clip.episodeNumber || 1}화</strong><p>{formatClipTime(clip.startTime || 0)}–{formatClipTime(clip.endTime || 0)}</p></div>{clip.type && clip.contentId && <Link to={`/watch/${encodeURIComponent(clip.type)}/${encodeURIComponent(clip.contentId)}`} state={{ startTime: clip.startTime }}>이 장면부터 본편 보기</Link>}</div>
            <p className="wowclip-detail__disclaimer">현재 클립은 영상 파일이 아닌 편집 정보만 저장되어 있어 실제 영상 재생은 지원하지 않습니다.</p>
          </section>
          <aside className="wowclip-detail__comments" aria-label="클립 댓글">
            <header className="wowclip-detail__comments-header"><h2>댓글 <span>{comments.length}</span></h2><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="댓글 정렬"><option value="new">최신순</option><option value="old">오래된순</option></select></header>
            <div className="wowclip-detail__comment-list" aria-live="polite">{sorted.length ? sorted.map((comment) => <article key={comment.id} className="wowclip-detail__comment"><div className="wowclip-detail__avatar" aria-hidden="true">▶</div><div className="wowclip-detail__comment-content"><p><strong>{comment.authorName || '사용자'}</strong><span> · {dateText(comment.createdAt)}</span></p>{comment.parentId && <small>답글</small>}<p className="wowclip-detail__comment-body">{comment.body}</p><div className="wowclip-detail__comment-actions"><button type="button" onClick={() => { setReplyTo(comment.id); setText(`@${comment.authorName || '사용자'} `); }}>답글</button>{user?.uid === comment.authorId && <button type="button" onClick={() => remove(comment)}>삭제</button>}</div></div></article>) : <p className="wowclip-detail__empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>}</div>
            <form className="wowclip-detail__composer" onSubmit={submit}><label htmlFor="wowclip-comment-input">댓글 남기기</label>{replyTo && <div className="wowclip-detail__reply">답글 작성 중 <button type="button" onClick={() => { setReplyTo(null); setText(''); }}>취소</button></div>}<textarea id="wowclip-comment-input" placeholder={user ? '이 장면은 어땠나요?' : '로그인 후 댓글을 남길 수 있습니다.'} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} disabled={!user || busy} rows={3} /><div className="wowclip-detail__compose-bottom"><span>{text.length}/500</span>{user ? <button type="submit" disabled={busy || !text.trim()}>{busy ? '등록 중…' : '등록'}</button> : <Link to="/login">로그인</Link>}</div>{error && <p className="wowclip-detail__error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form>
          </aside>
        </div>
      </div>
    </main>
  );
}

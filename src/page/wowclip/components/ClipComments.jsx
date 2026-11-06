import { useId, useRef, useState } from 'react';
import { relativeTime } from '../utils/wowClipData';
import { ClipIcon, ClipSort } from './WowClipUi';

const CommentForm = ({ onSubmit, onCancel, replyTo, inputRef }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const inputId = useId();
  const submit = (event) => {
    event.preventDefault();
    try {
      onSubmit(text);
      setText(''); setError('');
      if (replyTo) inputRef.current?.focus();
      else inputRef.current?.blur();
    } catch (failure) { setError(failure.message); }
  };
  return <form className="wowclip-comment-form" onSubmit={submit}>
    <div className="wowclip-comment-form-heading"><label htmlFor={inputId}>{replyTo ? `${replyTo.author}님에게 답글` : '댓글 남기기'}</label>{replyTo && <button type="button" onClick={() => { setText(''); setError(''); onCancel(); inputRef.current?.focus(); }} aria-label="답글 작성 취소">취소</button>}</div>
    <div className="wowclip-comment-input">
      <textarea ref={inputRef} id={inputId} maxLength={1000} value={text} rows={2} placeholder={replyTo ? '답글을 남겨보세요.' : '이 장면은 어땠나요?'} title="Enter로 등록 · Shift+Enter로 줄바꿈 · Esc로 취소" onChange={(event) => setText(event.target.value)} aria-invalid={!!error} aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (text.trim()) submit(event); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setText(''); setError(''); inputRef.current?.blur(); onCancel?.(); }
      }} />
    </div>
    <span className="sr-only" id={`${inputId}-hint`}>Enter로 등록, Shift+Enter로 줄바꿈, Esc로 취소합니다.</span>
    {error && <p className="wowclip-error" id={`${inputId}-error`} role="alert">{error}</p>}
  </form>;
};

export const ClipComments = ({ clip, owner, onAdd, onLike, notify, panel = false, onClose, onRefresh }) => {
  const [sort, setSort] = useState('popular');
  const [replyTo, setReplyTo] = useState(null);
  const [openReplies, setOpenReplies] = useState({});
  const inputRef = useRef(null);
  const comments = clip.comments.filter((comment) => !comment.parentId).sort((a, b) =>
    sort === 'popular' ? b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt) : sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt));
  const like = (id) => { try { onLike(clip.id, owner.id, id); } catch (failure) { notify(failure.message); } };
  const startReply = (comment) => {
    setReplyTo({ id: comment.parentId || comment.id, author: comment.author });
    inputRef.current?.focus();
  };
  const renderComment = (comment, nested = false) => {
    const liked = comment.likes.includes(owner.id);
    // 클릭 전후의 두 집계값이 같은 자릿수 영역을 쓰도록 미리 확보한다.
    const countWidth = Math.max(2, String(comment.likes.length + (liked ? 0 : 1)).length);
    return <article className={`wowclip-comment${nested ? ' wowclip-comment--reply' : ''}`} key={comment.id}>
      <img className="wowclip-avatar" src={comment.avatar || '/images/profile.svg'} alt="" width="24" height="24" />
      <div><p className="wowclip-comment-author">{comment.author} · {relativeTime(comment.createdAt)}</p><p className="wowclip-comment-text">{comment.text}</p>
        <div className="wowclip-comment-actions"><button type="button" className="wowclip-comment-like" aria-label={`댓글 공감 ${comment.likes.length}`} aria-pressed={liked} onClick={() => like(comment.id)}><ClipIcon name="like" size={18} filled={liked} /><span className="wowclip-comment-like-count" style={{ width: `${countWidth}ch` }}>{comment.likes.length}</span></button><button type="button" onClick={() => startReply(comment)}>답글</button></div>
      </div>
    </article>;
  };
  const form = <CommentForm inputRef={inputRef} replyTo={replyTo} onCancel={() => setReplyTo(null)} onSubmit={(text) => {
    onAdd(clip.id, text, owner, replyTo?.id);
    if (replyTo) setOpenReplies((previous) => ({ ...previous, [replyTo.id]: true }));
    setReplyTo(null);
  }} />;
  return <aside className={'wowclip-comments' + (panel ? ' is-panel' : '')} aria-label="클립 댓글">
    <div className="wowclip-comments-heading"><h2>댓글 <span>{clip.comments.length}</span></h2>{panel ? <div className="wowclip-comment-panel-tools"><button type="button" aria-label="댓글 새로고침" onClick={onRefresh}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6" /></svg></button><button type="button" aria-label="댓글 닫기" onClick={onClose}><ClipIcon name="close" /></button></div> : <ClipSort value={sort} onChange={setSort} comments />}</div>
    {panel && <><div className="wowclip-panel-sort" role="tablist" aria-label="댓글 정렬">{[['popular', '인기순'], ['recent', '최신순'], ['oldest', '등록순']].map(([value, label]) => <button type="button" key={value} role="tab" aria-selected={sort === value} onClick={() => setSort(value)}>{label}</button>)}</div>{form}</>}
    <div className="wowclip-comments-list" role="region" aria-label="댓글 목록" tabIndex={0}>
      {comments.length === 0 && <p className="wowclip-comments-empty">첫 댓글을 남겨보세요.</p>}
      {comments.map((comment) => {
        const replies = clip.comments.filter((reply) => reply.parentId === comment.id);
        const repliesId = `wowclip-replies-${clip.id}-${comment.id}`;
        return <div className={`wowclip-thread${replies.length ? ' has-replies' : ''}`} key={comment.id}>{renderComment(comment)}
          {openReplies[comment.id] && <div id={repliesId} className="wowclip-replies">{replies.map((reply) => renderComment(reply, true))}</div>}
          {replies.length > 0 && <button className="wowclip-replies-toggle" type="button" aria-expanded={!!openReplies[comment.id]} aria-controls={openReplies[comment.id] ? repliesId : undefined} onClick={() => setOpenReplies((previous) => ({ ...previous, [comment.id]: !previous[comment.id] }))}>답글 {replies.length}개 {openReplies[comment.id] ? '접기' : '보기'}<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={openReplies[comment.id] ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg></button>}
        </div>;
      })}
    </div>
    {!panel && form}
  </aside>;
};


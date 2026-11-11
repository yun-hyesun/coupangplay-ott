import { useEffect, useId, useRef, useState } from 'react';
import CommonIcon from '../../../components/common/CommonIcon';
import { relativeTime } from '../utils/wowClipData';
import { ClipIcon, ClipModal, ClipSort } from './WowClipUi';
import { clipLikeCount, clipIsLiked } from '../utils/cloudClipData';
import { CLIP_COMMENT_LIMIT, clipCommentLength } from '../utils/clipCommentText';

const CommentForm = ({ onSubmit, onCancel, replyTo, inputRef, editing = false, initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const localRef = useRef(null);
  const field = inputRef ?? localRef;
  const inputId = useId();
  const length = clipCommentLength(text);
  const limitError = length > CLIP_COMMENT_LIMIT ? `${CLIP_COMMENT_LIMIT}자 이내로 줄여 주세요.` : '';
  const fieldError = limitError || error;
  const canSubmit = !!text.trim() && !limitError && (!editing || text.trim() !== initialText.trim());

  useEffect(() => { if (editing) field.current?.focus(); }, [editing, field]);

  const cancel = () => {
    setText(initialText);
    setError('');
    onCancel?.();
  };
  const submit = async (event) => {
    event.preventDefault();
    if (sendingRef.current || !canSubmit) return;
    sendingRef.current = true; setSending(true);
    try {
      await onSubmit(text);
      setText(''); setError('');
      if (replyTo) field.current?.focus();
      else field.current?.blur();
    } catch (failure) { setError(failure.message); }
    finally { sendingRef.current = false; setSending(false); }
  };
  return <form className={`wowclip-comment-form${editing ? ' wowclip-comment-form--edit' : ''}`} onSubmit={submit}>
    <div className="wowclip-comment-form-heading">
      <label htmlFor={inputId}>{editing ? '댓글 수정' : replyTo ? `${replyTo.author}님에게 답글` : '댓글 남기기'}</label>
      <span className={`wowclip-comment-length${limitError ? ' is-over-limit' : ''}`}>{length} / {CLIP_COMMENT_LIMIT}</span>
      {replyTo && <button type="button" disabled={sending} onClick={() => { cancel(); field.current?.focus(); }} aria-label="답글 작성 취소">취소</button>}
    </div>
    <div className="wowclip-comment-input">
      <textarea ref={field} id={inputId} value={text} rows={2} readOnly={sending} aria-busy={sending} placeholder={replyTo ? '답글을 남겨보세요.' : '이 장면은 어땠나요?'} title={`Enter로 ${editing ? '저장' : '등록'} · Shift+Enter로 줄바꿈 · Esc로 취소`} onChange={(event) => { setText(event.target.value); setError(''); }} aria-invalid={!!fieldError} aria-describedby={`${inputId}-hint${fieldError ? ` ${inputId}-error` : ''}`} onKeyDown={(event) => {
        if (sendingRef.current) return;
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter' && !event.shiftKey) submit(event);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); field.current?.blur(); cancel(); }
      }} />
    </div>
    <span className="sr-only" id={`${inputId}-hint`}>최대 {CLIP_COMMENT_LIMIT}자. Enter로 {editing ? '저장' : '등록'}, Shift+Enter로 줄바꿈, Esc로 취소합니다.</span>
    {sending && <span className="sr-only" role="status">댓글을 저장하고 있어요.</span>}
    {fieldError && <p className="wowclip-error" id={`${inputId}-error`} role="alert">{fieldError}</p>}
    {editing && <div className="wowclip-comment-actions wowclip-comment-edit-actions">
      <button type="button" disabled={sending} onClick={cancel}>취소</button>
      <button type="submit" disabled={sending || !canSubmit}>{sending ? '저장 중…' : '저장'}</button>
    </div>}
  </form>;
};

const CommentOptions = ({ reply, onEdit, onRemove, editDisabled }) => {
  const menuId = useId();
  const menuRef = useRef(null);
  const select = (action) => {
    menuRef.current?.hidePopover?.();
    action();
  };

  return <div className="wowclip-comment-more">
    <button type="button" className="wowclip-icon-button wowclip-comment-more-button"
      aria-label={reply ? '답글 더보기' : '댓글 더보기'} popoverTarget={menuId}>
      <CommonIcon name="more-horizontal" size={20} />
    </button>
    <div ref={menuRef} id={menuId} popover="auto" className="wowclip-comment-menu" role="group" aria-label={reply ? '답글 관리' : '댓글 관리'}>
      {onEdit && <button type="button" disabled={editDisabled} onClick={() => select(onEdit)}>수정</button>}
      {onRemove && <button type="button" onClick={() => select(onRemove)}>삭제</button>}
    </div>
  </div>;
};

export const ClipComments = ({ clip, owner, userUid, onAdd, onLike, onEdit, onRemove, notify, panel = false, onClose, onRefresh, loading = false, error = '' }) => {
  const [sort, setSort] = useState('popular');
  const [replyTo, setReplyTo] = useState(null);
  const [openReplies, setOpenReplies] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const inputRef = useRef(null);
  const deletingRef = useRef(false);
  const canManage = (comment) => !!userUid && comment.authorUid === userUid && !comment.deleted;
  const editingComment = clip.comments.find((comment) => comment.id === editingId && canManage(comment));
  const pendingDelete = clip.comments.find((comment) => comment.id === deletingId && canManage(comment));
  const commentCount = clip.commentCount ?? clip.comments.filter((comment) => !comment.deleted).length;
  const repliesByParent = new Map();
  for (const comment of clip.comments) {
    if (!comment.deleted && comment.parentId) {
      const replies = repliesByParent.get(comment.parentId) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parentId, replies);
    }
  }
  const rankLikes = (comment) => comment.deleted ? 0 : clipLikeCount(comment);
  const comments = clip.comments.filter((comment) => !comment.parentId && (!comment.deleted || repliesByParent.has(comment.id))).sort((a, b) => {
    const newest = new Date(b.createdAt) - new Date(a.createdAt);
    return sort === 'popular' ? rankLikes(b) - rankLikes(a) || newest : newest;
  });
  const like = async (id) => { try { await onLike(clip.id, owner.id, id); } catch (failure) { notify(failure.message); } };
  const startReply = (comment) => {
    setReplyTo({ id: comment.parentId || comment.id, author: comment.author });
    inputRef.current?.focus();
  };
  const closeEdit = () => { setEditingId(null); inputRef.current?.focus(); };
  const closeDelete = () => { if (!deletingRef.current) { setDeletingId(null); setDeleteError(''); } };
  const remove = async () => {
    if (!pendingDelete || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      await onRemove(clip.id, pendingDelete.id);
      setDeletingId(null);
      notify?.('댓글을 삭제했어요.');
    } catch (failure) { setDeleteError(failure.message); }
    finally { deletingRef.current = false; setDeleting(false); }
  };
  const renderComment = (comment, nested = false, canReply = true) => {
    if (comment.deleted) return <article className="wowclip-comment" key={comment.id}>
      <img className="wowclip-avatar" src="/images/profile.svg" alt="" width="24" height="24" />
      <div><p className="wowclip-comment-text wowclip-comment-deleted">삭제된 댓글이에요.</p></div>
    </article>;
    const own = canManage(comment);
    const editing = own && editingId === comment.id;
    const liked = clipIsLiked(comment, owner.id);
    const likes = clipLikeCount(comment);
    // 클릭 전후의 두 집계값이 같은 자릿수 영역을 쓰도록 미리 확보한다.
    const countWidth = Math.max(2, String(likes + (liked ? 0 : 1)).length);
    return <article className={`wowclip-comment${nested ? ' wowclip-comment--reply' : ''}`} key={comment.id}>
      <img className="wowclip-avatar" src={comment.avatar || '/images/profile.svg'} alt="" width="24" height="24" />
      <div><p className="wowclip-comment-author">{comment.author} · {relativeTime(comment.createdAt)}{comment.editedAt && ' · 수정됨'}</p>
      {editing ? <CommentForm editing initialText={comment.text} onCancel={closeEdit} onSubmit={async (text) => {
        await onEdit(clip.id, comment.id, text);
        closeEdit();
        notify?.('댓글을 수정했어요.');
      }} /> : <>
        <p className="wowclip-comment-text">{comment.text}</p>
        <div className="wowclip-comment-actions">
          <button type="button" className="wowclip-comment-like" aria-label={`댓글 공감 ${likes}`} aria-pressed={liked} onClick={() => like(comment.id)}>
            <ClipIcon name="like" size={18} filled={liked} />
            <span className="wowclip-comment-like-count" style={{ width: `${countWidth}ch` }}>{likes}</span>
          </button>
          {canReply && <button type="button" onClick={() => startReply(comment)}>답글</button>}
        </div>
      </>}
      </div>
      {own && !editing && (onEdit || onRemove) && <CommentOptions reply={nested} editDisabled={!!editingComment}
        onEdit={onEdit && (() => setEditingId(comment.id))}
        onRemove={onRemove && (() => { setDeleteError(''); setDeletingId(comment.id); })} />}
    </article>;
  };
  const form = <CommentForm inputRef={inputRef} replyTo={replyTo} onCancel={() => setReplyTo(null)} onSubmit={async (text) => {
    await onAdd(clip.id, text, owner, replyTo?.id);
    if (replyTo) setOpenReplies((previous) => ({ ...previous, [replyTo.id]: true }));
    setReplyTo(null);
  }} />;
  return <aside className={'wowclip-comments' + (panel ? ' is-panel' : '')} aria-label="클립 댓글">
    <div className="wowclip-comments-heading">
      <h2>댓글 <span>{commentCount}</span></h2>
      {panel ? <div className="wowclip-comment-panel-tools">
        <button type="button" aria-label="댓글 새로고침" onClick={onRefresh}><CommonIcon name="refresh" size={18} /></button>
        <button type="button" aria-label="댓글 닫기" onClick={onClose}><ClipIcon name="close" /></button>
      </div> : <ClipSort value={sort} onChange={setSort} comments />}
    </div>
    {panel && <><div className="wowclip-panel-sort" role="tablist" aria-label="댓글 정렬">{[['popular', '인기순'], ['recent', '최신순']].map(([value, label]) => <button type="button" key={value} role="tab" aria-selected={sort === value} onClick={() => setSort(value)}>{label}</button>)}</div>{form}</>}
    <div className="wowclip-comments-list" role="region" aria-label="댓글 목록" tabIndex={0}>
      {loading && <p role="status">댓글을 불러오고 있어요.</p>}
      {error && <p className="wowclip-error" role="alert">{error}</p>}
      {!loading && !error && comments.length === 0 && <p className="wowclip-comments-empty">첫 댓글을 남겨보세요.</p>}
      {comments.map((comment) => {
        const replies = repliesByParent.get(comment.id) ?? [];
        const repliesId = `wowclip-replies-${clip.id}-${comment.id}`;
        return <div className={`wowclip-thread${replies.length ? ' has-replies' : ''}`} key={comment.id}>{renderComment(comment)}
          {replies.length > 0 && openReplies[comment.id] && <div id={repliesId} className="wowclip-replies">{replies.map((reply) => renderComment(reply, true, !comment.deleted))}</div>}
          {replies.length > 0 && <button className="wowclip-replies-toggle" type="button" disabled={editingComment?.parentId === comment.id} aria-expanded={!!openReplies[comment.id]} aria-controls={openReplies[comment.id] ? repliesId : undefined} onClick={() => setOpenReplies((previous) => ({ ...previous, [comment.id]: !previous[comment.id] }))}>
            답글 {replies.length}개 {openReplies[comment.id] ? '접기' : '보기'}<CommonIcon name={openReplies[comment.id] ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>}
        </div>;
      })}
    </div>
    {!panel && form}
    {pendingDelete && <ClipModal title={pendingDelete.parentId ? '답글을 삭제할까요?' : '댓글을 삭제할까요?'} onClose={closeDelete}>
      <p>삭제한 내용은 복구할 수 없어요.</p>
      {repliesByParent.has(pendingDelete.id) && <p>이미 달린 답글은 그대로 보여요.</p>}
      {deleteError && <p className="wowclip-error" role="alert">{deleteError}</p>}
      <div className="wowclip-modal-actions">
        <button className="wowclip-button" type="button" disabled={deleting} onClick={closeDelete}>취소</button>
        <button className="wowclip-button wowclip-button--primary" type="button" disabled={deleting} onClick={remove}>{deleting ? '삭제 중…' : '삭제'}</button>
      </div>
    </ClipModal>}
  </aside>;
};


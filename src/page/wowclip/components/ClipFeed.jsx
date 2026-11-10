import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CommonIcon from '../../../components/common/CommonIcon';
import { ClipPlayer } from './ClipPlayer';
import { ClipComments } from './ClipComments';
import { ClipIcon } from './WowClipUi';
import { clipPreview, contentTitle, relativeTime } from '../utils/wowClipData';
import { clipEpisodeLabel, clipWatchState } from '../utils/clipSource';
import { clipLikeCount, clipIsLiked } from '../utils/cloudClipData';
import '../scss/ClipFeed.scss';

export const ClipFeed = ({ clips, selectedId, owner, isProtected, onSelect, onBack, onLike, onCopy, onDelete, onAdd, onCommentLike, onCommentEdit, onCommentRemove, onRefresh, onView, notify, commentsError, commentsLoading, userUid }) => {
  const [order] = useState(() => clips.map((clip) => clip.id));
  const ordered = useMemo(() => {
    const byId = new Map(clips.map((clip) => [clip.id, clip]));
    return [...order.map((id) => byId.get(id)).filter(Boolean), ...clips.filter((clip) => !order.includes(clip.id))];
  }, [clips, order]);
  const scrollRef = useRef(null);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [muted, setMuted] = useState(true);
  const signature = ordered.map((clip) => clip.id).join('|');
  const index = ordered.findIndex((clip) => clip.id === selectedId);
  const selected = ordered[index];
  useEffect(() => { selectedRef.current = selectedId; selectRef.current = onSelect; }, [selectedId, onSelect]);
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const target = [...root.children].find((element) => element.dataset.clipId === selectedId);
    if (target && Math.abs(target.offsetTop - root.scrollTop) > root.clientHeight * .5) root.scrollTo({ top: target.offsetTop, behavior: 'instant' });
  }, [selectedId, signature]);
  useEffect(() => {
    const root = scrollRef.current;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.filter((item) => item.isIntersecting && item.intersectionRatio >= .6).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = entry?.target.dataset.clipId;
      if (id && id !== selectedRef.current) { selectedRef.current = id; selectRef.current(id); }
    }, { root, threshold: [.6] });
    [...root.children].forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [signature]);
  const goTo = (next) => {
    const root = scrollRef.current;
    const target = root.children[Math.max(0, Math.min(ordered.length - 1, next))];
    if (target) root.scrollTo({ top: target.offsetTop, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const perform = async (action) => {
    try {
      await action();
      return true;
    } catch (failure) {
      notify(failure.message);
      return false;
    }
  };
  return <div className={'wowclip-shortfeed' + (commentsOpen ? ' has-comments' : '')}>
    <div className="wowclip-feed-toolbar"><button type="button" className="wowclip-back" onClick={onBack}><ClipIcon name="back" />와우 클립</button></div>
    <div className="wowclip-feed-body"><div className="wowclip-feed-column">
      <div className="wowclip-feed-scroll" ref={scrollRef} role="region" aria-label="클립 연속 감상" tabIndex={0} onKeyDown={(event) => {
        if (event.target.closest('input, textarea, select') || event.nativeEvent.isComposing) return;
        if (['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(index + (['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1)); }
        if (event.key === 'Escape') { if (commentsOpen) setCommentsOpen(false); else onBack(); }
      }}>
        {ordered.map((clip) => {
          const active = clip.id === selectedId;
          const protectedClip = isProtected(clip);
          const { image, title } = clipPreview(clip, protectedClip);
          const episodeLabel = clipEpisodeLabel(clip);
          const commentCount = clip.commentCount ?? clip.comments.filter((comment) => !comment.deleted).length;
          return <article className="wowclip-feed-item" data-clip-id={clip.id} key={clip.id} aria-label={protectedClip ? '스포일러 보호된 클립' : clip.title}>
            <div className="wowclip-feed-stage">
              {active && !protectedClip ? <ClipPlayer key={clip.id} clip={clip} autoPlay loop compact muted={muted} onMutedChange={setMuted} onFirstPlay={() => perform(() => onView(clip.id))} /> : <div className="wowclip-feed-poster">{image && <img src={image} alt="" />}{protectedClip && <span><ClipIcon name="spoiler" />스포일러가 있어요</span>}</div>}
              <div className="wowclip-feed-info">
                <div className="wowclip-feed-author"><img src={clip.avatar || '/images/profile.svg'} alt="" width="32" height="32" /><strong>{clip.author}</strong>{clip.ownerId === owner.id && <span>내 클립</span>}</div>
                <h2>{title}</h2>
                <p>{relativeTime(clip.createdAt)}</p>
                <div className="wowclip-feed-source-row">
                  {!protectedClip && <Link className="wowclip-feed-source" to={'/watch/' + clip.content.media_type + '/' + clip.content.id} state={clipWatchState(clip)}><ClipIcon name="play" size={16} />풀영상 보러가기</Link>}
                  <span className="wowclip-feed-category"><span className="wowclip-feed-source-title">{contentTitle(clip.content)}</span>{episodeLabel && <span className="wowclip-feed-episode">{episodeLabel}</span>}</span>
                </div>
              </div>
            </div>
            <div className="wowclip-feed-actions">
              <button type="button" aria-label={'클립 공감 ' + clipLikeCount(clip)} aria-pressed={clipIsLiked(clip, owner.id)} onClick={() => perform(() => onLike(clip.id, owner.id))}><span><ClipIcon name="heart" filled={clipIsLiked(clip, owner.id)} /></span><small>{clipLikeCount(clip)}</small></button>
              <button type="button" aria-label={'댓글 ' + commentCount} aria-expanded={active && commentsOpen} onClick={() => { if (!active) onSelect(clip.id); setCommentsOpen((open) => !open); }}><span><CommonIcon name="chat" /></span><small>{commentCount || '댓글'}</small></button>
              <button type="button" aria-label="공유" onClick={() => onCopy(clip)}><span><CommonIcon name="share" /></span><small>공유</small></button>
              <div className="wowclip-feed-more"><button type="button" aria-label="더보기" aria-expanded={menuId === clip.id} onClick={() => setMenuId(menuId === clip.id ? null : clip.id)}><span><CommonIcon name="more-vertical" /></span></button>{menuId === clip.id && <div className="wowclip-feed-menu"><button type="button" onClick={() => { onCopy(clip); setMenuId(null); }}>링크 복사</button>{clip.authorUid === userUid && <button type="button" onClick={() => { onDelete(clip.id); setMenuId(null); }}>클립 삭제</button>}</div>}</div>
            </div>
          </article>;
        })}
      </div>
      <div className="wowclip-feed-navigation">
        <button type="button" aria-label="이전 클립" disabled={index <= 0} onClick={() => goTo(index - 1)}><CommonIcon name="chevron-up" /></button>
        <button type="button" aria-label="다음 클립" disabled={index >= ordered.length - 1} onClick={() => goTo(index + 1)}><CommonIcon name="chevron-down" /></button>
      </div>
    </div>
      {commentsOpen && selected && !isProtected(selected) && (
        <ClipComments
          key={`${selected.id}:${owner.id}`}
          clip={selected}
          owner={owner}
          userUid={userUid}
          onAdd={onAdd}
          onLike={onCommentLike}
          onEdit={onCommentEdit}
          onRemove={onCommentRemove}
          notify={notify}
          panel
          loading={commentsLoading}
          error={commentsError}
          onClose={() => setCommentsOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  </div>;
};

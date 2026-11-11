import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../../firebase/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { likeReviewOnce, subscribeReviewLike } from '../../service/reviewService';
import CommonIcon from '../../components/common/CommonIcon';
import { Popup } from '../../components/common/Popup';

// 별점
const StarIcon = ({ size = 14 }) => <CommonIcon name="star" size={size} />;
// 별 하나의 좌우를 각각 0.5점 단위로 선택합니다.
const RatingStars = ({ value, onChange, size = 28 }) => (
  <div className={`detail-rating-stars${onChange ? ' detail-rating-stars--interactive' : ''}`}
    role={onChange ? 'group' : 'img'}
    aria-label={`5점 만점에 ${Number(value).toFixed(1)}점`}>
    {Array.from({ length: 5 }, (_, index) => {
      const fill = Math.max(0, Math.min(1, value - index));
      return <span className="detail-rating-stars__star"
        key={index}
        style={{ width: size, height: size }}>
        <CommonIcon
          name="star-outline"
          size={size} />
        {fill > 0 &&
          <span className="detail-rating-stars__fill" aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
              pointerEvents: 'none'
            }}
          >
            <CommonIcon name="star" size={size} />
          </span>
        }
        {onChange && <>
          <button className="detail-rating-stars__hit detail-rating-stars__hit--left" type="button" aria-label={`${index + 0.5}점 선택`} aria-pressed={value === index + 0.5} onClick={() => onChange(Math.max(1, index + 0.5))} />
          <button className="detail-rating-stars__hit detail-rating-stars__hit--right" type="button" aria-label={`${index + 1}점 선택`} aria-pressed={value === index + 1} onClick={() => onChange(index + 1)} />
        </>}
      </span>;
    })}
  </div>
);

const ActionIcon = ({ name }) => <CommonIcon name={name} size={20} />;

// 리뷰 데이터는 별도 API/스토어 연결 전까지 비워 둡니다.
// 데이터 형식: { id, episodeId, author, content, rating, likes, createdAt }

// 리뷰
const REVIEWS = [];

const Chevron = ({ up = false }) => <CommonIcon name={up ? 'chevron-up' : 'chevron-down'} />;

// 리뷰 필터
const ReviewSort = ({ sort, onSort, spoilerHidden, onToggleSpoiler }) => (
  <div className="detail-review-sort" aria-label="리뷰 정렬">
    <button type="button" className={sort === 'popular' ? 'is-active' : ''} onClick={() => onSort('popular')}>인기순</button>
    <span aria-hidden="true">·</span>
    <button type="button" className={sort === 'recent' ? 'is-active' : ''} onClick={() => onSort('recent')}>최신순</button>
    <span aria-hidden="true">|</span>
    <button type="button" aria-pressed={spoilerHidden} className={spoilerHidden ? 'is-active' : ''} onClick={onToggleSpoiler}>스포일러 숨김</button>
  </div>
);

const sortReviews = (reviews, sort) => [...reviews].sort((a, b) => sort === 'popular'
  ? (Number(b.likes) || 0) - (Number(a.likes) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0)
  : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

// 회차별 리뷰
const EpisodeReviews = ({ episode, reviews, onOpenPopup }) => {
  const [sort, setSort] = useState('popular');
  const [spoilerHidden, setSpoilerHidden] = useState(true);
  const visible = sortReviews(reviews.filter(review => !spoilerHidden || !review.spoiler), sort);

  return <div className="episode-item__reviews" id={`episode-reviews-${episode.id}`}>
    <div className="episode-item__reviews-head">
      <h4>{episode.episode_number}화 리뷰 {reviews.length}</h4>
      <ReviewSort sort={sort} onSort={setSort} spoilerHidden={spoilerHidden} onToggleSpoiler={() => setSpoilerHidden(v => !v)} />
    </div>
    {visible.length ? <div className="episode-item__review-list">{visible.slice(0, 3).map(review => <ReviewItem key={review.id} review={review} />)}</div> : <p className="detail-empty">등록된 리뷰가 없습니다.</p>}
    <button className="detail-review-action" type="button" onClick={onOpenPopup}>리뷰 전체보기 <Chevron /></button>
  </div>;
};

// 리뷰 항목
const ReviewItem = ({ review, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(review.content);
  const uid = useAuthStore(state => state.user?.uid);
  const [likeState, setLikeState] = useState({ uid: null, path: null, liked: false, ready: false });
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState('');
  const likeLock = useRef(false);
  const path = review.documentPath;
  useEffect(() => {
    let active = true;
    setLikeError('');
    setLikeState({ uid, path, liked: false, ready: false });
    if (!uid || !path) return () => { active = false; };
    const unsubscribe = subscribeReviewLike(path, uid, liked => {
      if (active) setLikeState({ uid, path, liked, ready: true });
    }, () => {
      if (active) setLikeError('좋아요 상태를 불러오지 못했습니다. 연결 및 Firestore 규칙을 확인해 주세요.');
    });
    return () => { active = false; unsubscribe(); };
  }, [uid, path]);
  const currentLike = likeState.uid === uid && likeState.path === path;
  const liked = !!uid && currentLike && likeState.liked;
  const handleLike = async () => {
    if (!uid) { setLikeError('좋아요를 누르려면 로그인해 주세요.'); return; }
    if (likeLock.current || liked || !currentLike || !likeState.ready) return;
    likeLock.current = true; setLiking(true); setLikeError('');
    try {
      await likeReviewOnce(path);
      if (auth.currentUser?.uid === uid) setLikeState({ uid, path, liked: true, ready: true });
    } catch (error) {
      if (auth.currentUser?.uid === uid) setLikeError(error.code === 'permission-denied'
        ? '좋아요를 저장하지 못했습니다. Firestore 규칙을 확인해 주세요.' : error.message || '좋아요를 저장하지 못했습니다.');
    } finally { likeLock.current = false; setLiking(false); }
  };
  const mine = uid === review.authorId;
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 1));

  return <article className="detail-review-item">
    <div className="detail-review-item__author"><strong>{review.author}</strong><span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : ''}</span></div>
    {editing ? <div className="detail-review-popup__compose"><textarea aria-label="리뷰 수정" value={editText} maxLength={2000} onChange={e => setEditText(e.target.value)} /><button type="button" onClick={async () => { if (await onEdit(review.id, editText)) setEditing(false); }}>저장</button><button type="button" onClick={() => setEditing(false)}>취소</button></div> : <p>{review.content}</p>}
    {mine && onEdit && onDelete && <div className="detail-review-item__meta"><button type="button" onClick={() => setEditing(true)}>수정</button><button type="button" onClick={() => onDelete(review.id)}>삭제</button></div>}
    <div className="detail-review-item__meta"><button type="button" className={`detail-review-like${liked ? ' is-liked' : ''}`}
      aria-pressed={liked} aria-label={`좋아요 ${review.likes ?? 0}개${liked ? ', 이미 참여함' : ''}`}
      disabled={liking || liked || !path || (!!uid && (!currentLike || !likeState.ready))}
      onClick={handleLike}>좋아요 <span>{review.likes ?? 0}</span></button><span aria-hidden="true">·</span><span>평점</span><RatingStars value={rating} size={14} /><span>{rating.toFixed(1)} / 5</span></div>
    {likeError && <p className="detail-review-like-error" role="alert">{likeError}</p>}
  </article>;
};

// 리뷰 팝업
const ReviewPopup = ({ episode, reviews, onClose, onSave, onEdit, onDelete, error }) => {
  const [sort, setSort] = useState('popular');
  const [spoilerHidden, setSpoilerHidden] = useState(true);
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState(5);
  const [spoiler, setSpoiler] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const sorted = useMemo(() => sortReviews(reviews.filter(review => !spoilerHidden || !review.spoiler), sort), [reviews, sort, spoilerHidden]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || deleteReviewId !== null || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, deleteReviewId]);

  return <div className="detail-review-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="detail-review-popup" role="dialog" aria-modal="true" aria-labelledby="detail-review-popup-title">
      <div className="detail-review-popup__head"><h2 id="detail-review-popup-title">{episode.reviewTitle || `${episode.episode_number}화 리뷰`}</h2><ReviewSort sort={sort} onSort={setSort} spoilerHidden={spoilerHidden} onToggleSpoiler={() => setSpoilerHidden(v => !v)} /></div>
      <div className={`detail-review-popup__compose detail-review-popup__compose--draft${draft.trim() ? ' has-content' : ''}`}>
        <div className="detail-review-popup__compose-heading">
          <label htmlFor="detail-review-draft">리뷰 작성</label>
          <span id="detail-review-count">{draft.length} / 2,000자</span>
        </div>
        <textarea id="detail-review-draft" aria-describedby="detail-review-count" value={draft} maxLength={2000}
          onChange={event => setDraft(event.target.value)} disabled={saving}
          placeholder={episode.reviewPlaceholder || '이 회차에 대한 감상을 남겨주세요.'} rows={3} />
        <div className="detail-review-popup__compose-toolbar">
          <div className="detail-review-popup__rating"><span>평점</span>
            <RatingStars value={rating} onChange={saving ? undefined : setRating} />
            <output aria-live="polite">{rating.toFixed(1)} / 5</output>
          </div>
          <button className="detail-review-popup__submit" type="button" disabled={saving || !draft.trim()} onClick={async () => {
            if (saving || !draft.trim()) return;
            setSaving(true);
            try { if (await onSave(draft, rating, spoiler)) setDraft(''); }
            finally { setSaving(false); }
          }}>{saving ? '등록 중…' : '리뷰 남기기'}</button>
        </div>
        <label className="detail-review-popup__spoiler"><input type="checkbox" checked={spoiler} disabled={saving} onChange={e => setSpoiler(e.target.checked)} /> 스포일러 포함</label>
      </div>
      {error && <p className="detail-empty" role="alert">{error}</p>}
      <div className="detail-review-popup__list" tabIndex="0">{sorted.length ? sorted.slice(0, 5).map(review => <ReviewItem key={review.id} review={review} onEdit={onEdit} onDelete={reviewId => { setDeleteError(''); setDeleteReviewId(reviewId); }} />) : <p className="detail-empty">등록된 리뷰가 없습니다.</p>}</div>
      <button className="detail-review-popup__close" type="button" onClick={onClose}>닫기</button>
    </section>
    {deleteReviewId !== null && <Popup title="리뷰를 삭제하시겠습니까?"
      description={'작성한 리뷰를 삭제합니다.\n삭제한 리뷰는 복구할 수 없습니다.'}
      onClose={() => setDeleteReviewId(null)} confirmText="삭제" error={deleteError}
      onConfirm={async () => {
        const deleted = await onDelete(deleteReviewId);
        if (!deleted) { setDeleteError('리뷰를 삭제하지 못했습니다. 다시 시도해 주세요.'); return false; }
        return true;
      }} />}
  </div>;
};


export { StarIcon, ActionIcon, Chevron, EpisodeReviews, ReviewPopup, REVIEWS };

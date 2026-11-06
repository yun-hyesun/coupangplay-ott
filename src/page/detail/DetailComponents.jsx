import { useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebase/firebase';

// 별점
const StarIcon = ({ size = 14 }) => <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.1 6.3 7 1-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-1z" /></svg>;
// 별 하나의 좌우를 각각 0.5점 단위로 선택합니다.
const RatingStars = ({ value, onChange, size = 28 }) => (
  <div className={`detail-rating-stars${onChange ? ' detail-rating-stars--interactive' : ''}`} role={onChange ? 'group' : 'img'} aria-label={`5점 만점에 ${Number(value).toFixed(1)}점`}>
    {Array.from({ length: 5 }, (_, index) => {
      const fill = Math.max(0, Math.min(1, value - index));
      return <span className="detail-rating-stars__star" key={index} style={{ width: size, height: size }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinejoin="round">
          <path d="m12 2 3.1 6.3 7 1-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-1z" />
          {fill > 0 && <svg x="0" y="0" width={fill === 0.5 ? 12 : 24} height="24" viewBox={fill === 0.5 ? '0 0 12 24' : '0 0 24 24'} overflow="hidden"><path d="m12 2 3.1 6.3 7 1-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-1z" fill="#ffd13c" stroke="#ffd13c" strokeWidth="2" /></svg>}
        </svg>
        {onChange && <>
          <button className="detail-rating-stars__hit detail-rating-stars__hit--left" type="button" aria-label={`${index + 0.5}점 선택`} aria-pressed={value === index + 0.5} onClick={() => onChange(Math.max(1, index + 0.5))} />
          <button className="detail-rating-stars__hit detail-rating-stars__hit--right" type="button" aria-label={`${index + 1}점 선택`} aria-pressed={value === index + 1} onClick={() => onChange(index + 1)} />
        </>}
      </span>;
    })}
  </div>
);

const ActionIcon = ({ name }) => name === 'share' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>;

// 리뷰 데이터는 별도 API/스토어 연결 전까지 비워 둡니다.
// 데이터 형식: { id, episodeId, author, content, rating, likes, createdAt }

// 리뷰
const REVIEWS = [];

const Chevron = ({ up = false }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'rotate(180deg)' : undefined }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

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
  const mine = auth.currentUser?.uid === review.authorId;
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 1));
  return <article className="detail-review-item">
    <div className="detail-review-item__author"><strong>{review.author}</strong><span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : ''}</span></div>
    {editing ? <div className="detail-review-popup__compose"><textarea aria-label="리뷰 수정" value={editText} maxLength={2000} onChange={e => setEditText(e.target.value)} /><button type="button" onClick={async () => { if (await onEdit(review.id, editText)) setEditing(false); }}>저장</button><button type="button" onClick={() => setEditing(false)}>취소</button></div> : <p>{review.content}</p>}
    {mine && onEdit && onDelete && <div className="detail-review-item__meta"><button type="button" onClick={() => setEditing(true)}>수정</button><button type="button" onClick={() => { if (window.confirm('리뷰를 삭제할까요?')) onDelete(review.id); }}>삭제</button></div>}
    <div className="detail-review-item__meta"><span>좋아요 {review.likes ?? 0}</span><span aria-hidden="true">·</span><span>평점</span><RatingStars value={rating} size={14} /><span>{rating.toFixed(1)} / 5</span></div>
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
  const sorted = useMemo(() => sortReviews(reviews.filter(review => !spoilerHidden || !review.spoiler), sort), [reviews, sort, spoilerHidden]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return <div className="detail-review-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="detail-review-popup" role="dialog" aria-modal="true" aria-labelledby="detail-review-popup-title">
      <div className="detail-review-popup__head"><h2 id="detail-review-popup-title">{episode.episode_number}화 리뷰</h2><ReviewSort sort={sort} onSort={setSort} spoilerHidden={spoilerHidden} onToggleSpoiler={() => setSpoilerHidden(v => !v)} /></div>
      <div className="detail-review-popup__compose"><label className="sr-only" htmlFor="detail-review-draft">리뷰 작성</label><textarea id="detail-review-draft" value={draft} maxLength={2000} onChange={event => setDraft(event.target.value)} placeholder="이 회차에 대한 감상을 남겨주세요." rows="1" /><div className="detail-review-popup__rating"><span>평점</span><RatingStars value={rating} onChange={setRating} /><output aria-live="polite">{rating.toFixed(1)} / 5</output></div><label><input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} /> 스포일러 포함</label><button type="button" disabled={saving || !draft.trim()} onClick={async () => { setSaving(true); try { if (await onSave(draft, rating, spoiler)) setDraft(''); } finally { setSaving(false); } }}>리뷰 남기기</button></div>
      {error && <p className="detail-empty" role="alert">{error}</p>}
      <div className="detail-review-popup__list" tabIndex="0">{sorted.length ? sorted.slice(0, 5).map(review => <ReviewItem key={review.id} review={review} onEdit={onEdit} onDelete={onDelete} />) : <p className="detail-empty">등록된 리뷰가 없습니다.</p>}</div>
      <button className="detail-review-popup__close" type="button" onClick={onClose}>닫기</button>
    </section>
  </div>;
};


export { StarIcon, ActionIcon, Chevron, EpisodeReviews, ReviewPopup, REVIEWS };

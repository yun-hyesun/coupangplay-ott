import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMovieStore } from '../../store/useMovieStore';
import { ContentRail } from '../../components/content/ContentRail';
import './Detail.scss';

const EMPTY = [];
const IMG = 'https://image.tmdb.org/t/p/original';
const imageUrl = (path) => path ? `${IMG}${path}` : '';

// 리뷰 데이터는 별도 API/스토어 연결 전까지 비워 둡니다.
// 데이터 형식: { id, episodeId, author, content, rating, likes, createdAt }
const REVIEWS = EMPTY;

const Chevron = ({ up = false }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'rotate(180deg)' : undefined }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const EpisodeReviews = ({ episode, reviews, onOpenPopup }) => (
  <div className="episode-item__reviews" id={`episode-reviews-${episode.id}`}>
    <div className="episode-item__reviews-head">
      <h4>{episode.episode_number}화 리뷰</h4>
      <button className="detail-review-action" type="button" onClick={onOpenPopup}>리뷰 전체보기 <Chevron /></button>
    </div>
    {reviews.length ? (
      <div className="episode-item__review-list">
        {reviews.slice(0, 3).map(review => <ReviewItem key={review.id} review={review} />)}
      </div>
    ) : <p className="detail-empty">등록된 리뷰가 없습니다.</p>}
  </div>
);

const ReviewItem = ({ review }) => {
  const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 1)));
  return (
    <article className="detail-review-item">
      <div className="detail-review-item__heading"><strong>{review.author}</strong><span className="detail-review-item__rating" aria-label={`5점 만점에 ${rating}점`}>{'★'.repeat(rating)} <span>{rating}.0 / 5</span></span></div>
      <p>{review.content}</p>
      <div className="detail-review-item__meta"><span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : ''}</span><span>좋아요 {review.likes ?? 0}</span></div>
    </article>
  );
};

const ReviewPopup = ({ episode, reviews, onClose }) => {
  const [sort, setSort] = useState('popular');
  const [draft, setDraft] = useState('');
  const sorted = useMemo(() => [...reviews].sort((a, b) => sort === 'popular'
    ? (Number(b.likes) || 0) - (Number(a.likes) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0)
    : new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [reviews, sort]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="detail-review-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="detail-review-popup" role="dialog" aria-modal="true" aria-labelledby="detail-review-popup-title">
        <div className="detail-review-popup__head"><h2 id="detail-review-popup-title">{episode.episode_number}화 리뷰</h2><button type="button" className="detail-review-popup__close" onClick={onClose} aria-label="리뷰 창 닫기">×</button></div>
        <div className="detail-review-popup__tools"><span>리뷰 {reviews.length}</span><label>정렬 <select value={sort} onChange={event => setSort(event.target.value)}><option value="popular">인기순</option><option value="recent">최신순</option></select></label></div>
        <div className="detail-review-popup__list" tabIndex="0">{sorted.length ? sorted.slice(0, 5).map(review => <ReviewItem key={review.id} review={review} />) : <p className="detail-empty">등록된 리뷰가 없습니다.</p>}</div>
        <div className="detail-review-popup__compose"><label htmlFor="detail-review-draft">리뷰 작성</label><textarea id="detail-review-draft" value={draft} onChange={event => setDraft(event.target.value)} placeholder="작품에 대한 감상을 남겨주세요." rows="3" /><button type="button" disabled title="리뷰 저장 API 연결 전까지 비활성화">리뷰 남기기</button></div>
      </section>
    </div>
  );
};

export const Detail = () => {
  const { type, id } = useParams();
  const { state } = useLocation();
  const [season, setSeason] = useState('1');
  const [openedEpisode, setOpenedEpisode] = useState(null);
  const [popupEpisode, setPopupEpisode] = useState(null);

  const key = `${type}-${id}`;
  const fetched = useMovieStore(s => s.contentDetails[key]);
  const recommendations = useMovieStore(s => s.detailRecommendations[key] ?? EMPTY);
  const loading = useMovieStore(s => s.detailLoading[key]);
  const error = useMovieStore(s => s.detailErrors[key]);
  const onFetchContentDetail = useMovieStore(s => s.onFetchContentDetail);
  const seasons = useMovieStore(s => s.seasons[id] ?? EMPTY);
  const episodes = useMovieStore(s => s.episodes[`${id}-${season}`] ?? EMPTY);
  const onFetchSeason = useMovieStore(s => s.onFetchSeason);
  const onFetchEpisode = useMovieStore(s => s.onFetchEpisode);

  useEffect(() => {
    setOpenedEpisode(null);
    setPopupEpisode(null);
    if ((type === 'tv' || type === 'movie') && id) {
      onFetchContentDetail(type, id);
      if (type === 'tv') onFetchSeason(id);
    }
  }, [type, id, onFetchContentDetail, onFetchSeason]);

  useEffect(() => {
    if (type !== 'tv' || !id || !seasons.length) return;
    const available = seasons.filter(s => s.season_number >= 0);
    const selected = available.some(s => String(s.season_number) === season) ? season : String(available[0]?.season_number ?? 1);
    if (selected !== season) { setSeason(selected); return; }
    onFetchEpisode(id, Number(selected));
  }, [type, id, seasons, season, onFetchEpisode]);

  const content = fetched ?? state?.content ?? {};
  const title = content.title || content.name || '작품 정보';
  const overview = content.overview || '등록된 작품 소개가 없습니다.';
  const backdrop = imageUrl(content.backdrop_path);
  const watchState = { content, episodes, seasonNumber: Number(season) };
  const year = (content.first_air_date || content.release_date || '').slice(0, 4);
  const rating = typeof content.vote_average === 'number' ? content.vote_average.toFixed(1) : null;

  return (
    <main className="detail-page">
      <div className="detail-page__inner">
        {loading && !fetched && <p role="status">작품 정보를 불러오는 중입니다.</p>}
        {error && <p role="alert">{error}</p>}
        <section className="detail-hero" aria-labelledby="detail-title">
          {backdrop && <img className="detail-hero__image" src={backdrop} alt="" />}
          <div className="detail-hero__shade" />
          <div className="detail-hero__content">
            <span className="detail-hero__category">{type === 'tv' ? '시리즈' : '영화'}</span>
            <h1 id="detail-title">{title}</h1>
            <p className="detail-hero__description">{overview}</p>
            <div className="detail-hero__actions">
              <Link className="detail-button detail-button--primary" to={`/watch/${type}/${id}`} state={watchState}>▶ 재생하기</Link>
              <button className="detail-button detail-button--outline" type="button" disabled title="찜 기능 연결 예정">＋ 찜하기</button>
            </div>
          </div>
        </section>

        <section className="detail-info" aria-label="작품 정보">
          <div className="detail-info__main">
            <div className="detail-info__badges">
              {rating && <span className="detail-info__score"><span aria-hidden="true">☆</span> {rating}</span>}
              {year && <span>{year}</span>}
              {type === 'tv' && content.number_of_episodes != null && <span>총 {content.number_of_episodes}회</span>}
            </div>
            <p className="detail-info__overview">{overview}</p>
          </div>
          <dl className="detail-info__metadata">
            <div><dt>출연</dt><dd>{(content.credits?.cast ?? []).slice(0, 4).map(person => person.name).join(', ') || '정보 없음'}</dd></div>
            <div><dt>장르</dt><dd>{(content.genres ?? []).map(g => g.name).join(' · ') || '정보 없음'}</dd></div>
            <div><dt>언어</dt><dd>{content.original_language || '정보 없음'}</dd></div>
          </dl>
        </section>

        {type === 'tv' && <section className="detail-episodes" aria-labelledby="episodes-title">
          <div className="detail-section-heading"><h2 id="episodes-title">회차</h2>
            <label className="detail-season-select"><span className="sr-only">시즌 선택</span><select value={season} onChange={event => { setSeason(event.target.value); setOpenedEpisode(null); setPopupEpisode(null); }}>
              {seasons.filter(s => s.season_number >= 0).map(s => <option key={s.id} value={s.season_number}>{s.name || `시즌 ${s.season_number}`}</option>)}
              {!seasons.length && <option value="1">시즌 1</option>}
            </select></label>
          </div>
          <div className="detail-episodes__list">
            {!episodes.length && <p className="detail-empty">회차 정보를 불러오는 중이거나 등록된 회차가 없습니다.</p>}
            {episodes.map(ep => {
              const isOpen = openedEpisode === ep.id;
              const reviews = REVIEWS.filter(review => String(review.episodeId) === String(ep.id));
              return <article className={`episode-item${isOpen ? ' episode-item--open' : ''}`} key={ep.id}>
                <div className="episode-item__main">
                  <span className="episode-item__number">{ep.episode_number}</span>
                  <Link className="episode-item__thumbnail" to={`/watch/tv/${id}`} state={{ ...watchState, episodeNumber: ep.episode_number }} aria-label={`${ep.episode_number}화 재생`}>
                    {ep.still_path ? <img src={imageUrl(ep.still_path)} alt="" /> : <span className="episode-item__placeholder">{ep.episode_number}화</span>}
                    <span className="episode-item__play">▶</span>
                  </Link>
                  <div className="episode-item__body">
                    <div className="episode-item__top"><h3>{ep.episode_number}화 · {ep.name}</h3><div className="episode-item__aside">
                      <span className="episode-item__runtime">{ep.runtime ? `약 ${ep.runtime}분` : '러닝타임 정보 없음'}</span>
                      <button className="episode-item__review-toggle" type="button" aria-expanded={isOpen} aria-controls={`episode-reviews-${ep.id}`} onClick={() => setOpenedEpisode(isOpen ? null : ep.id)}><Chevron up={isOpen} /> 리뷰 {reviews.length}</button>
                    </div></div>
                    <p className="episode-item__description">{ep.overview || '줄거리가 등록되지 않았습니다.'}</p>
                  </div>
                </div>
                {isOpen && <EpisodeReviews episode={ep} reviews={reviews} onOpenPopup={() => setPopupEpisode(ep)} />}
              </article>;
            })}
          </div>
        </section>}

        {recommendations.length > 0 && <section className="detail-recommend" aria-label="추천 콘텐츠"><ContentRail title="이런 작품은 어때요?" type={type} imageType="가로" slideView={6} items={recommendations} showMore={false} /></section>}
      </div>
      {popupEpisode && <ReviewPopup episode={popupEpisode} reviews={REVIEWS.filter(review => String(review.episodeId) === String(popupEpisode.id))} onClose={() => setPopupEpisode(null)} />}
    </main>
  );
};

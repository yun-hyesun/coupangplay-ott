
import { useEffect, useState } from 'react';
import { StarIcon, ActionIcon, Chevron, EpisodeReviews, ReviewPopup } from './DetailComponents';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMovieStore } from '../../store/useMovieStore';
import { ContentRail } from '../../components/content/ContentRail';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import './Detail.scss';
import { subscribeEpisodeReviews, createEpisodeReview, updateEpisodeReview, deleteEpisodeReview } from '../../service/reviewService';
import { communityError } from '../../data/communityData';

const EMPTY = [];
const IMG = 'https://image.tmdb.org/t/p/original';
const imageUrl = (path) => path ? `${IMG}${path}` : '';

export const Detail = () => {
  const { type, id } = useParams();
  const { state } = useLocation();

  const [season, setSeason] = useState('1');
  const [openedEpisode, setOpenedEpisode] = useState(null);
  const [popupEpisode, setPopupEpisode] = useState(null);
  const [reviewsByEpisode, setReviewsByEpisode] = useState({});
  const [reviewError, setReviewError] = useState('');

  // 로그인 및 프로필 정보
  const user = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.loading);
  const currentProfile = useProfileStore(s => s.currentProfile);

  // Firebase 찜 목록
  const watchlist = useWatchlistStore(s => s.watchlist);
  const ownerKey = useWatchlistStore(s => s.ownerKey);
  const watchlistLoading = useWatchlistStore(s => s.loading);
  const watchlistError = useWatchlistStore(s => s.error);

  const onLoadWatchlist = useWatchlistStore(s => s.onLoadWatchlist);
  const onAddWatchlist = useWatchlistStore(s => s.onAddWatchlist);
  const onRemoveWatchlist = useWatchlistStore(s => s.onRemoveWatchlist);
  const onResetWatchlist = useWatchlistStore(s => s.onResetWatchlist);

  // 영화 / 드라마 상세 정보
  const key = `${type}-${id}`;
  const fetched = useMovieStore(s => s.contentDetails[key]);
  const recommendations = useMovieStore(
    s => s.detailRecommendations[key] ?? EMPTY
  );
  const loading = useMovieStore(s => s.detailLoading[key]);
  const error = useMovieStore(s => s.detailErrors[key]);
  const onFetchContentDetail = useMovieStore(s => s.onFetchContentDetail);

  const seasons = useMovieStore(s => s.seasons[id] ?? EMPTY);
  const episodes = useMovieStore(
    s => s.episodes[`${id}-${season}`] ?? EMPTY
  );
  const onFetchSeason = useMovieStore(s => s.onFetchSeason);
  const onFetchEpisode = useMovieStore(s => s.onFetchEpisode);

  // 상세 정보 불러오기
  useEffect(() => {
    setOpenedEpisode(null);
    setPopupEpisode(null);

    if ((type === 'tv' || type === 'movie') && id) {
      onFetchContentDetail(type, id);

      if (type === 'tv') {
        onFetchSeason(id);
      }
    }
  }, [type, id, onFetchContentDetail, onFetchSeason]);

  // 시즌 / 회차 불러오기
  useEffect(() => {
    if (type !== 'tv' || !id || !seasons.length) return;

    const available = seasons.filter(
      s => s.season_number >= 0
    );

    const selected = available.some(
      s => String(s.season_number) === season
    )
      ? season
      : String(available[0]?.season_number ?? 1);

    if (selected !== season) {
      setSeason(selected);
      return;
    }

    onFetchEpisode(id, Number(selected));
  }, [type, id, seasons, season, onFetchEpisode]);

  // 회차별 리뷰 구독은 작품/시즌/회차가 바뀌면 자동 해제합니다.
  useEffect(() => {
    if (type !== 'tv' || !id || !episodes.length) return;
    setReviewsByEpisode({});
    const unsubscribers = episodes.map(ep => subscribeEpisodeReviews('tv', id, Number(season), ep.episode_number,
      items => setReviewsByEpisode(prev => ({ ...prev, [ep.id]: items })),
      err => setReviewError(communityError(err))));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [type, id, season, episodes]);

  const reviewArgs = ep => ({ type: 'tv', contentId: id, season: Number(season), episode: ep.episode_number });
  const saveReview = async (ep, text, rating, spoiler) => {
    try { setReviewError(''); await createEpisodeReview({ ...reviewArgs(ep), text, rating, spoiler }); return true; }
    catch (err) { setReviewError(communityError(err)); return false; }
  };
  const editReview = async (ep, reviewId, text) => {
    try { setReviewError(''); await updateEpisodeReview({ ...reviewArgs(ep), reviewId, text }); return true; }
    catch (err) { setReviewError(communityError(err)); return false; }
  };
  const removeReview = async (ep, reviewId) => {
    try { setReviewError(''); await deleteEpisodeReview({ ...reviewArgs(ep), reviewId }); return true; }
    catch (err) { setReviewError(communityError(err)); return false; }
  };

  // 로그인 계정 / 프로필 변경 시 찜 목록 불러오기
  useEffect(() => {
    onResetWatchlist();

    if (!authLoading && user?.uid && currentProfile?.id) {
      onLoadWatchlist();
    }
  }, [
    authLoading,
    user?.uid,
    currentProfile?.id,
    onLoadWatchlist,
    onResetWatchlist
  ]);

  const content = fetched ?? state?.content ?? {};
  const title = content.title || content.name || '작품 정보';
  const overview =
    content.overview || '등록된 작품 소개가 없습니다.';
  const backdrop = imageUrl(content.backdrop_path);

  const watchState = {
    content,
    episodes,
    seasonNumber: Number(season)
  };

  const year = (
    content.first_air_date ||
    content.release_date ||
    ''
  ).slice(0, 4);

  const rating =
    typeof content.vote_average === 'number'
      ? content.vote_average.toFixed(1)
      : null;

  // 현재 계정 + 프로필의 찜 목록인지 확인
  const expectedOwnerKey =
    user?.uid && currentProfile?.id
      ? `${user.uid}_${currentProfile.id}`
      : null;

  const isCurrentList =
    expectedOwnerKey !== null &&
    ownerKey === expectedOwnerKey;

  // 현재 콘텐츠 찜 여부
  const liked =
    isCurrentList &&
    watchlist.some(
      item => item.docId === `${type}_${id}`
    );

  // 찜하기 / 찜 해제
  const handleToggleWatchlist = async () => {
    if (!user || !currentProfile) {
      alert('로그인 후 프로필을 선택해 주세요.');
      return;
    }

    if (
      !['movie', 'tv'].includes(type) ||
      !id ||
      !isCurrentList ||
      watchlistLoading
    ) {
      return;
    }

    const watchContent = {
      id: Number(id),
      media_type: type,
      title,
      poster_path: content.poster_path || null,
      backdrop_path: content.backdrop_path || null
    };

    const success = liked
      ? await onRemoveWatchlist(watchContent)
      : await onAddWatchlist(watchContent);

    if (!success) {
      alert(
        useWatchlistStore.getState().error ||
        '찜 목록을 변경하지 못했습니다.'
      );
    }
  };

  return (
    <main className="detail-page">
      <div className="detail-page__inner">

        {loading && !fetched && (
          <p role="status">
            작품 정보를 불러오는 중입니다.
          </p>
        )}

        {error && <p role="alert">{error}</p>}

        <section
          className="detail-hero"
          aria-labelledby="detail-title"
        >
          {backdrop && (
            <img
              className="detail-hero__image"
              src={backdrop}
              alt=""
            />
          )}

          <div className="detail-hero__shade" />

          <div className="detail-hero__content">
            <span className="detail-hero__category">
              {type === 'tv' ? '시리즈' : '영화'}
            </span>

            <h1 id="detail-title">{title}</h1>

            {/* <p className="detail-hero__description">
              {overview}
            </p> */}

            <div className="detail-hero__actions">
              <Link
                className="detail-button detail-button--primary"
                to={`/watch/${type}/${id}`}
                state={watchState}
              >
                ▶ 재생하기
              </Link>

              {/* Firebase 찜하기 버튼 */}
              <button
                className={`detail-button detail-button--outline${liked ? ' is-active' : ''}`}
                type="button"
                aria-pressed={liked}
                onClick={handleToggleWatchlist}
                disabled={
                  !!user &&
                  !!currentProfile &&
                  (!isCurrentList || watchlistLoading)
                }
              >
                <ActionIcon name="like" />
                {liked ? '찜 완료' : '찜하기'}
              </button>

              <button
                className="detail-button detail-button--outline"
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title,
                        url: window.location.href
                      });
                    } else {
                      await navigator.clipboard.writeText(
                        window.location.href
                      );
                    }
                  } catch {
                    // 사용자가 공유를 취소한 경우
                  }
                }}
              >
                <ActionIcon name="share" />
                공유
              </button>
            </div>

            {watchlistError && isCurrentList && (
              <p role="alert">{watchlistError}</p>
            )}
          </div>
        </section>

        <section
          className="detail-info"
          aria-label="작품 정보"
        >
          <div className="detail-info__main">
            <div className="detail-info__badges">
              {rating && (
                <span className="detail-info__score">
                  <StarIcon size={24} /> {rating}
                </span>
              )}

              {year && <span>{year}</span>}

              {content.adult === true && (
                <span className="detail-info__age">
                  19+
                </span>
              )}

              {type === 'tv' &&
                content.number_of_episodes != null && (
                  <span>
                    총 {content.number_of_episodes}회
                  </span>
                )}

              {content.videoQuality && (
                <span className="detail-info__quality">
                  {content.videoQuality}
                </span>
              )}

              {content.wowExclusive && (
                <span className="detail-info__wow">
                  WOW 전용
                </span>
              )}
            </div>

            <p className="detail-info__overview">
              {overview}
            </p>

            {content.wowExclusive && (
              <p className="detail-info__membership">
                와우 멤버십으로 시청 가능 · 추가 결제 없음
              </p>
            )}
          </div>

          <dl className="detail-info__metadata">
            <div>
              <dt>출연</dt>
              <dd>
                {(content.credits?.cast ?? [])
                  .slice(0, 4)
                  .map(person => person.name)
                  .join(', ') || '정보 없음'}
              </dd>
            </div>

            <div>
              <dt>장르</dt>
              <dd>
                {(content.genres ?? [])
                  .map(g => g.name)
                  .join(' · ') || '정보 없음'}
              </dd>
            </div>

            <div>
              <dt>언어</dt>
              <dd>
                {content.original_language || '정보 없음'}
              </dd>
            </div>
          </dl>
        </section>

        {reviewError && <p className="detail-empty" role="alert">{reviewError}</p>}
        {type === 'tv' && (
          <section
            className="detail-episodes"
            aria-labelledby="episodes-title"
          >
            <div className="detail-section-heading">
              <h2 id="episodes-title">회차</h2>

              <label className="detail-season-select">
                <span className="sr-only">
                  시즌 선택
                </span>

                <select
                  value={season}
                  onChange={event => {
                    setSeason(event.target.value);
                    setOpenedEpisode(null);
                    setPopupEpisode(null);
                  }}
                >
                  {seasons
                    .filter(s => s.season_number >= 0)
                    .map(s => (
                      <option
                        key={s.id}
                        value={s.season_number}
                      >
                        {s.name ||
                          `시즌 ${s.season_number}`}
                      </option>
                    ))}

                  {!seasons.length && (
                    <option value="1">시즌 1</option>
                  )}
                </select>
              </label>
            </div>

            <div className="detail-episodes__list">
              {!episodes.length && (
                <p className="detail-empty">
                  회차 정보를 불러오는 중이거나
                  등록된 회차가 없습니다.
                </p>
              )}

              {episodes.map(ep => {
                const isOpen =
                  openedEpisode === ep.id;

                const reviews = reviewsByEpisode[ep.id] ?? EMPTY;

                return (
                  <article
                    className={`episode-item${isOpen ? ' episode-item--open' : ''}`}
                    key={ep.id}
                  >
                    <div className="episode-item__main">
                      <span className="episode-item__number">
                        {ep.episode_number}
                      </span>

                      <Link
                        className="episode-item__thumbnail"
                        to={`/watch/tv/${id}`}
                        state={{
                          ...watchState,
                          episodeNumber: ep.episode_number
                        }}
                        aria-label={`${ep.episode_number}화 재생`}
                      >
                        {ep.still_path ? (
                          <img
                            src={imageUrl(ep.still_path)}
                            alt=""
                          />
                        ) : (
                          <span className="episode-item__placeholder">
                            {ep.episode_number}화
                          </span>
                        )}

                        <span className="episode-item__play">
                          ▶
                        </span>
                      </Link>

                      <div className="episode-item__body">
                        <div className="episode-item__top">
                          <h3>
                            {ep.episode_number}화 · {ep.name}
                          </h3>

                          <div className="episode-item__aside">
                            <span className="episode-item__runtime">
                              {ep.runtime
                                ? `약 ${ep.runtime}분`
                                : '러닝타임 정보 없음'}
                            </span>

                            <button
                              className="episode-item__review-toggle"
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={`episode-reviews-${ep.id}`}
                              onClick={() =>
                                setOpenedEpisode(
                                  isOpen ? null : ep.id
                                )
                              }
                            >
                              <Chevron up={isOpen} />
                              리뷰 {reviews.length}
                            </button>
                          </div>
                        </div>

                        <p className="episode-item__description">
                          {ep.overview ||
                            '줄거리가 등록되지 않았습니다.'}
                        </p>
                      </div>
                    </div>

                    {isOpen && (
                      <EpisodeReviews
                        episode={ep}
                        reviews={reviews}
                        onOpenPopup={() =>
                          setPopupEpisode(ep)
                        }
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section
            className="detail-recommend"
            aria-label="추천 콘텐츠"
          >
            <ContentRail
              title="이런 작품은 어때요?"
              type={type}
              imageType="가로"
              slideView={6}
              items={recommendations}
              showMore={false}
            />
          </section>
        )}
      </div>
      {popupEpisode && <ReviewPopup episode={popupEpisode} reviews={reviewsByEpisode[popupEpisode.id] ?? EMPTY} onSave={(text, rating, spoiler) => saveReview(popupEpisode, text, rating, spoiler)} onEdit={(reviewId, text) => editReview(popupEpisode, reviewId, text)} onDelete={reviewId => removeReview(popupEpisode, reviewId)} error={reviewError} onClose={() => setPopupEpisode(null)} />}
    </main>
  );
};

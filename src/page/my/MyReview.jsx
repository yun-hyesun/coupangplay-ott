import { formatFivePointRating } from '../../utils/rating';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import { auth } from '../../firebase/firebase';
import { subscribeMyReviews, updateEpisodeReview, deleteEpisodeReview } from '../../service/reviewService';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import { useProfileStore } from '../../store/useProfileStore';
import { contentKey, episodeKey } from '../../data/communityData';

import { MyPageHeader } from './components/MyPageHeader';
import './scss/MyReview.scss';

export const MyReview = () => {
  const [activeTab, setActiveTab] = useState('available');
  const navigate = useNavigate();

  // Firebase 로그인 정보
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 리뷰 조회 상태를 UID와 함께 관리
  const [reviewState, setReviewState] = useState({
    ownerId: null,
    reviews: [],
    loading: true,
    error: ''
  });

  // 현재 프로필
  const currentProfile = useProfileStore(
    (state) => state.currentProfile
  );

  // 시청 내역
  const history = useWatchHistoryStore(
    (state) => state.history
  );

  const historyOwnerKey = useWatchHistoryStore(
    (state) => state.ownerKey
  );

  const historyLoading = useWatchHistoryStore(
    (state) => state.loading
  );

  const historyError = useWatchHistoryStore(
    (state) => state.error
  );

  const onLoadHistory = useWatchHistoryStore(
    (state) => state.onLoadHistory
  );

  const onResetHistory = useWatchHistoryStore(
    (state) => state.onResetHistory
  );

  // ========================================
  // Firebase 로그인 상태 확인
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // ========================================
  // 내가 작성한 리뷰 실시간 조회
  // ========================================
  useEffect(() => {
    if (!authReady) return;

    if (!userId) {
      setReviewState({
        ownerId: null,
        reviews: [],
        loading: false,
        error: ''
      });
      return;
    }

    let active = true;

    setReviewState({
      ownerId: userId,
      reviews: [],
      loading: true,
      error: ''
    });

    const unsubscribe = subscribeMyReviews(
      userId,
      (reviews) => {
        if (!active) return;

        setReviewState({
          ownerId: userId,
          reviews,
          loading: false,
          error: ''
        });
      },
      (error) => {
        if (!active) return;

        console.error('내 리뷰 조회 오류:', error);

        setReviewState({
          ownerId: userId,
          reviews: [],
          loading: false,
          error: error.message || '리뷰 조회 실패'
        });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authReady, userId]);

  // ========================================
  // 현재 계정 + 프로필 시청 내역 조회
  // ========================================
  useEffect(() => {
    if (!authReady) return;

    if (!userId || !currentProfile?.id) {
      onResetHistory();
      return;
    }

    void onLoadHistory();
  }, [
    authReady,
    userId,
    currentProfile?.id,
    onLoadHistory,
    onResetHistory
  ]);

  // ========================================
  // 현재 사용자 데이터인지 검증
  // ========================================

  const expectedOwnerKey =
    userId && currentProfile?.id
      ? `${userId}_${currentProfile.id}`
      : null;

  const isCurrentReview =
    authReady &&
    !!userId &&
    reviewState.ownerId === userId;

  const isCurrentHistory =
    !!expectedOwnerKey &&
    historyOwnerKey === expectedOwnerKey;

  // 현재 계정의 리뷰만 사용
  const myReviews = isCurrentReview
    ? reviewState.reviews
    : [];

  // 현재 프로필의 시청 내역만 사용
  const currentHistory = isCurrentHistory
    ? history
    : [];

  // 리뷰 로딩 여부
  const reviewLoading =
    !authReady ||
    (!!userId &&
      (!isCurrentReview || reviewState.loading));

  // 시청 내역 로딩 여부
  const watchHistoryLoading =
    !authReady ||
    (!!expectedOwnerKey &&
      (!isCurrentHistory || historyLoading));

  // 리뷰 조회 오류
  const reviewError = isCurrentReview
    ? reviewState.error
    : '';

  // 시청 내역 조회 오류
  const watchHistoryError = historyError;


  // ========================================
  // 작성 가능한 리뷰 계산 (회차별)
  // ========================================
  const availableReviews = currentHistory.flatMap((item) => {
    // 현재 리뷰 작성 기능은 TV 회차만 지원
    if (item.media_type !== 'tv') return [];
    if (item.id == null) return [];

    const targetContentKey = contentKey('tv', item.id);

    // 시청했던 회차 목록
    const watchedEpisodes = Array.isArray(item.watchedEpisodes)
      ? item.watchedEpisodes
      : [];

    // 이전 저장 데이터에는 watchedEpisodes가 없을 수 있으므로
    // 현재 저장된 시즌/회차도 함께 포함
    const latestEpisodeKey = episodeKey(
      Number(item.seasonNumber ?? 1),
      Number(item.episodeNumber ?? 1)
    );

    const episodeKeys = [
      ...new Set([
        ...watchedEpisodes,
        latestEpisodeKey
      ])
    ];

    // 회차별 리뷰 작성 여부 확인
    return episodeKeys
      .filter((key) => {
        const alreadyWritten = myReviews.some((review) => {
          return (
            review.contentKey === targetContentKey &&
            review.episodeKey === key
          );
        });

        return !alreadyWritten;
      })
      .map((key) => {
        const match = /^s(\d+)-e(\d+)$/.exec(key);

        if (!match) return null;

        return {
          ...item,
          reviewEpisodeKey: key,
          seasonNumber: Number(match[1]),
          episodeNumber: Number(match[2])
        };
      })
      .filter(Boolean);
  });


  // 작성 가능한 리뷰를 작품별로 묶기
  const groupedAvailableReviews = Object.values(
    availableReviews.reduce((groups, item) => {
      const key = contentKey(item.media_type, item.id);
      if (!groups[key]) {
        groups[key] = {
          contentKey: key,
          title: item.title,
          poster: item.poster_path || '',
          reviews: []
        };
      }
      groups[key].reviews.push(item);
      return groups;
    }, {})
  );

  // 해당 작품 상세페이지의 시즌/회차 리뷰 작성 팝업으로 이동
  const handleWriteReview = (item) => {
    if (item.id == null || item.media_type !== 'tv') return;
    const params = new URLSearchParams({
      reviewSeason: String(item.seasonNumber),
      reviewEpisode: String(item.episodeNumber)
    });
    navigate(`/detail/tv/${item.id}?${params.toString()}`);
  };

  // 작성 가능한 리뷰 펼치기 상태
  const [expandedAvailableGroups, setExpandedAvailableGroups] = useState({});

  const toggleAvailableGroup = (key) => {
    setExpandedAvailableGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ========================================
  // 작성한 리뷰에 작품명 / 시즌 / 회차 연결
  // ========================================

  // 작성한 리뷰를 작품별로 묶기
  const groupedReviews = Object.values(
    myReviews.reduce((groups, review) => {
      const key = review.contentKey || 'unknown';

      const matchedHistory = currentHistory.find(
        (item) => contentKey(item.media_type, item.id) === key
      );

      const match = /^s(\d+)-e(\d+)$/.exec(review.episodeKey || '');

      if (!groups[key]) {
        groups[key] = {
          contentKey: key,
          title: matchedHistory?.title || '콘텐츠 정보 없음',
          poster: matchedHistory?.poster_path || '',
          reviews: []
        };
      }

      groups[key].reviews.push({
        ...review,
        seasonNumber: match ? Number(match[1]) : null,
        episodeNumber: match ? Number(match[2]) : null
      });

      return groups;
    }, {})
  );

  // 작품별 펼치기 상태
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };


  // 리뷰 더보기 메뉴
  const [openReviewMenu, setOpenReviewMenu] = useState(null);

  // 수정 중인 리뷰
  const [editingReview, setEditingReview] = useState(null);
  const [editText, setEditText] = useState('');

  // 저장 / 삭제 처리 상태
  const [reviewSaving, setReviewSaving] = useState(false);

  // 삭제 확인 모달에 표시할 리뷰
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 리뷰의 Firestore 경로에서 작품과 회차 추출
  const getReviewParams = (review) => {
    const contentMatch = /^(.+)-(\d+)$/.exec(review.contentKey || '');
    const episodeMatch = /^s(\d+)-e(\d+)$/.exec(review.episodeKey || '');

    if (!contentMatch || !episodeMatch || !review.id) {
      throw new Error('리뷰 정보를 확인할 수 없습니다.');
    }

    return {
      type: contentMatch[1],
      contentId: contentMatch[2],
      season: Number(episodeMatch[1]),
      episode: Number(episodeMatch[2]),
      reviewId: review.id
    };
  };

  // 수정 시작
  const handleEditReview = (review) => {
    setEditingReview(review.documentPath);
    setEditText(review.content || '');
    setOpenReviewMenu(null);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingReview(null);
    setEditText('');
  };

  // 수정 저장
  const handleSaveReview = async (review) => {
    if (reviewSaving) return;

    const value = editText.trim();

    if (!value || value.length > 2000) {
      alert('리뷰는 1~2000자로 작성해 주세요.');
      return;
    }

    try {
      setReviewSaving(true);

      await updateEpisodeReview({
        ...getReviewParams(review),
        text: value
      });

      setEditingReview(null);
      setEditText('');
    } catch (error) {
      console.error('리뷰 수정 오류:', error);
      alert(error.message || '리뷰 수정에 실패했습니다.');
    } finally {
      setReviewSaving(false);
    }
  };

  // 리뷰 삭제

  // 삭제 버튼 클릭 → 모달 열기
  const handleDeleteReview = (review) => {
    if (reviewSaving) return;

    setOpenReviewMenu(null);
    setDeleteTarget(review);
  };

  // 모달에서 최종 삭제
  const handleConfirmDelete = async () => {
    if (!deleteTarget || reviewSaving) return;

    const target = deleteTarget;

    try {
      setReviewSaving(true);

      await deleteEpisodeReview(getReviewParams(target));

      if (editingReview === target.documentPath) {
        setEditingReview(null);
        setEditText('');
      }

      setDeleteTarget(null);
    } catch (error) {
      console.error('리뷰 삭제 오류:', error);
      alert(error.message || '리뷰 삭제에 실패했습니다.');
    } finally {
      setReviewSaving(false);
    }
  };




  // 날짜 표시
  const formatDate = (date) => {
    if (!date) return '';

    const value = new Date(date);

    return Number.isNaN(value.getTime())
      ? ''
      : value.toLocaleDateString('ko-KR');
  };

  // ========================================
  // 화면
  // ========================================
  return (
    <main className="my-review">
      <div className="my-review__inner">

        {/* 공통 페이지 헤더 */}
        <div className="my-review__header">
          <MyPageHeader title="리뷰 관리" />
        </div>

        {/* 리뷰 탭 */}
        <div
          className="my-review__tabs"
          role="tablist"
          aria-label="리뷰 관리"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'available'}
            className={activeTab === 'available' ? 'active' : ''}
            onClick={() => setActiveTab('available')}
          >
            작성 가능한 리뷰
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'written'}
            className={activeTab === 'written' ? 'active' : ''}
            onClick={() => setActiveTab('written')}
          >
            내가 작성한 리뷰
          </button>
        </div>

        {/* ====================================
            작성 가능한 리뷰
        ==================================== */}
        {activeTab === 'available' && (
          <div className="my-review__available" role="tabpanel">

            {!authReady || reviewLoading ? (
              <div className="my-review__empty">
                <p>리뷰 정보를 불러오는 중입니다.</p>
              </div>

            ) : !userId || !currentProfile ? (
              <div className="my-review__empty">
                <h3>로그인 및 프로필 선택이 필요합니다.</h3>
                <p>프로필을 선택하면 시청 내역을 확인할 수 있습니다.</p>
              </div>

            ) : reviewError ? (
              <div className="my-review__empty" role="alert">
                <h3>리뷰를 불러오지 못했습니다.</h3>
                <p>{reviewError}</p>
              </div>

            ) : watchHistoryError ? (
              <div className="my-review__empty" role="alert">
                <h3>시청 내역을 불러오지 못했습니다.</h3>
                <p>{watchHistoryError}</p>
              </div>

            ) : watchHistoryLoading ? (
              <div className="my-review__empty">
                <p>시청 내역을 불러오는 중입니다.</p>
              </div>

            ) : availableReviews.length === 0 ? (
              <div className="my-review__empty">
                <h3>리뷰를 작성할 수 있는 콘텐츠가 없습니다.</h3>
                <p>
                  시청한 콘텐츠 중 리뷰를 작성하지 않은 회차가 표시됩니다.
                </p>
              </div>

            ) : (
              <>
                <p className="my-review__count">
                  작성 가능한 리뷰 {availableReviews.length}개
                </p>

                <div className="my-review__group-list">
                  {groupedAvailableReviews.map((group) => {
                    const expanded = expandedAvailableGroups[group.contentKey] || false;
                    const visibleReviews = group.reviews.slice(0, 1);
                    const hiddenReviews = group.reviews.slice(1);

                    const renderAvailableEpisode = (item) => (
                      <article
                        className="my-review__episode"
                        key={`${item.docId}-${item.reviewEpisodeKey}`}
                      >
                        <div className="my-review__episode-top">
                          <span className="my-review__episode-badge">
                            시즌 {item.seasonNumber ?? 1}
                            {' · '}
                            {item.episodeNumber ?? 1}화
                          </span>
                          <button
                            type="button"
                            className="my-review__write-button"
                            onClick={() => handleWriteReview(item)}
                          >
                            리뷰 작성
                          </button>
                        </div>
                        <p className="my-review__episode-content">
                          시청한 회차에 대한 감상을 남겨보세요.
                        </p>
                      </article>
                    );

                    return (
                      <section className="my-review__group" key={group.contentKey}>
                        <div className="my-review__group-layout">
                          <div className="my-review__poster">
                            {group.poster ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w342${group.poster}`}
                                alt={`${group.title} 포스터`}
                              />
                            ) : (
                              <span>NO IMAGE</span>
                            )}
                          </div>

                          <div className="my-review__group-body">
                            <button
                              type="button"
                              className="my-review__group-header"
                              onClick={() => toggleAvailableGroup(group.contentKey)}
                              aria-expanded={expanded}
                            >
                              <span className="my-review__group-heading">
                                <strong>{group.title}</strong>
                                <small>작성 가능한 리뷰 {group.reviews.length}개</small>
                              </span>
                              <span
                                className={`my-review__group-arrow ${expanded ? 'active' : ''}`}
                                aria-hidden="true"
                              >
                                <img
                                  src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                                  alt=""
                                />
                              </span>
                            </button>

                            <div className="my-review__episode-list">
                              {visibleReviews.map(renderAvailableEpisode)}
                            </div>

                            {hiddenReviews.length > 0 && (
                              <>
                                <div
                                  className={`my-review__expand ${expanded ? 'active' : ''}`}
                                  aria-hidden={!expanded}
                                  inert={!expanded}
                                >
                                  <div className="my-review__expand-inner">
                                    {hiddenReviews.map(renderAvailableEpisode)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="my-review__group-more"
                                  onClick={() => toggleAvailableGroup(group.contentKey)}
                                  aria-expanded={expanded}
                                >
                                  {expanded ? '접기' : `리뷰 ${hiddenReviews.length}개 더보기`}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ====================================
            내가 작성한 리뷰
        ==================================== */}
        {activeTab === 'written' && (
          <div className="my-review__written" role="tabpanel">

            {reviewLoading ? (
              <div className="my-review__empty">
                <p>리뷰를 불러오는 중입니다.</p>
              </div>

            ) : !userId ? (
              <div className="my-review__empty">
                <h3>로그인이 필요합니다.</h3>
                <p>로그인 후 작성한 리뷰를 확인할 수 있습니다.</p>
              </div>

            ) : reviewError ? (
              <div className="my-review__empty" role="alert">
                <h3>리뷰를 불러오지 못했습니다.</h3>
                <p>{reviewError}</p>
              </div>

            ) : myReviews.length === 0 ? (
              <div className="my-review__empty">
                <h3>작성한 리뷰가 없습니다.</h3>
                <p>
                  감상한 콘텐츠를 확인하고 리뷰를 작성해주세요.
                </p>
              </div>

            ) : (
              <>
                <p className="my-review__count">
                  내가 작성한 리뷰 {myReviews.length}개
                </p>


                <div className="my-review__group-list">
                  {groupedReviews.map((group) => {
                    const expanded = expandedGroups[group.contentKey] || false;

                    // 접혀 있을 때는 최근 리뷰 1개만 표시
                    const visibleReviews = group.reviews.slice(0, 1);
                    const hiddenReviews = group.reviews.slice(1);

                    return (
                      <section
                        className="my-review__group"
                        key={group.contentKey}
                      >
                        <div className="my-review__group-layout">

                          {/* 작품 포스터 */}
                          <div className="my-review__poster">
                            {group.poster ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w342${group.poster}`}
                                alt={`${group.title} 포스터`}
                              />
                            ) : (
                              <span>NO IMAGE</span>
                            )}
                          </div>

                          {/* 작품 정보 + 리뷰 */}
                          <div className="my-review__group-body">

                            <button
                              type="button"
                              className="my-review__group-header"
                              onClick={() => toggleGroup(group.contentKey)}
                              aria-expanded={expanded}
                            >
                              <span className="my-review__group-heading">
                                <strong>{group.title}</strong>
                                <small>작성한 리뷰 {group.reviews.length}개</small>
                              </span>

                              <span
                                className={`my-review__group-arrow ${expanded ? 'active' : ''}`}
                                aria-hidden="true"
                              >
                                <img
                                  src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                                  alt=""
                                />
                              </span>
                            </button>

                            <div className="my-review__episode-list">
                              {visibleReviews.map((review) => (
                                <article
                                  className="my-review__episode"
                                  key={review.documentPath}
                                >

                                  <div className="my-review__episode-top">
                                    <span className="my-review__episode-badge">
                                      시즌 {review.seasonNumber ?? '-'}
                                      {' · '}
                                      {review.episodeNumber ?? '-'}화
                                    </span>

                                    <div className="my-review__episode-actions">
                                      <span className="my-review__episode-rating">
                                        <img
                                          src="/images/icon/DesignSystem_Icon02/icon-star.svg"
                                          alt=""
                                          aria-hidden="true"
                                        />
                                        {formatFivePointRating(review.rating)} / 5
                                      </span>


                                      <div className="my-review__menu-wrap">
                                        <button
                                          type="button"
                                          className="my-review__more-button"
                                          aria-label="리뷰 수정 및 삭제 메뉴"
                                          aria-expanded={openReviewMenu === review.documentPath}
                                          disabled={reviewSaving}
                                          onClick={() =>
                                            setOpenReviewMenu((prev) =>
                                              prev === review.documentPath
                                                ? null
                                                : review.documentPath
                                            )
                                          }
                                        >
                                          <img
                                            src="/images/icon/DesignSystem_Icon04/icon-more_vert.svg"
                                            alt=""
                                          />
                                        </button>

                                        {openReviewMenu === review.documentPath && (
                                          <div className="my-review__menu">
                                            <button
                                              type="button"
                                              onClick={() => handleEditReview(review)}
                                            >
                                              수정
                                            </button>

                                            <button
                                              type="button"
                                              className="delete"
                                              onClick={() => handleDeleteReview(review)}
                                            >
                                              삭제
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  </div>


                                  <span className="my-review__episode-date">
                                    {formatDate(review.createdAt)}
                                  </span>


                                  {editingReview === review.documentPath ? (
                                    <div className="my-review__edit">
                                      <textarea
                                        value={editText}
                                        maxLength={2000}
                                        onChange={(e) => setEditText(e.target.value)}
                                        aria-label="리뷰 내용 수정"
                                        disabled={reviewSaving}
                                      />

                                      <div className="my-review__edit-bottom">
                                        <span>{editText.length} / 2000</span>

                                        <div className="my-review__edit-actions">
                                          <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            disabled={reviewSaving}
                                          >
                                            취소
                                          </button>

                                          <button
                                            type="button"
                                            className="save"
                                            disabled={reviewSaving || !editText.trim()}
                                            onClick={() => handleSaveReview(review)}
                                          >
                                            {reviewSaving ? '저장 중...' : '저장'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="my-review__episode-content">
                                      {review.content}
                                    </p>
                                  )}


                                  {review.spoiler && (
                                    <span className="my-review__spoiler">
                                      스포일러 포함
                                    </span>
                                  )}

                                  {review.isEdited && (
                                    <span className="my-review__edited">
                                      수정됨
                                    </span>
                                  )}
                                </article>
                              ))}
                            </div>


                            {/* 추가 회차 리뷰 - 부드럽게 펼치기 */}
                            {hiddenReviews.length > 0 && (
                              <>
                                <div
                                  className={`my-review__expand ${expanded ? 'active' : ''}`}
                                  aria-hidden={!expanded}
                                  inert={!expanded}
                                >
                                  <div className="my-review__expand-inner">
                                    {hiddenReviews.map((review) => (
                                      <article
                                        className="my-review__episode"
                                        key={review.documentPath}
                                      >
                                        <div className="my-review__episode-top">
                                          <span className="my-review__episode-badge">
                                            시즌 {review.seasonNumber ?? '-'}
                                            {' · '}
                                            {review.episodeNumber ?? '-'}화
                                          </span>

                                          <div className="my-review__episode-actions">
                                            <span className="my-review__episode-rating">
                                              <img
                                                src="/images/icon/DesignSystem_Icon02/icon-star.svg"
                                                alt=""
                                                aria-hidden="true"
                                              />
                                              {formatFivePointRating(review.rating)} / 5
                                            </span>


                                            <div className="my-review__menu-wrap">
                                              <button
                                                type="button"
                                                className="my-review__more-button"
                                                aria-label="리뷰 수정 및 삭제 메뉴"
                                                aria-expanded={openReviewMenu === review.documentPath}
                                                disabled={reviewSaving}
                                                onClick={() =>
                                                  setOpenReviewMenu((prev) =>
                                                    prev === review.documentPath
                                                      ? null
                                                      : review.documentPath
                                                  )
                                                }
                                              >
                                                <img
                                                  src="/images/icon/DesignSystem_Icon04/icon-more_vert.svg"
                                                  alt=""
                                                />
                                              </button>

                                              {openReviewMenu === review.documentPath && (
                                                <div className="my-review__menu">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEditReview(review)}
                                                  >
                                                    수정
                                                  </button>

                                                  <button
                                                    type="button"
                                                    className="delete"
                                                    onClick={() => handleDeleteReview(review)}
                                                  >
                                                    삭제
                                                  </button>
                                                </div>
                                              )}
                                            </div>

                                          </div>
                                        </div>

                                        <span className="my-review__episode-date">
                                          {formatDate(review.createdAt)}
                                        </span>


                                        {editingReview === review.documentPath ? (
                                          <div className="my-review__edit">
                                            <textarea
                                              value={editText}
                                              maxLength={2000}
                                              onChange={(e) => setEditText(e.target.value)}
                                              aria-label="리뷰 내용 수정"
                                              disabled={reviewSaving}
                                            />

                                            <div className="my-review__edit-bottom">
                                              <span>{editText.length} / 2000</span>

                                              <div className="my-review__edit-actions">
                                                <button
                                                  type="button"
                                                  onClick={handleCancelEdit}
                                                  disabled={reviewSaving}
                                                >
                                                  취소
                                                </button>

                                                <button
                                                  type="button"
                                                  className="save"
                                                  disabled={reviewSaving || !editText.trim()}
                                                  onClick={() => handleSaveReview(review)}
                                                >
                                                  {reviewSaving ? '저장 중...' : '저장'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="my-review__episode-content">
                                            {review.content}
                                          </p>
                                        )}


                                        {review.spoiler && (
                                          <span className="my-review__spoiler">
                                            스포일러 포함
                                          </span>
                                        )}

                                        {review.isEdited && (
                                          <span className="my-review__edited">
                                            수정됨
                                          </span>
                                        )}
                                      </article>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="my-review__group-more"
                                  onClick={() => toggleGroup(group.contentKey)}
                                  aria-expanded={expanded}
                                >
                                  {expanded
                                    ? '접기'
                                    : `리뷰 ${hiddenReviews.length}개 더보기`}
                                </button>
                              </>
                            )}


                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

              </>
            )}
          </div>
        )}
      </div>


      {/* 리뷰 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="review-delete-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !reviewSaving) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="review-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-delete-title"
            aria-describedby="review-delete-description"
          >
            <div className="review-delete-modal-header">
              <h3 id="review-delete-title">리뷰 삭제</h3>

              <button
                type="button"
                aria-label="닫기"
                disabled={reviewSaving}
                onClick={() => setDeleteTarget(null)}
              >
                <img
                  src="/images/icon/DesignSystem_Icon01/icon-close.svg"
                  alt=""
                />
              </button>
            </div>

            <div className="review-delete-modal-content">
              <h4>작성한 리뷰를 삭제하시겠습니까?</h4>
              <p id="review-delete-description">
                삭제한 리뷰는 복구할 수 없습니다.
              </p>
            </div>

            <div className="review-delete-modal-actions">
              <button
                type="button"
                className="cancel"
                disabled={reviewSaving}
                onClick={() => setDeleteTarget(null)}
              >
                취소
              </button>

              <button
                type="button"
                className="confirm"
                disabled={reviewSaving}
                onClick={handleConfirmDelete}
              >
                {reviewSaving ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
};
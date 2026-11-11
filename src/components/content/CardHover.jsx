import { toFivePointRating } from '../../utils/rating';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProfileStore } from '../../store/useProfileStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useMovieStore } from '../../store/useMovieStore';
import { subscribeMyPurchases } from '../../service/purchaseService';
import { ChannelSubscriptionContext } from '../../page/channel/components/ChannelSubscriptionGate';
import './scss/CordHover.scss';

export const CardHover = ({
  item,
  type,
  isHover,
  fromStore = false,
  deleteButton,
}) => {
  const [videoKey, setVideoKey] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const uid = useAuthStore((state) => state.user?.uid);
  const navigate = useNavigate();
  const profileId = useProfileStore((state) => state.currentProfile?.id);

  const watchlist = useWatchlistStore((state) => state.watchlist);
  const watchlistOwnerKey = useWatchlistStore((state) => state.ownerKey);
  const watchlistLoading = useWatchlistStore((state) => state.loading);
  const onLoadWatchlist = useWatchlistStore((state) => state.onLoadWatchlist);

  const [isSavingWatchlist, setIsSavingWatchlist] = useState(false);
  const watchlistSavingRef = useRef(false);

  const currentOwnerKey =
    uid && profileId ? `${uid}_${profileId}` : null;

  const mediaType =
    type === 'movie' || type === 'tv' ? type : item.media_type;

  const isSaved =
    Boolean(currentOwnerKey) &&
    watchlistOwnerKey === currentOwnerKey &&
    watchlist.some(
      (saved) =>
        saved.media_type === mediaType &&
        String(saved.id) === String(item.id)
    );

  // 호버할 때 현재 프로필의 찜 목록 확인
  useEffect(() => {
    if (!isHover || !currentOwnerKey) return;

    const state = useWatchlistStore.getState();

    if (state.ownerKey !== currentOwnerKey && !state.loading) {
      void onLoadWatchlist();
    }
  }, [isHover, currentOwnerKey, onLoadWatchlist]);

  const handleWatchlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!uid) {
      navigate('/login');
      return;
    }

    if (!profileId) {
      navigate('/profiles');
      return;
    }

    if (watchlistSavingRef.current) return;

    watchlistSavingRef.current = true;
    setIsSavingWatchlist(true);

    try {
      let state = useWatchlistStore.getState();

      if (state.ownerKey !== currentOwnerKey) {
        await state.onLoadWatchlist();
        state = useWatchlistStore.getState();
      }

      if (state.error || state.ownerKey !== currentOwnerKey) {
        throw new Error('찜 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
      }

      // 목록을 기다리는 동안 계정이나 프로필이 바뀌었으면 중단
      if (
        useAuthStore.getState().user?.uid !== uid ||
        useProfileStore.getState().currentProfile?.id !== profileId
      ) {
        return;
      }

      const content = {
        ...item,
        media_type: mediaType,
      };

      const alreadySaved = state.isWatchlisted(content);

      const success = alreadySaved
        ? await state.onRemoveWatchlist(content)
        : await state.onAddWatchlist(content);

      if (!success) {
        throw new Error(
          useWatchlistStore.getState().error ||
            '찜 목록을 변경하지 못했습니다.'
        );
      }
    } catch (error) {
      window.alert(error.message);
    } finally {
      watchlistSavingRef.current = false;
      setIsSavingWatchlist(false);
    }
  };

  const [purchaseState, setPurchaseState] = useState({
    uid: null,
    items: [],
  });

  const name = item.title || item.name;
  const date = item.release_date || item.first_air_date;
  const year = date?.slice(0, 4);
  const contentId = item.id;
  const detailKey = `${mediaType}-${contentId}`;
  const detail = useMovieStore((state) => state.contentDetails[detailKey]);
  const onFetchContentDetail = useMovieStore((state) => state.onFetchContentDetail);
  const savedRating = toFivePointRating(item.vote_average, 10);
  const rating = toFivePointRating(detail?.vote_average, 10) ?? savedRating;

  useEffect(() => {
    if (!isHover || detail || savedRating !== null || !contentId) return;
    if (mediaType !== 'movie' && mediaType !== 'tv') return;

    void onFetchContentDetail(mediaType, contentId);
  }, [isHover, detail, savedRating, mediaType, contentId, onFetchContentDetail]);

  // 로그인한 계정의 구매내역 실시간 확인
  useEffect(() => {
    if (!uid || !fromStore) return;

    let active = true;

    const unsubscribe = subscribeMyPurchases(
      uid,
      (items) => {
        if (active) {
          setPurchaseState({ uid, items });
        }
      },
      (error) => {
        if (active) {
          console.error('구매 여부 확인 실패:', error);
          setPurchaseState({ uid, items: [] });
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, fromStore]);

  // 작품 ID와 콘텐츠 종류가 일치하는 구매내역 확인
  const isPurchased =
    Boolean(uid) &&
    purchaseState.uid === uid &&
    purchaseState.items.some(
      (purchase) =>
        purchase.mediaType === type &&
        String(purchase.contentId) === String(item.id) &&
        purchase.status === 'mock_paid'
    );

  const needsPurchase = fromStore && !isPurchased;

  const channelSubscription = useContext(
    ChannelSubscriptionContext
  );

  const subscriptionPending =
    Boolean(channelSubscription) &&
    channelSubscription.loading;

  const subscriptionError =
    channelSubscription?.error || '';

  const needsSubscription =
    Boolean(channelSubscription) &&
    !channelSubscription.isSubscribed;

  const buttonBlocked =
    subscriptionPending || Boolean(subscriptionError);

  // TMDB 예고편 가져오기
  useEffect(() => {
    setVideoKey(null);
    setIsVideoReady(false);

    if (!isHover) return;

    const controller = new AbortController();

    const fetchVideo = async () => {
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;

        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${apiKey}&language=ko-KR`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('영상 요청 실패');
        }

        const data = await response.json();

        // 유튜브 예고편 우선 선택
        let video =
          data.results?.find(
            (video) =>
              video.site === 'YouTube' &&
              video.type === 'Trailer'
          ) ||
          data.results?.find(
            (video) => video.site === 'YouTube'
          );

        // 한국어 영상이 없으면 영어 영상 조회
        if (!video) {
          const enResponse = await fetch(
            `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${apiKey}&language=en-US`,
            { signal: controller.signal }
          );

          if (!enResponse.ok) {
            throw new Error('영어 영상 요청 실패');
          }

          const enData = await enResponse.json();

          video =
            enData.results?.find(
              (video) =>
                video.site === 'YouTube' &&
                video.type === 'Trailer'
            ) ||
            enData.results?.find(
              (video) => video.site === 'YouTube'
            );
        }

        if (!controller.signal.aborted) {
          setVideoKey(video?.key || null);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('영상 불러오기 실패:', error);
        }
      }
    };

    fetchVideo();

    return () => controller.abort();
  }, [isHover, item.id, type]);

  return (
    <div className="card-hover-content">
      <div className="preview-video-cover">
        {/* 영상이 준비되기 전까지 포스터 표시 */}
        <img
          className={`preview-poster ${
            isVideoReady ? 'hide' : ''
          }`}
          src={`https://image.tmdb.org/t/p/w780${
            item.backdrop_path || item.poster_path
          }`}
          alt={name}
        />

        {isHover && videoKey && (
          <iframe
            key={`${item.id}-${videoKey}`}
            className="preview-video"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&playsinline=1&disablekb=1&fs=0`}
            title={`${name} 예고편`}
            allow="autoplay; encrypted-media"
            onLoad={() => setIsVideoReady(true)}
            tabIndex={-1}
          />
        )}
      </div>

      <div className="content">
        <h4 className="content-title">{name}</h4>

        <div className="content-info">
          {rating !== null && (
            <p className="info-rating" aria-label={`5점 만점 평점 ${rating.toFixed(1)}`}>
              {rating.toFixed(1)} / 5
            </p>
          )}

          <p className="info-meta">
            <span className="meta-year">{year}</span>
            <span className="meta-genre">
              {type === 'movie' ? '영화' : '시리즈'}
            </span>
          </p>

          <p className="meta-tag quality">HD</p>
        </div>

        <div className={deleteButton ? "button-box button-box--resume" : "button-box"}>
          {/* 미구매: 구매 페이지 / 구매 완료: 재생 페이지 */}
          <Link
            to={
              needsSubscription
                ? channelSubscription.checkoutPath
                : needsPurchase
                  ? `/purchase/checkout/${type}/${item.id}`
                  : `/watch/${type}/${item.id}`
            }
            className={`button main-btn ${
              needsSubscription
                ? 'icon-subscribe'
                : needsPurchase
                  ? 'icon-purchase'
                  : 'icon-play'
            }`}
            aria-disabled={buttonBlocked || undefined}
            onClick={(event) => {
              if (buttonBlocked) {
                event.preventDefault();
              }
            }}
            state={
              needsSubscription || needsPurchase
                ? undefined
                : item.resume
                  ? {
                      content: item,
                      ownerKey: item.ownerKey,
                      resumeAt: item.position ?? 0,
                      seasonNumber: item.seasonNumber ?? 1,
                      episodeNumber: item.episodeNumber ?? 1,
                      videoSrc: item.videoSrc || '',
                      youtubeKey: item.youtubeKey || '',
                      autoPlayNext: true,
                    }
                  : { content: item }
            }
          >
            {subscriptionPending
              ? '구독 확인 중'
              : subscriptionError
                ? '구독 확인 실패'
                : needsSubscription
                  ? '구독하기'
                  : needsPurchase
                    ? '구매하기'
                    : item.resume
                      ? '이어보기'
                      : '재생하기'}
          </Link>

          {/* 상세페이지 이동 */}
          <Link
            to={`/detail/${type}/${item.id}${
              fromStore ? '?from=store' : ''
            }`}
            className="button icon-details"
            state={{ content: item, fromStore }}
            aria-label="상세정보"
          >
            <span
              className="details-text"
              aria-hidden="true"
            >
              상세정보
            </span>
          </Link>

          <div className="card-hover-actions">
            {/* 찜하기 */}
            <button
              type="button"
              className={`button circle-btn icon-dibs${isSaved ? ' is-active' : ''}`}
              onClick={handleWatchlist}
              disabled={isSavingWatchlist || watchlistLoading}
              aria-pressed={isSaved}
              aria-label={isSaved ? '찜 해제' : '찜하기'}
              title={isSaved ? '찜 해제' : '찜하기'}
            >
              <span className="sr-only">
                {isSavingWatchlist
                  ? '찜 목록 변경 중'
                  : isSaved
                    ? '찜 해제'
                    : '찜하기'}
              </span>
            </button>
            {deleteButton}
          </div>
        </div>
      </div>
    </div>
  );
};
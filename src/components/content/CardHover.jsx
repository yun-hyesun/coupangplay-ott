import { formatFivePointRating } from '../../utils/rating';
import { useCallback, useEffect, useState, useContext, useRef } from 'react';
import YouTube from 'react-youtube';
import { useNavigate, Link } from 'react-router-dom';
import { useProfileStore } from '../../store/useProfileStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useAuthStore } from '../../store/useAuthStore';
import { subscribeMyPurchases } from '../../service/purchaseService';
import { ChannelSubscriptionContext } from '../../page/channel/components/ChannelSubscriptionGate';
import { getCachedPreviewVideos, getVideoFallback, loadPreviewVideos, selectPreviewVideos, videoTypeLabels } from '../../data/videoFallback';
import { prepareVisiblePreview } from './previewPrefetch';
import './scss/CordHover.scss';

const PREVIEW_START_TIMEOUT_MS = 6000;

function HoverVideo({ mediaType, id, title, originalLanguage }) {
  const fallback = getVideoFallback(mediaType, id, 'preview');
  const [cachedVideos] = useState(() => getCachedPreviewVideos(mediaType, id, originalLanguage));
  const [attempt, setAttempt] = useState(() => ({
    sources: selectPreviewVideos(cachedVideos, fallback),
    index: 0,
    started: false,
  }));
  const preview = attempt.sources[attempt.index];

  useEffect(() => {
    if (cachedVideos) return;
    let mounted = true;

    loadPreviewVideos(mediaType, id, originalLanguage, import.meta.env.VITE_TMDB_API_KEY)
      .then((videos) => {
        if (mounted) {
          setAttempt((current) => ({ ...current, sources: selectPreviewVideos(videos, fallback) }));
        }
      })
      .catch((error) => {
        if (mounted && error.name !== 'TimeoutError') console.error('영상 불러오기 실패:', error);
      });

    return () => { mounted = false; };
  }, [cachedVideos, fallback, id, mediaType, originalLanguage]);

  const failPreview = useCallback((youtubeId, beforeStartOnly = false) => {
    setAttempt((current) => {
      if (current.sources[current.index]?.youtubeId !== youtubeId) return current;
      if (beforeStartOnly && current.started) return current;
      return { ...current, index: current.index + 1, started: false };
    });
  }, []);

  useEffect(() => {
    if (!preview || attempt.started) return;
    const timer = window.setTimeout(() => failPreview(preview.youtubeId, true), PREVIEW_START_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [attempt.started, failPreview, preview]);

  if (!preview) return null;

  return (
    <YouTube
      key={preview.youtubeId}
      videoId={preview.youtubeId}
      title={`${title} ${videoTypeLabels[preview.videoType] || '미리보기'}`}
      className="preview-player"
      style={{ opacity: attempt.started ? 1 : 0 }}
      opts={{
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: preview.youtubeId,
          playsinline: 1, disablekb: 1, fs: 0,
          ...(preview.endSeconds ? { end: preview.endSeconds } : {}),
        },
      }}
      onReady={({ target }) => {
        target.getIframe().tabIndex = -1;
        target.mute();
        target.playVideo();
      }}
      onPlay={() => {
        setAttempt((current) => {
          if (current.sources[current.index]?.youtubeId !== preview.youtubeId || current.started) return current;
          return { ...current, started: true };
        });
      }}
      onError={() => failPreview(preview.youtubeId)}
    />
  );
}

export const CardHover = ({
  item,
  type,
  isHover,
  fromStore = false,
}) => {
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
  const previewCardRef = useRef(null);
  const { id, original_language: originalLanguage } = item;

  useEffect(() => {
    return prepareVisiblePreview(
      previewCardRef.current?.parentElement,
      mediaType,
      id,
      originalLanguage,
      import.meta.env.VITE_TMDB_API_KEY,
    );
  }, [id, mediaType, originalLanguage]);

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
  const rating = formatFivePointRating(item.vote_average, 10);

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

  const posterPath = item.backdrop_path || item.poster_path;
  const previewPoster = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : item.imageUrl;

  return (
    <div className="card-hover-content" ref={previewCardRef}>
      <div className="preview-video-cover">
        {/* 영상이 준비되기 전까지 포스터 표시 */}
        {previewPoster && <img className="preview-poster" src={previewPoster} alt={name} />}

        {isHover && (
          <HoverVideo
            key={`${mediaType}/${item.id}/${item.original_language || ''}`}
            mediaType={mediaType}
            id={item.id}
            title={name}
            originalLanguage={item.original_language}
          />
        )}
      </div>

      <div className="content">
        <h4 className="content-title">{name}</h4>

        <div className="content-info">
          <p className="info-rating" aria-label={`5점 만점 평점 ${rating}`}>{rating} / 5</p>

          <p className="info-meta">
            <span className="meta-year">{year}</span>
            <span className="meta-genre">
              {type === 'movie' ? '영화' : '시리즈'}
            </span>
          </p>

          <p className="meta-tag quality">HD</p>
        </div>

        <div className="button-box">
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
        </div>
      </div>
    </div>
  );
};

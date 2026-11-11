import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardHover } from './CardHover';
import { Popup } from '../common/Popup';
import { useMovieStore } from '../../store/useMovieStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import { subscribeMyPurchases } from '../../service/purchaseService';
import "./scss/ContentCard.scss"

// Swiper와 Grid가 공통으로 쓰는 카드 (기존 hover 및 class 유지)
const CardVisual = ({ selection, label, to, state, children }) => {
  if (selection) {
    return (
      <button
        type="button"
        className="contentRail-visual contentRail-select"
        aria-label={label}
        aria-pressed={selection.selected}
        disabled={selection.disabled}
        onClick={selection.onToggle}
      >
        {children}
      </button>
    );
  }

  if (!to) return <div className="contentRail-visual">{children}</div>;

  return (
    <Link className="contentRail-visual" to={to} state={state} aria-label={label}>
      {children}
    </Link>
  );
};

export const ContentCard = ({ item, type = 'movie', imageType = '가로', variant = 'default', index = 0, fromStore = false, selection, listEntry = false }) => {
  if (item?.source === 'youtube') {
    const isLive = item.kind === 'live';
    return (
      <article className="contentRail-card contentRail-card--hor">
        <div className="contentRail-info youtube-card">
          <Link
            className="contentRail-visual "
            to={`/watch/sports/${encodeURIComponent(item.id)}`}
            state={{ title: item.title }}
            aria-label={`${isLive ? 'LIVE · ' : ''}${item.title} 재생`}
          >
            <img src={item.thumbnail} alt="" loading="lazy" />
            {isLive && <span className="contentCard-badge live"><i aria-hidden="true"><span></span></i>LIVE</span>}
          </Link>
          {!item.hideTitle && (
            <p className="contentCard-sportsTitle">{item.title}</p>
          )}
        </div>
      </article>
    );
  }

  if (item?.resume) {
    return <ResumeContentCard item={item} selection={selection} />;
  }

  return <TmdbContentCard {...{ item, type, imageType, variant, index, fromStore, selection, listEntry }} />;
};

const ResumeContentCard = ({ item, selection }) => {
  const [isHover, setIsHover] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const onDeleteHistory = useWatchHistoryStore((state) => state.onDeleteHistory);
  const canDelete = !selection && !item.historyLayout && item.docId && item.ownerKey;

  const openDeletePopup = () => {
    setDeleteError(false);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteError(false);
    try {
      if (await onDeleteHistory([item.docId], item.ownerKey)) return true;
    } catch (error) {
      console.error('시청내역 삭제 실패:', error);
    }
    setDeleteError(true);
    return false;
  };

  const {
    id,
    title,
    media_type,
    position,
    seasonNumber,
    episodeNumber,
  } = item;

  const deleteButton = canDelete ? (
    <button
      type="button"
      className="button circle-btn icon-delete contentCard-resumeDelete"
      aria-label={`${title} 시청기록 삭제`}
      title="시청기록 삭제"
      onClick={openDeletePopup}
    ></button>
  ) : null;

  return (
    <article
      className="contentRail-card contentRail-card--hor watchRail"
      data-history-layout={item.historyLayout ? 'list' : undefined}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onFocus={() => setIsHover(false)}
    >
      <div className="contentRail-info">
        <CardVisual
          selection={selection}
          to={`/watch/${media_type}/${id}`}
          state={{
            content: item,
            ownerKey: item.ownerKey,
            resumeAt: position ?? 0,
            seasonNumber: seasonNumber ?? 1,
            episodeNumber: episodeNumber ?? 1,
            videoSrc: item.videoSrc || '',
            youtubeKey: item.youtubeKey || '',
            autoPlayNext: true,
          }}
          label={selection ? title : `${title} 이어서 시청하기`}
        >
          {(item.backdrop_path || item.poster_path) && (
            <img
              src={`https://image.tmdb.org/t/p/w780${item.backdrop_path || item.poster_path}`}
              alt=""
              loading="lazy"
            />
          )}

          <progress
            max="100"
            value={Math.max(0, Math.min(100, item.progress || 0))}
            aria-label="시청 진행률"
            className="contentCard-progress"
          />
        </CardVisual>

        <p className="contentCard-sportsTitle">{title}</p>

        <p className="contentCard-resumeInfo">
          {media_type === 'tv' && (
            <span>
              시즌 {seasonNumber ?? 1} {episodeNumber ?? 1}화
            </span>
          )}

          {item.duration > 0 && (
            <span>
              {media_type === 'tv' && ' · '}
              {Math.ceil(
                Math.max(0, item.duration - (position ?? 0)) / 60
              )}분 남음
            </span>
          )}
        </p>
      </div>

      {!selection && (
        <CardHover
          item={item}
          type={media_type}
          isHover={isHover}
          deleteButton={deleteButton}
        />
      )}
      {deleteOpen && (
        <Popup
          title="시청내역을 삭제하시겠습니까?"
          description="삭제한 내역은 복구할 수 없습니다."
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
          confirmText="삭제"
          error={deleteError ? '시청내역을 삭제하지 못했습니다. 다시 시도해 주세요.' : ''}
        />
      )}
    </article>
  );
};

const TmdbContentCard = ({ item, type, imageType, variant, index, fromStore, selection, listEntry }) => {
  const [isHover, setIsHover] = useState(false);

  const mediaType = item?.media_type || (type === 'all' ? 'tv' : type);
  const id = item?.id;
  const uid = useAuthStore((state) => state.user?.uid);

const [purchaseState, setPurchaseState] = useState({
  uid: null,
  items: [],
});

useEffect(() => {
  if (!uid) return;

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
}, [uid]);

const isPurchased =
  Boolean(uid) &&
  purchaseState.uid === uid &&
  purchaseState.items.some(
    (purchase) =>
      purchase.mediaType === mediaType &&
      String(purchase.contentId) === String(id) &&
      purchase.status === 'mock_paid'
  );
  const name = item?.title || item?.name;
  const imagePath =
    imageType === '세로' ? item?.poster_path : item?.backdrop_path;

  const isTmdb = mediaType === 'movie' || mediaType === 'tv';
  const fallbackPath = listEntry ? item?.poster_path : undefined;
  const artworkPath = imagePath || fallbackPath;
  const imageUrl = artworkPath
    ? `https://image.tmdb.org/t/p/w780${artworkPath}`
    : listEntry ? item?.imageUrl : undefined;

  const purchaseKey = `${mediaType}-${id}`;
  const canBuy = useMovieStore(
    (state) => state.purchaseAvailability[purchaseKey]
  );
  const onCheckPurchase = useMovieStore((state) => state.onCheckPurchase);

  const isKnownPurchase = item?.isPurchase === true;
  const isPurchase = isKnownPurchase || canBuy === true;

  useEffect(() => {
    if (isTmdb && id && imagePath && !isKnownPurchase) {
      onCheckPurchase(mediaType, id);
    }
  }, [id, imagePath, isKnownPurchase, isTmdb, mediaType, onCheckPurchase]);

  if (!item || (!imageUrl && !listEntry)) return null;

  return (
    <article
      className={`contentRail-card ${imageType === '세로' ? 'contentRail-card--ver' : 'contentRail-card--hor'}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onFocus={() => setIsHover(false)}
    >
      {variant === 'ranking' && index < 20 && (
        <span className="contentRail-rank" aria-label={`${index + 1}위`}>
          <img src={`/images/ranking/ranking_${index + 1}.svg`} alt="" />
        </span>
      )}
      <div className="contentRail-info">
        <CardVisual
          selection={selection}
          to={isTmdb ? `/detail/${mediaType}/${id}${fromStore ? '?from=store' : ''}` : undefined}
          state={fromStore ? { fromStore: true } : undefined}
          label={selection ? name : `${name} 상세보기${item.isCoupangSeries ? ', 쿠팡플레이' : ''}${isPurchased ? ', 구매완료' : isPurchase ? ', 개별구매' : ''}`}
        >
          {imageUrl && (
            <img src={imageUrl} alt={imageType === '가로' ? '' : name} loading="lazy" />
          )}
          {imageType === '가로' && (
            <div className="contentRail-titleArea">
              {item.logo_path ? (
                <img className="contentRail-tit-logo" src={`https://image.tmdb.org/t/p/original${item.logo_path}`} alt={name} loading="lazy" />
              ) : <h4 className="contentRail-tit">{name}</h4>}
            </div>
          )}
          {(item.isCoupangSeries || isPurchase || isPurchased) && (
            <div className="contentRail-badges" aria-hidden="true">
              {item.isCoupangSeries && (
                <span className="contentCard-badge coupang">
                  시리즈
                </span>
              )}

              {(isPurchase || isPurchased) && (
                <span
                  className={`contentCard-badge ${
                    isPurchased ? 'purchased' : 'purchase'
                  }`}
                >
                  {isPurchased ? '구매완료' : '개별구매'}
                </span>
              )}
            </div>
          )}
        </CardVisual>
        {listEntry && (
          <div className="contentRail-list-info">
            <p className="contentRail-list-title">{name}</p>
            {item.hidden && <p>숨긴 콘텐츠</p>}
          </div>
        )}
      </div>
      {!selection && isTmdb && imageUrl && (
        <CardHover item={item} type={mediaType} isHover={isHover} fromStore={fromStore} />
      )}
    </article>
  );
};



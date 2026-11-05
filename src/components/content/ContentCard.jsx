import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardHover } from './CardHover';
import { useMovieStore } from '../../store/useMovieStore';
import "./scss/ContentCard.scss"

// Swiper와 Grid가 공통으로 쓰는 카드 (기존 hover 및 class 유지)
export const ContentCard = ({ item, type = 'movie', imageType = '가로', variant = 'default', index = 0 }) => {
  const [isHover, setIsHover] = useState(false);

  const mediaType = item?.media_type || (type === 'all' ? 'tv' : type);
  const id = item?.id;
  const name = item?.title || item?.name;
  const imagePath =
    imageType === '세로' ? item?.poster_path : item?.backdrop_path;

  const purchaseKey = `${mediaType}-${id}`;
  const canBuy = useMovieStore(
    (state) => state.purchaseAvailability[purchaseKey]
  );
  const onCheckPurchase = useMovieStore((state) => state.onCheckPurchase);

  const isKnownPurchase = item?.isPurchase === true;
  const isPurchase = isKnownPurchase || canBuy === true;

  useEffect(() => {
    if (id && imagePath && !isKnownPurchase) {
      onCheckPurchase(mediaType, id);
    }
  }, [id, imagePath, isKnownPurchase, mediaType, onCheckPurchase]);

  if (!item || !imagePath) return null;
  
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
        <Link to={`/detail/${mediaType}/${id}`} className="contentRail-visual" aria-label={`${name} 상세보기${item.isCoupangSeries ? ', 쿠팡플레이' : ''}${isPurchase ? ', 개별구매' : ''}`}>
          <img src={`https://image.tmdb.org/t/p/w780${imagePath}`} alt={imageType === '가로' ? '' : name} loading="lazy" />
          {imageType === '가로' && (
            <div className="contentRail-titleArea">
              {item.logo_path ? (
                <img className="contentRail-tit-logo" src={`https://image.tmdb.org/t/p/original${item.logo_path}`} alt={name} loading="lazy" />
              ) : <h4 className="contentRail-tit">{name}</h4>}
            </div>
          )}
          {(item.isCoupangSeries || isPurchase) && (
            <div className="contentRail-badges" aria-hidden="true">
              {item.isCoupangSeries && (
                <span className="contentCard-badge coupang">시리즈</span>
              )}

              {isPurchase && (
                <span className="contentCard-badge purchase">개별구매</span>
              )}
            </div>
          )}
        </Link>
      </div>
      <CardHover item={item} type={mediaType} isHover={isHover} />
    </article>
  );
};

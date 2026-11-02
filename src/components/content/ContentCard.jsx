import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CardHover } from './CardHover';

// Swiper와 Grid가 공통으로 쓰는 카드 (기존 hover 및 class 유지)
export const ContentCard = ({ item, type = 'movie', imageType = '가로', variant = 'default', index = 0 }) => {
  const [isHover, setIsHover] = useState(false);
  if (!item) return null;
  const mediaType = type === 'all' ? (item.media_type || 'tv') : type;
  const name = item.title || item.name;
  const imagePath = imageType === '세로' ? item.poster_path : item.backdrop_path;
  if (!imagePath) return null;
  
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
        <Link to={`/${mediaType}/${item.id}`} className="contentRail-visual" aria-label={`${name} 상세정보`}>
          <img src={`https://image.tmdb.org/t/p/w780${imagePath}`} alt={imageType === '가로' ? '' : name} loading="lazy" />
          {imageType === '가로' && (
            <div className="contentRail-titleArea">
              {item.logo_path ? (
                <img className="contentRail-tit-logo" src={`https://image.tmdb.org/t/p/original${item.logo_path}`} alt={name} loading="lazy" />
              ) : <h4 className="contentRail-tit">{name}</h4>}
            </div>
          )}
        </Link>
      </div>
      <CardHover item={item} type={mediaType} isHover={isHover} />
    </article>
  );
};

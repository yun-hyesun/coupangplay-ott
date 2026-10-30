import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import { useMovieStore } from '../../store/useMovieStore';

import 'swiper/css';
import './scss/ContentRail.scss';
import { CardHover } from './CardHover';

export const ContentRail = ({
  title,
  type = 'movie',
  genre,
  country,
  sort = 'popularity.desc',
  slideView = "auto",
  variant = 'default',
  imageType = '가로',
  ended = false, // 완결된 시리즈만
  untilYear,     // 이 연도까지 개봉·첫 방영
  minVotes,      // 최소 평가 수
}) => {
  const railId = `${type}-${genre}-${country}-${sort}` + `-${ended}-${untilYear}-${minVotes}`;

  const items = useMovieStore((state) => state.rails[railId]);
  const onFetchRail = useMovieStore((state) => state.onFetchRail);

  useEffect(() => {
  const params = {
    sort_by: sort,
  };

  if (genre) params.with_genres = genre;
  if (country) params.with_origin_country = country;

  // TV 완결작
  if (type === 'tv' && ended) {
    params.with_status = '3';
  }

  // 지정 연도까지 개봉·첫 방영한 작품
  if (untilYear) {
    const dateKey =
      type === 'movie'
        ? 'primary_release_date.lte'
        : 'first_air_date.lte';

    params[dateKey] = `${untilYear}-12-31`;
  }

  // 최소 평가 수
  if (minVotes) {
    params['vote_count.gte'] = String(minVotes);
  }

  onFetchRail(railId, type, params);
}, [railId,type,genre,country,sort,ended,untilYear,minVotes,onFetchRail,]);

// 카드호버
  const [hoveredId, setHoveredId] = useState(null);


  return (
    <section
      className={`contentRail contentRail--${variant} ${
        imageType === '세로' ? 'contentRail--poster' : 'contentRail--landscape'
      }`}
    >
      <h3 className='contentRail-title'>{title}</h3>

      <Swiper 
      modules={[Navigation, A11y]}
      navigation
      a11y={{
        prevSlideMessage: '이전 배너',
        nextSlideMessage: '다음 배너',
      }}
      slidesPerView={slideView} 
      spaceBetween={10}
      >
        {items
          ?.filter((item) =>
            imageType === '세로' ? item.poster_path : item.backdrop_path
          )
          .map((item, index) => {
            const name = item.title || item.name;

            const imagePath =
              imageType === '세로' ? item.poster_path : item.backdrop_path;

            return (
              <SwiperSlide key={`${item.media_type}-${item.id}`}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              >
                <article
                  className={`contentRail-card ${
                    imageType === '세로'
                      ? 'contentRail-card--ver' : 'contentRail-card--hor'
                  }`}
                >
                  {variant === 'ranking' && (
                    <span
                      className="contentRail-rank"
                      aria-label={`${index + 1}위`}
                    >
                      <img src={`/images/ranking/ranking_${index + 1}.svg`} alt="" />
                    </span>
                  )}

                  <div className="contentRail-info">
                    <div className="contentRail-visual">
                      <img
                        src={`https://image.tmdb.org/t/p/w780${imagePath}`}
                        alt={imageType === '가로' ? '' : name}
                        loading="lazy"
                      />

                      {imageType === '가로' && (
                        <div className="contentRail-titleArea">
                          {item.logo_path ? (
                            <img
                              className="contentRail-tit-logo"
                              src={`https://image.tmdb.org/t/p/original${item.logo_path}`}
                              alt={name}
                              loading="lazy"
                            />
                          ) : (
                            <h4 className="contentRail-tit">
                              {name}
                            </h4>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <CardHover
                    item={item}
                    type={type === 'all' ? (item.media_type || 'tv') : type}
                    isHover={hoveredId === item.id}
                  />
                </article>
              </SwiperSlide>
            );
          })}
      </Swiper>
    </section>
  );
};
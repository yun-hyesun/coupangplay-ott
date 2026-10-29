import { useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useMovieStore } from '../../store/useMovieStore';

import 'swiper/css';
import './scss/ContentRail.scss';

export const ContentRail = ({
  title,
  type = 'movie',
  genre,
  country,
  sort = 'popularity.desc',
  slideView = 6,
  variant = 'default',
  imageType = '가로',
}) => {
  const railId = `${type}-${genre}-${country}-${sort}`;

  const items = useMovieStore((state) => state.rails[railId]);
  const onFetchRail = useMovieStore((state) => state.onFetchRail);

  useEffect(() => {
    const params = {
      sort_by: sort,
    };

    if (genre) params.with_genres = genre;
    if (country) params.with_origin_country = country;

    onFetchRail(railId, type, params);
  }, [railId, type, genre, country, sort, onFetchRail]);

  return (
    <section
      className={`contentRail contentRail--${variant} ${
        imageType === '세로'
          ? 'contentRail--poster'
          : 'contentRail--landscape'
      }`}
    >
      <h3>{title}</h3>

      <Swiper slidesPerView={slideView} spaceBetween={40}>
        {items
          ?.filter((item) =>
            imageType === '세로'
              ? item.poster_path
              : item.backdrop_path
          )
          .map((item, index) => {
            const name = item.title || item.name;

            const imagePath =
              imageType === '세로'
                ? item.poster_path
                : item.backdrop_path;

            return (
              <SwiperSlide key={item.id}>
                <article className="contentRail__card">
                  {variant === 'ranking' && (
                    <span
                      className="contentRail__rank"
                      aria-label={`${index + 1}위`}
                    >
                      {index + 1}
                    </span>
                  )}

                  <div className="contentRail__info">
                    <div className="contentRail__visual">
                      <img
                        src={`https://image.tmdb.org/t/p/w780${imagePath}`}
                        alt={name}
                        loading="lazy"
                      />

                      {imageType === '가로' && (
                        <h4 className="contentRail__imageTitle">
                          {name}
                        </h4>
                      )}
                    </div>
                  </div>
                </article>
              </SwiperSlide>
            );
          })}
      </Swiper>
    </section>
  );
};
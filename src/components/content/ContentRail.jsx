import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import { useMovieStore } from '../../store/useMovieStore';
import { railConfig } from '../../data/railConfig';
import { makeParams, makeRailId } from '../../data/contentQuery';
import { ContentCard } from './ContentCard';
import { ContentTitle } from './ContentTitle';
import 'swiper/css';
import './scss/ContentRail.scss';

// railKey: 홈과 더보기가 같은 조건 사용 / items: 상세페이지 추천처럼 외부 데이터 전달
export const ContentRail = ({ railKey, items: givenItems, showMore = true, ...options }) => {
  const config = railKey ? railConfig[railKey] : options;
  const configId = makeRailId(config || {});
  const type = config?.type || 'movie';
  const imageType = config?.imageType || '가로';
  const savedItems = useMovieStore((state) => state.rails[configId]);
  const loading = useMovieStore((state) => state.railLoading[configId]);
  const error = useMovieStore((state) => state.railErrors[configId]);
  const onFetchRail = useMovieStore((state) => state.onFetchRail);

  useEffect(() => {
    if (config && givenItems === undefined) onFetchRail(configId, type, makeParams(config));
  }, [configId, type, onFetchRail, givenItems]);

  if (!config) return null;
  const items = givenItems ?? savedItems ?? [];
  const visible = items.filter((item) => imageType === '세로' ? item.poster_path : item.backdrop_path).slice(0, config.limit || 20);
  
  return (
    <section className={`contentRail contentRail--${config.variant || 'default'} ${imageType === '세로' ? 'contentRail--poster' : 'contentRail--landscape'}`}>
      <div className="contentRail-heading">

        {/* 타이틀 */}
        <ContentTitle title={config.title} />

        {railKey && showMore && <Link className="contentRail-more" to={`/more?rail=${encodeURIComponent(railKey)}`}>더보기</Link>}
      </div>
      {loading && !items.length && <p role="status">콘텐츠를 불러오는 중입니다.</p>}
      {error && <p role="alert">{error}</p>}
      <Swiper modules={[Navigation, A11y]} navigation a11y={{ prevSlideMessage: '이전 작품', nextSlideMessage: '다음 작품' }} slidesPerView={config.slideView || 'auto'} spaceBetween={10}>
        {visible.map((item, index) => (
          <SwiperSlide key={`${item.media_type || type}-${item.id}`}>
            <ContentCard item={item} type={type} imageType={imageType} variant={config.variant} index={index} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

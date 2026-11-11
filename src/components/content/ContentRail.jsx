import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import { useMovieStore } from '../../store/useMovieStore';
import { railConfig } from '../../data/railConfig';
import { makeParams, makeRailId } from '../../data/contentQuery';
import { ContentCard } from './ContentCard';
import { ContentTitle } from './ContentTitle';
import { railBreakpoints } from '../../data/railBreakpoints';
import 'swiper/css';
import './scss/ContentRail.scss';

// railKey를 전달하면 홈과 더보기 페이지에서 같은 설정을 사용한다.
// items를 전달하면 상세 페이지 추천처럼 외부에서 받은 작품을 표시한다.
export const ContentRail = ({
  railKey,
  asGrid = false,
  getSelection,
  items: givenItems,
  showMore = true,
  kidsOnly = false,
  intro,
  layout = 'horizontal',
  variant,
  ...options
}) => {
  const baseConfig = railKey
  ? {
      ...railConfig[railKey],
      title: options.title ?? railConfig[railKey]?.title,
    }
  : options;

  const config = baseConfig
    ? {
        ...baseConfig,
        variant: variant ?? baseConfig.variant ?? 'default',
        kidsOnly: kidsOnly || baseConfig.kidsOnly || false,
      }
    : null;

  const configId = makeRailId(config ?? {});
  const type = config?.type || 'movie';

  // layout으로 지정하면 카드 이미지 비율도 함께 변경
  const imageType =
    layout === 'vertical'
      ? '세로'
      : config?.imageType || '가로';

  // 왼쪽 채널 소개(intro)가 있으면 채널형 설정 적용
  const railType =
    intro || layout === 'channel'
      ? 'channel'
      : config?.variant === 'ranking'
        ? 'ranking'
        : imageType === '세로'
          ? 'vertical'
          : 'horizontal';

  const breakpoints = railBreakpoints[railType];
  

  const savedItems = useMovieStore((state) => state.rails[configId]);
  const loading = useMovieStore((state) => givenItems === undefined && state.railLoading[configId]);
  const error = useMovieStore((state) => givenItems === undefined && state.railErrors[configId]);
  const onFetchRail = useMovieStore((state) => state.onFetchRail);
  const location = useLocation();

  useEffect(() => {
    if (config && givenItems === undefined) {
      onFetchRail(configId, type, makeParams(config));
    }
  }, [configId, type, onFetchRail, givenItems]);

  if (!config) return null;

  const items = givenItems ?? savedItems ?? [];
  const isPoster = imageType === '세로';

  if (asGrid) {
    return (
      <div className="contentRail-list">
        {items.map((item) => {
          const itemType = item.media_type || type;

          return (
            <ContentCard
              key={item.docId || item.purchaseId || `${itemType}-${item.id}`}
              item={item}
              type={itemType}
              imageType={imageType}
              listEntry
              selection={getSelection?.(item)}
              fromStore={item.isPurchase === true}
            />
          );
        })}
      </div>
    );
  }
  const visibleItems = items
    .filter((item) => item.source === 'youtube'
      ? item.thumbnail
      : (isPoster ? item.poster_path : item.backdrop_path))
    .slice(0, config.limit || 20);

  const variantClass = `contentRail--${config.variant || 'default'}`;
  const imageClass = isPoster ? 'contentRail--poster' : 'contentRail--landscape';

  return (
    <section className={`contentRail ${variantClass} ${imageClass}${intro ? ' contentRail--withIntro' : ''}`}>
      <div className={intro ? 'contentRail-intro' : 'contentRail-heading'}>

      {intro?.titleImage ? (
        <h2 className="contentRail-intro-title">
          <img src={intro.titleImage} alt={config.title} />
        </h2>
      ) : (
        <ContentTitle title={config.title} />
      )}

      {intro && <p>{intro.description}</p>}

      {railKey && showMore && (
        <Link
          className={intro ? 'contentRail-intro-link button' : 'contentRail-more'}
          to={`/more?rail=${encodeURIComponent(railKey)}`}
          state={{ from: location.pathname }}
        >
          {intro?.linkText ?? '더보기'}
        </Link>
      )}
    </div>

      {loading && !items.length && (
        <p role="status">콘텐츠를 불러오는 중입니다.</p>
      )}
      {error && <p role="alert">{error}</p>}

      {railKey && railKey.includes('-') && config.useTving === false &&
        savedItems && !loading && !error && !visibleItems.length && (
          <p className="channel-page__empty">표시할 작품이 없습니다.</p>
      )}
      <Swiper
        modules={[Navigation, A11y]}
        navigation
        a11y={{
          prevSlideMessage: '이전 작품',
          nextSlideMessage: '다음 작품',
        }}
        // slidesPerView={config.slideView || 'auto'}
        // spaceBetween={10}
        slidesPerView={breakpoints[0].slidesPerView}
        spaceBetween={breakpoints[0].spaceBetween}
        breakpoints={breakpoints}
      >
        {visibleItems.map((item, index) => {
          const itemType = item.media_type || type;

          return (
            <SwiperSlide key={`${itemType}-${item.id}`}>
              <ContentCard
                item={item}
                type={itemType}
                imageType={imageType}
                variant={config.variant}
                index={index}
                fromStore={location.pathname === '/store' || railKey?.startsWith('store-')}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};


import { Link, useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import { ContentRail } from '../../components/content/ContentRail';
import { Channel } from '../home/components/Channel';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './scss/ChannelPage.scss';

const channelConfig = {
  paramount: {
    name: 'Paramount',
    logo: '/images/channal01.svg',
    description: '다양한 이야기로 만나는 미국 시리즈',
    sections: [
      { key: 'popular', title: '인기 미국 시리즈', ranking: true },
      { key: 'latest', title: '새로 만나는 미국 시리즈' },
      { key: 'crime', title: '멈출 수 없는 범죄·수사 시리즈' },
      { key: 'action', title: '긴장감 넘치는 액션·스릴러' },
      { key: 'completed', title: '정주행하기 좋은 시리즈' },
    ],
  },

  moa: {
    name: 'M.OA',
    logo: '/images/channal10.svg',
    description: '중국 드라마부터 예능까지, 새로운 즐거움',
    sections: [
      { key: 'popular', title: '인기 중국 드라마', ranking: true },
      { key: 'latest', title: '새로 만나는 중국 프로그램' },
      { key: 'romance', title: '설렘 가득한 로맨스' },
      { key: 'historical', title: '시대를 넘나드는 사극·무협' },
      { key: 'variety', title: '골라 보는 중국 예능' },
      { key: 'completed', title: '정주행하기 좋은 중국 드라마' },
    ],
  },
};

// contents 예시:
// {
//   paramount: { banner: [], popular: [], latest: [], ... },
//   moa: { banner: [], popular: [], latest: [], ... },
// }
//
// 각 배열에는 기존 ContentCard에서 사용하는 TMDB 작품 데이터를 전달
export const ChannelPage = ({ contents = {} }) => {
  const { channelId } = useParams();
  const config = channelConfig[channelId];

  if (!config) {
    return (
      <main className="channel-page channel-page--empty">
        <h1>채널을 찾을 수 없습니다.</h1>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    );
  }

  const data = contents[channelId] ?? {};
  const banners = (data.banner ?? [])
    .filter((item) => item.backdrop_path)
    .slice(0, 5);

  return (
    <main className={`channel-page channel-page--${channelId}`}>
      {/* 채널 소개 */}
      <header className="channel-page__heading">
        <Link to="/" className="channel-page__back">
          ← 홈으로
        </Link>

        <h1>
          <img src={config.logo} alt={config.name} />
        </h1>

        <p>{config.description}</p>
      </header>

      {/* 홈과 같은 배너 구조 및 스타일 사용 */}
      {banners.length > 0 && (
        <section
          className="main-banner"
          aria-label={`${config.name} 추천 작품`}
        >
          <Swiper
            key={channelId}
            modules={[Navigation, Pagination, A11y]}
            slidesPerView="auto"
            spaceBetween={20}
            navigation
            pagination={{ clickable: true }}
          >
            {banners.map((item, index) => {
              const title = item.name || item.title;
              const type = item.media_type || 'tv';

              return (
                <SwiperSlide key={`${type}-${item.id}`}>
                  <Link
                    className="main-banner-link"
                    to={`/detail/${type}/${item.id}`}
                    state={{ content: item }}
                    aria-label={`${title} 상세보기`}
                  >
                    <div className="banner-slide-list">
                      <img
                        className="slide-list-image"
                        src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                        alt=""
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />

                      <div className="slide-list-info">
                        <h2 className="info-title">{title}</h2>

                        {item.overview && (
                          <p className="info-description">
                            {item.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      )}

      {/* 기존 홈 채널 메뉴 */}
      <Channel />

      {/* 채널별 콘텐츠 목록 */}
      {config.sections.map((section) => {
        const items = data[section.key] ?? [];

        if (!items.length) return null;

        return (
          <ContentRail
            key={`${channelId}-${section.key}`}
            title={section.title}
            type="tv"
            items={items}
            variant={section.ranking ? 'ranking' : 'default'}
            layout={section.ranking ? 'vertical' : 'horizontal'}
            showMore={false}
          />
        );
      })}

      {!config.sections.some(
        (section) => data[section.key]?.length > 0
      ) && (
        <p className="channel-page__empty" role="status">
          채널 콘텐츠를 준비 중입니다.
        </p>
      )}
    </main>
  );
};
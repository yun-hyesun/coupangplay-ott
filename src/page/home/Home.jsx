import { useProfileWatchHistory } from '../../store/useProfileWatchHistory';
import { useSportsRails } from './useSportsRails';
import { MainBanner } from '../../components/content/MainBanner';
import { Channel } from './components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import { BannerHome } from './components/BannerHome';
import { WowClipSection } from './components/WowClipSection';


import './scss/home.scss';

export const Home = () => {
  const { highlights, newsLive = [], error } = useSportsRails();

  const { history, ownerKey } = useProfileWatchHistory();
  const continueWatching = history
    .filter((item) => item.backdrop_path && !item.completed)
    .map((item) => ({ ...item, resume: true, ownerKey }));

  return (
    <main>
      <MainBanner type="all"/>
      <Channel />

      {continueWatching.length > 0 && (
        <ContentRail title="이어서 시청하기" items={continueWatching} showMore={false} />
      )}

      <ContentRail railKey="home-ranking" showMore={false}/>

      <ContentRail railKey="home-latest" />

      {/* 지금 사람들이 함께 보는 콘텐츠 */}

      {/* 최근 본 콘텐츠와 비슷한 작품 */}


      <ContentRail railKey="home-binge" />


      <ContentRail railKey="home-movie" />

      <WowClipSection history={history} />

      {/* 스포츠 패스 광고 */}

      {error && <p role="alert">스포츠 영상을 불러오지 못했습니다.</p>}
      {highlights.length > 0 && (
        <ContentRail title="다시 보는 경기 하이라이트" items={highlights} showMore={false} />
      )}

      {/* {replays.length > 0 && (
        <ContentRail title="다시 보는 경기" items={replays} showMore={false} />
      )}
      {live.length > 0 && (
        <ContentRail title="지금 LIVE" items={live} showMore={false} />
      )} */}

      {newsLive.length > 0 && (
        <ContentRail title="지금 LIVE" items={newsLive} showMore={false} />
      )}

      <ContentRail railKey="home-drama" />


      <ContentRail railKey="home-fun" />

      {/* 오직 쿠팡플레이에서 */}
      <ContentRail railKey="home-coupang-series" />
      
      {/* 광고 배너 */}
      <BannerHome />

      {/* JPLUS */}
      <ContentRail
        railKey="home-jplus"
        intro={{
          titleImage: '/images/channal11.svg',
          description: '다채로운 일본 드라마를 한곳에서 만나보세요',
          linkText: '채널 둘러보기',
        }}
      />


      <ContentRail railKey="home-classics" />

      <ContentRail railKey="home-light" />

      {/* WOW 회원 콘텐츠 */}
    </main>
  );
};


import { MainBanner } from '../../components/content/MainBanner';
import { Channel } from './components/Channel';
import { ContentRail } from '../../components/content/ContentRail';

import './scss/home.scss';

export const Home = () => {
  return (
    <main>
      <MainBanner type="all"/>
      <Channel />

      {/* 이어서 시청하기: 시청 기록 연결 후 추가 */}

      <ContentRail railKey="home-ranking" showMore={false}/>

      <ContentRail railKey="home-latest" />

      {/* 지금 사람들이 함께 보는 콘텐츠 */}

      {/* 최근 본 콘텐츠와 비슷한 작품 */}

      {/* 와우 클립 */}

      <ContentRail railKey="home-binge" />

      <ContentRail railKey="home-movie" />

      {/* 스포츠 패스 광고 */}

      {/* 스포츠 하이라이트 */}

      {/* 지금 LIVE */}

      <ContentRail railKey="home-drama" />

      <ContentRail railKey="home-fun" />

      {/* 오직 쿠팡플레이에서 */}

      {/* 광고 배너 */}

      {/* JPLUS */}

      <ContentRail railKey="home-classics" />

      <ContentRail railKey="home-light" />

      {/* WOW 회원 콘텐츠 */}
    </main>
  );
};
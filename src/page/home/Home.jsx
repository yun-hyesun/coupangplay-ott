import { MainBanner } from '../../components/content/MainBanner';
import { Channel } from './components/Channel';
import { ContentRail } from '../../components/content/ContentRail';

import './scss/home.scss';

export const Home = () => {
  return (
    <main>
      <MainBanner />
      <Channel />

      <ContentRail
        title="인기 시리즈 TOP 20"
        type="tv"
        variant="ranking"
        imageType="세로"
      />

      <ContentRail
        title="최근 첫 방영한 시리즈"
        type="tv"
        sort="first_air_date.desc"
        imageType="가로"
      />

      <ContentRail
        title="지금 주목받는 영화"
        type="movie"
        imageType="가로"
      />
    </main>
  );
};
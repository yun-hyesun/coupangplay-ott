import { MainBanner } from '../../components/content/MainBanner';
import { ContentRail } from '../../components/content/ContentRail';

export const Entertainment = () => {
  return (
    <main className="drama-page">
      <MainBanner type="entertainment" />

      <ContentRail
        title="이번 주 예능 TOP 20"
        type="tv"
        sort="popularity.desc"
        imageType= '세로'
        variant="ranking"
        genre= '10764, 35'
        country= 'KR'
      />

      <ContentRail
        title="지금 뜨는 예능"
        type="tv"
        sort="first_air_date.desc"
        genre= '10764, 35'
        country= 'KR'
      />

      <ContentRail
        title="쿠팡플레이 오리지널 예능"
        type="tv"
        country= 'KR'
        sort="popularity.desc"
        genre= '10764, 35'
      />

      <ContentRail
        title="리얼리티 예능"
        type="tv"
        country= 'KR'
        sort="popularity.desc"
        genre= '10764'
      />

      <ContentRail
        title="토크쇼 예능"
        type="tv"
        country="KR"
        sort="popularity.desc"
        genre= '10767'
      />
    </main>
  );
};
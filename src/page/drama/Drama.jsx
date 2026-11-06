import { CategoryMenu } from '../../components/content/CategoryMenu';
import { MainBanner } from '../../components/content/MainBanner';
import { ContentRail } from '../../components/content/ContentRail';

export const Drama = () => {
  return (
    <main className="drama-page">
      <MainBanner type="drama" />
      <CategoryMenu section="drama" />

      <ContentRail
        title="이번 주 드라마 TOP 20"
        type="tv"
        sort="popularity.desc"
        imageType= '세로'
        variant="ranking"
        genre= '18'
        country= 'KR|US|CN'
      />

      <ContentRail
        title="새롭게 만나는 드라마"
        type="tv"
        sort="first_air_date.desc"
        genre= '18'
        country= 'KR|US|CN'
      />

      <ContentRail
        title="쿠팡플레이 오리지널 드라마"
        type="tv"
        country= 'KR|US|CN'
        sort="popularity.desc"
        genre= '18'
      />

      <ContentRail
        title="주말에 몰아보기 좋은 드라마"
        type="tv"
        country= 'KR'
        sort="popularity.desc"
        genre= '18,35'
      />

      <ContentRail
        title="아시아 드라마를 만나다"
        type="tv"
        country="CN"
        sort="popularity.desc"
        genre= '18'
      />
    </main>
  );
};

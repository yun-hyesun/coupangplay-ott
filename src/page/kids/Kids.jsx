
import { ContentRail } from '../../components/content/ContentRail';
import { MainBanner } from '../../components/content/MainBanner';

export const Kids = () => {
  return (
    <main>
      <MainBanner type="kids" />

      <ContentRail
        title="인기 키즈 애니메이션 TOP 20"
        kidsOnly
        type="tv"
        variant="ranking"
        sort="popularity.desc"
        imageType="세로"
        genre="16, 10759"
      />

      <ContentRail
        title="아이들이 좋아하는 프로그램"
        kidsOnly
        type="tv"
        sort="popularity.desc"
        imageType="가로"
        genre="10762"
      />

      <ContentRail
        title="신나는 모험의 세계"
        kidsOnly
        type="tv"
        genre="10759"
        // sort="first_air_date.desc"
        imageType="가로"
      />

      <ContentRail
        title="온 가족이 함께 보는 영화"
        kidsOnly
        type="movie"
        genre="10751"
        sort="primary_release_date.desc"
        imageType="가로"
      />

      <ContentRail
        title="상상력이 가득한 애니메이션 영화"
        kidsOnly
        type="movie"
        genre="16"
        sort="primary_release_date.desc"
        imageType="가로"
      />
    </main>
  );
};

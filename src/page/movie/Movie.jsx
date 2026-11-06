import { CategoryMenu } from '../../components/content/CategoryMenu';
import { ContentRail } from '../../components/content/ContentRail';
import { MainBanner } from '../../components/content/MainBanner';

export const Movie = () => {
  return (
    <main>
      <MainBanner type="movie"/>
      <CategoryMenu section="movie" />

      <ContentRail
        title="인기 영화 TOP 20" 
        type="movie"
        variant="ranking"
        sort="first_air_date.desc, primary_release_date.desc"
        imageType="세로"
        country="KR|US"
      />

      <ContentRail
        title="새롭게 찾아온 영화"
        type="movie"
        sort="primary_release_date.desc"
        imageType="가로"
        country="KR|US"
      />

      <ContentRail
        title="짜릿함이 폭발하는 순간"
        type="movie"
        genre="28"
        sort="first_air_date.desc, primary_release_date.desc"
        ended
        imageType="가로"
        country="KR|US"
      />

      <ContentRail
        title="놓치면 아쉬운 한국 영화"
        type="movie"
        imageType="가로"
        sort="primary_release_date.desc"
        country="KR"
      />

      <ContentRail
        title="설렘이 시작되는 순간"
        type="movie"
        genre="10749"
        imageType="가로"
        country="KR|CN"
        sort="first_air_date.desc"
      />

      <ContentRail
        title="관객이 사랑한 영화"
        type="movie"
        sort="vote_average.desc, popularity.desc"
        imageType="가로"
        country="KR|US"
        genre="18, 10749"
      />

      <ContentRail
        title="다시 꺼내 보는 명작"
        type="movie"
        untilYear={2020}
        minVotes={300}
        sort="vote_average.desc"
        imageType="가로"
        country="KR|US"
      />

      <ContentRail
        title="가볍게 보기 좋은 영화"
        type="movie"
        genre="35, 18, 10749"
        imageType="가로"
        sort="primary_release_date.desc"
        country="KR|US"
      />

    </main>
  );
};

import { ContentRail } from '../../components/content/ContentRail';

export const Movie = () => {
  return (
    <main>

      <ContentRail
        title="지금 주목받는 영화"
        type="movie"
        imageType="가로"
        slideView={6}
      />

      <ContentRail
        title="최근 개봉한 영화"
        type="movie"
        sort="primary_release_date.desc"
        imageType="세로"
        slideView={6}
      />

      <ContentRail
        title="가볍게 즐기는 코미디"
        type="movie"
        genre="35"
        imageType="가로"
        slideView={6}
      />
    </main>
  );
};
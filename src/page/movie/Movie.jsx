import { ContentRail } from '../../components/content/ContentRail';
import { MainBanner } from '../../components/content/MainBanner';

export const Movie = () => {
  return (
    <main>
      <MainBanner type="movie"/>

      <ContentRail
        title="인기 시리즈 TOP 20" 
        type="movie"
        variant="ranking"
        sort="first_air_date.desc, primary_release_date.desc"
        imageType="세로"
        country="KR|US"
      />

      <ContentRail
        title="새롭게 공개된 콘텐츠"
        type="tv"
        sort="first_air_date.desc"
        imageType="가로"
      />

      {/* 지금 사람들이 함께 보는 콘텐츠 */}

      {/* 최근 본 콘텐츠와 비슷한 작품 */}

      {/* 와우 클립 */}

      <ContentRail
        title="정주행하기 좋은 시리즈"
        type="tv"
        genre="18,35"
        ended
        imageType="가로"
        country="KR"
      />

      <ContentRail
        title="지금 주목받는 영화"
        type="movie"
        imageType="가로"
        sort="primary_release_date.desc"
        country="KR|US"
      />

      {/* 스포츠 패스 광고 */}

      {/* 스포츠 하이라이트 */}

      {/* 지금 LIVE */}

      <ContentRail
        title="지금 가장 핫한 드라마"
        type="tv"
        genre="18"
        imageType="가로"
        country="KR|US"
        sort="first_air_date.desc"
      />

      <ContentRail
        title="웃음이 필요할 때"
        type="tv"
        genre="10764,10767"
        sort="first_air_date.desc"
        imageType="가로"
      />

      {/* 오직 쿠팡플레이에서 */}

      {/* 광고 배너 */}

      {/* JPLUS */}

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

      {/* WOW 회원 콘텐츠 */}
    </main>
  );
};
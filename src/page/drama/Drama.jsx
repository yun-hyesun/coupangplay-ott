import { ContentRail } from '../../components/content/ContentRail';

export const Drama = () => {
  return (
    <main>
      <h1
        style={{
          padding: '32px clamp(20px, 4vw, 80px)',
          color: '#fff',
        }}
      >
        드라마
      </h1>

      <ContentRail
        title="지금 인기 있는 드라마"
        type="tv"
        genre="18"
        imageType="가로"
        slideView={6}
      />

      <ContentRail
        title="한국 드라마"
        type="tv"
        genre="18"
        country="KR"
        imageType="세로"
        slideView={6}
      />

      <ContentRail
        title="최근 첫 방영한 드라마"
        type="tv"
        genre="18"
        sort="first_air_date.desc"
        imageType="가로"
        slideView={6}
      />
    </main>
  );
};
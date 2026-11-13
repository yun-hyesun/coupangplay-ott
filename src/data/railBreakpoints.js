export const railBreakpoints = {
  // 기본 가로형
  horizontal: {
    0: { slidesPerView: 2, spaceBetween: 5 },
    767: { slidesPerView: 3, spaceBetween: 8 },
    900: { slidesPerView: 4, spaceBetween: 8 },
    1800: { slidesPerView: 5, spaceBetween: 10 },
    1920: { slidesPerView: 6, spaceBetween: 10 },
  },

  // 세로 포스터형
  vertical: {
    0: { slidesPerView: 3, spaceBetween: 5 },
    400: { slidesPerView: 3, spaceBetween: 8 },
    900: { slidesPerView: 5, spaceBetween: 8 },
    1800: { slidesPerView: 6, spaceBetween: 10 },
    1920: { slidesPerView: 8, spaceBetween: 10 },
  },

  // 랭킹형
  ranking: {
    0: { slidesPerView: 2.2, spaceBetween: 5 },
    600: { slidesPerView: 3.2, spaceBetween: 8 },
    767: { slidesPerView: 4.1, spaceBetween: 8 },
    1800: { slidesPerView: 5.1, spaceBetween: 50 },
    1920: { slidesPerView: 6.1, spaceBetween: 70 },
  },

  // 채널 로고형
  channel: {
    0: { slidesPerView: 2, spaceBetween: 5 },
    767: { slidesPerView: 2, spaceBetween: 8 },
    900: { slidesPerView: 3, spaceBetween: 8 },
    1800: { slidesPerView: 4, spaceBetween: 10 },
    1920: { slidesPerView: 5, spaceBetween: 10 },
  },
};
const extensionOverrides = {
  9: "png",
  29: "png",
  32: "jpg",
  35: "png",
  49: "jpg",
};

const thumbnail = (number) =>
  "/images/sports/Thumbnail/sports_thumbnail" +
  number +
  "." +
  (extensionOverrides[number] || "jfif");

const video = (number, title, category, duration, meta, rating) => ({
  image: thumbnail(number),
  title,
  category,
  duration,
  meta,
  rating,
});

export const SPORTS_HIGHLIGHTS = [
  // 2026-11-05 쿠팡플레이 스포츠 공식 유튜브 채널 최신순 경기 하이라이트.
  // 기존 카드 속성은 유지하고 썸네일·표시 제목·시안용 임의 별점만 교체합니다.
  {
    ...video(10, "포항 vs 감바 오사카 HL", "프리미어리그", "11:45", "하이라이트", "4.9"),
    image: "/images/sports/highlights/youtube-p_d3CB9PFXg.jpg",
  },
  {
    ...video(3, "서울 vs 비엣텔 HL", "라리가", "11:34", "하이라이트", "4.8"),
    image: "/images/sports/highlights/youtube-kroo-9EU46o.jpg",
  },
  {
    ...video(30, "전북 vs 조호르 HL", "프리미어리그", "11:37", "하이라이트", "4.7"),
    image: "/images/sports/highlights/youtube-s_86onMgdN4.jpg",
  },
  {
    ...video(60, "가시와 vs 대전 HL", "프리미어리그", "12:16", "하이라이트", "4.9"),
    image: "/images/sports/highlights/youtube-KA4ymhNr7OU.jpg",
  },
  {
    ...video(33, "LAFC vs 미네소타 HL", "프리미어리그", "11:45", "하이라이트", "4.6"),
    image: "/images/sports/highlights/youtube-QfhQVFp1RHg.jpg",
  },
];

export const SPORTS_TOGETHER = [
  // 공식 채널 최신순 주요장면 8개. 별점은 사용자 요청에 따른 시안용 값입니다.
  // 기존 디자인·추천영상 배지·나머지 카드 속성은 유지합니다.
  {
    ...video(35, "서울 vs 비엣텔 · 문선민 주요장면", "축구", "03:31", "2026.10.16", "4.9"),
    image: "/images/sports/together/youtube-hNT4U-DTBpU.jpg",
  },
  {
    ...video(30, "전북 vs 조호르 · 모따 주요장면", "NBA", "17:42", "2026.10.19", "4.8"),
    image: "/images/sports/together/youtube-kccBo8UCy2A.jpg",
  },
  {
    ...video(44, "피닉스 vs 골든스테이트 · 커리 주요장면", "스포츠", "13:27", "2026.10.21", "4.9"),
    image: "/images/sports/together/youtube-b6gcK2lfwRQ.jpg",
  },
  {
    ...video(33, "피닉스 vs 골든스테이트 · 렌더버그 주요장면", "프리미어리그", "09:24", "2026.10.21", "4.7"),
    image: "/images/sports/together/youtube-iAYthAYkeSw.jpg",
  },
  {
    ...video(18, "시카고 vs 필라델피아 · 케일럽 윌슨 주요장면", "K리그", "08:09", "2026.10.24", "4.6"),
    image: "/images/sports/together/youtube-9eA9lHEF48E.jpg",
  },
  {
    ...video(8, "시카고 vs 필라델피아 · 타이리스 맥시 주요장면", "농구", "12:28", "2026.10.28", "4.8"),
    image: "/images/sports/together/youtube-njLxrBGrNmQ.jpg",
  },
  {
    ...video(43, "LA 클리퍼스 vs 골든스테이트 · 렌더버그 주요장면", "F1", "08:09", "2026.10.29", "4.7"),
    image: "/images/sports/together/youtube-d2EKeByAhNY.jpg",
  },
  {
    ...video(51, "LA 클리퍼스 vs 골든스테이트 · 하치무라 주요장면", "미식축구", "11:50", "2026.10.30", "4.6"),
    image: "/images/sports/together/youtube-lO1_n-1kXR4.jpg",
  },
];

export const SPORTS_MOMENTS = [
  // 사용자가 선택한 공식 채널 영상 5개. 별점은 시안용 임의 값입니다.
  // 기존 카드 속성·추천영상 배지는 유지하고 썸네일·제목·별점만 교체합니다.
  {
    ...video(50, "스무 살 챔피언, F1의 새 역사", "라리가", "07:57", "2026.10.12", "4.9"),
    image: "/images/sports/moments/youtube-OoQTUevOBFc.jpg",
  },
  {
    ...video(31, "토트넘을 바꾼 데 제르비의 마법", "축구", "16:37", "2026.10.14", "4.8"),
    image: "/images/sports/moments/youtube-v9WjQW1xUP0.jpg",
  },
  {
    ...video(42, "NBA 온 파이어 · 새로운 여정의 시작", "축구", "03:38", "2026.10.20", "4.7"),
    image: "/images/sports/moments/youtube-M-Dbw8ZUMd0.jpg",
  },
  {
    ...video(35, "첼시 vs 맨유 · 현지해설로 보는 승부", "축구", "16:54", "2026.10.25", "4.5"),
    image: "/images/sports/moments/youtube--n0M-glrlW0.jpg",
  },
  {
    ...video(3, "NBA Week 2 · 덩크 TOP 5", "축구", "07:25", "2026.10.28", "4.8"),
    image: "/images/sports/moments/youtube-bZqJ9n94_0o.jpg",
  },
];

export const SPORTS_PASS_CONTENT = [
  // 공식 영상 재생 장면 캡처. 날짜는 한국 시간 기준 실제 업로드일, 별점은 시안용입니다.
  {
    image: "/images/sports/pass/scene-3hLbjWQH0hY.jpg",
    title: "NFL · 시카고 vs 시애틀 쇼타임",
    category: "NFL",
    duration: "06:29",
    meta: "2026.11.03",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/scene-TqCNSz0c7iE.jpg",
    title: "웰컴 투 LIV 골프",
    category: "LIV 골프",
    duration: "02:13",
    meta: "2025.04.04",
    rating: "4.7",
  },
  {
    image: "/images/sports/pass/scene-BLRr3YZCQtU.jpg",
    title: "투르 드 프랑스 · 카라파스의 역전승",
    category: "사이클",
    duration: "01:35",
    meta: "2026.07.26",
    rating: "4.9",
  },
  {
    image: "/images/sports/pass/scene-OJgTI0HNUWk.jpg",
    title: "NBA Week 2 · 쿠플레이어 TOP 5",
    category: "NBA",
    duration: "01:55",
    meta: "2026.11.03",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/scene-7lH8TkLEGQc.jpg",
    title: "WNBA · 국가대표 박지현 활약상",
    category: "WNBA",
    duration: "00:50",
    meta: "2026.05.29",
    rating: "4.7",
  },
  {
    image: "/images/sports/pass/scene-Iu4NbgNhHXE.jpg",
    title: "F1 · 알론소 vs 해밀턴 경합",
    category: "F1",
    duration: "00:32",
    meta: "2023.03.31",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/scene-JNvMfHYMMyU.jpg",
    title: "리버풀 vs 아스날 HL",
    category: "프리미어리그",
    duration: "02:58",
    meta: "2026.11.02",
    rating: "4.9",
  },
  {
    image: "/images/sports/pass/scene-knhbnhqTgiU.jpg",
    title: "라싱 산탄데르 vs 레알 마드리드 HL",
    category: "라리가",
    duration: "02:58",
    meta: "2026.11.02",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/scene-NuPa6b8TM4U.jpg",
    title: "안양 vs 부천 풀 하이라이트",
    category: "K리그1",
    duration: "11:43",
    meta: "2026.11.01",
    rating: "4.7",
  },
];

export const SPORTS_RECOMMENDATIONS = [
  video(35, "축구 팬을 위한 환상적인 득점 모음", "축구", "09:56", "2026.10.11", "4.5"),
  video(63, "농구 팬이라면 다시 볼 클러치 슛", "농구", "14:01", "2026.10.15", "4.5"),
  video(2, "테니스 입문자를 위한 명품 랠리", "테니스", "19:37", "2026.10.18", "4.4"),
  video(21, "전술로 보는 축구의 또 다른 재미", "축구", "18:59", "2026.10.22", "4.5"),
  video(52, "속도에 빠지는 F1 추월 모음", "F1", "12:56", "2026.10.24", "4.4"),
  video(31, "배구 팬을 위한 짜릿한 블로킹", "배구", "09:39", "2026.10.26", "4.4"),
  video(10, "골프 팬이 주목한 정교한 어프로치", "골프", "18:34", "2026.10.27", "3.9"),
  video(8, "에디터가 고른 이번 주 스포츠 명장면", "스포츠", "10:40", "2026.10.27", "4.8"),
];

export const SPORTS_REPLAYS = [
  video(36, "프리미어리그 빅매치 핵심 다시보기", "프리미어리그", "11:14", "2026.10.13", "3.8"),
  video(62, "라리가 라이벌전 승부처 다시보기", "라리가", "14:34", "2026.10.14", "3.6"),
  video(49, "NBA 빅매치 마지막 쿼터 다시보기", "NBA", "04:01", "2026.10.20", "5.0"),
  video(52, "K리그 주요 경기 전후반 요약", "K리그", "08:44", "2026.10.21", "5.0"),
  video(35, "F1 결승 레이스 하이라이트", "F1", "16:27", "2026.10.22", "4.4"),
  video(51, "UFC 메인 매치 주요 장면", "UFC", "11:22", "2026.10.24", "3.5"),
  video(37, "테니스 풀세트 접전 핵심 요약", "테니스", "08:51", "2026.10.24", "4.1"),
  video(31, "배구 5세트 승부 다시보기", "배구", "13:41", "2026.10.26", "3.7"),
  video(21, "골프 최종 라운드 주요 샷", "골프", "08:35", "2026.10.26", "4.8"),
  video(12, "컵대회 결승, 우승을 가른 순간", "축구", "07:25", "2026.10.27", "3.8"),
  video(17, "여자축구 빅매치 명장면 다시보기", "여자축구", "13:44", "2026.10.27", "4.8"),
  video(50, "국가대표 평가전 핵심 장면 모음", "축구", "08:36", "2026.10.28", "4.2"),
];

export const SPORTS_LIVE_POSTERS = {
  PL: "/images/sports/campaign/live-premier-league.png",
  nba: "/images/sports/campaign/live-nba.png",
  FAC: "/images/sports/campaign/live-cup.png",
  PD: "/images/sports/campaign/live-laliga.png",
  default: "/images/sports/campaign/live-premier-league.png",
};

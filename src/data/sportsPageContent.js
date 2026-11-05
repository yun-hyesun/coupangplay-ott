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
  // 공식 유튜브 원본 썸네일. 날짜는 한국 시간 기준 실제 업로드일, 별점은 시안용입니다.
  {
    image: "/images/sports/pass/youtube-3hLbjWQH0hY.jpg",
    title: "NFL · 시카고 vs 시애틀 쇼타임",
    category: "NFL",
    duration: "06:29",
    meta: "2026.11.03",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/youtube-TqCNSz0c7iE.jpg",
    title: "웰컴 투 LIV 골프",
    category: "LIV 골프",
    duration: "02:13",
    meta: "2025.04.04",
    rating: "4.7",
  },
  {
    image: "/images/sports/pass/youtube-B7BIzk-_o_w.jpg",
    title: "NFL · 처음 보는 팬을 위한 입문 가이드",
    category: "NFL",
    duration: "01:21",
    meta: "2023.11.02",
    rating: "4.9",
  },
  {
    image: "/images/sports/pass/youtube-OJgTI0HNUWk.jpg",
    title: "NBA Week 2 · 쿠플레이어 TOP 5",
    category: "NBA",
    duration: "01:55",
    meta: "2026.11.03",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/youtube--GGvmtZZ5Zw.jpg",
    title: "NBA · 오프시즌 대이동 시즌 가이드",
    category: "NBA",
    duration: "01:29",
    meta: "2026.10.16",
    rating: "4.7",
  },
  {
    image: "/images/sports/pass/youtube-CPXWcy8gwSM.jpg",
    title: "F1 · 키미 안토넬리 스토리",
    category: "F1",
    duration: "08:33",
    meta: "2026.03.26",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/youtube-JNvMfHYMMyU.jpg",
    title: "리버풀 vs 아스날 HL",
    category: "프리미어리그",
    duration: "02:58",
    meta: "2026.11.02",
    rating: "4.9",
  },
  {
    image: "/images/sports/pass/youtube-knhbnhqTgiU.jpg",
    title: "라싱 산탄데르 vs 레알 마드리드 HL",
    category: "라리가",
    duration: "02:58",
    meta: "2026.11.02",
    rating: "4.8",
  },
  {
    image: "/images/sports/pass/youtube-NuPa6b8TM4U.jpg",
    title: "안양 vs 부천 풀 하이라이트",
    category: "K리그1",
    duration: "11:43",
    meta: "2026.11.01",
    rating: "4.7",
  },
];

export const SPORTS_RECOMMENDATIONS = [
  // 공식 채널의 일반 가로형 인터뷰·입문 콘텐츠 8개. 별점은 기존 시안 값을 유지합니다.
  {
    image: "/images/sports/recommendations/youtube-HTi2yKID4ak.jpg",
    title: "이강인 · 첫 마드리드 더비를 앞둔 각오",
    category: "라리가",
    duration: "07:45",
    meta: "2026.09.20",
    rating: "4.5",
  },
  {
    image: "/images/sports/recommendations/youtube-L0YlUU8xDAI.jpg",
    title: "NBA 시즌 가이드 · 왕좌의 게임",
    category: "NBA",
    duration: "01:13",
    meta: "2026.10.17",
    rating: "4.5",
  },
  {
    image: "/images/sports/recommendations/youtube-fXDn3HY83kY.jpg",
    title: "영화보다 재밌는 F1 입문 가이드",
    category: "F1",
    duration: "25:17",
    meta: "2025.07.25",
    rating: "4.4",
  },
  {
    image: "/images/sports/recommendations/youtube-YUkfUnLUZPg.jpg",
    title: "맨유 레전드 마이클 캐릭 인터뷰",
    category: "프리미어리그",
    duration: "13:04",
    meta: "2025.11.05",
    rating: "4.5",
  },
  {
    image: "/images/sports/recommendations/youtube-AjAuB39Yek4.jpg",
    title: "NFL 전술 가이드 · 리시버 라우트 트리",
    category: "NFL",
    duration: "02:15",
    meta: "2026.09.23",
    rating: "4.4",
  },
  {
    image: "/images/sports/recommendations/youtube-X3T-0hkQ3cc.jpg",
    title: "코마츠 아야오 · F1과 아시아 시장 이야기",
    category: "F1",
    duration: "08:30",
    meta: "2025.07.19",
    rating: "4.4",
  },
  {
    image: "/images/sports/recommendations/youtube-Ga5di17Yo7Y.jpg",
    title: "설영우 · 분데스리가에서 시작하는 새 도전",
    category: "분데스리가",
    duration: "09:51",
    meta: "2026.09.12",
    rating: "3.9",
  },
  {
    image: "/images/sports/recommendations/youtube-J9eyAzPlTHI.jpg",
    title: "감스트가 묻고 브루노 페르난데스가 답하다",
    category: "프리미어리그",
    duration: "06:31",
    meta: "2026.03.04",
    rating: "4.8",
  },
];

export const SPORTS_REPLAYS = [
  // 공식 채널 경기 다시보기 12개. 날짜·재생시간은 원본 정보, 별점은 기존 시안 값입니다.
  {
    image: "/images/sports/replays/youtube-IPXFpczj6IY.jpg",
    title: "서울 vs 인천 풀 하이라이트",
    category: "K리그1",
    duration: "13:05",
    meta: "2026.11.01",
    rating: "3.8",
  },
  {
    image: "/images/sports/replays/youtube-sahx6Lj2opc.jpg",
    title: "피닉스 vs 골든스테이트 · 클러치 모음",
    category: "NBA",
    duration: "04:26",
    meta: "2026.11.03",
    rating: "3.6",
  },
  {
    image: "/images/sports/replays/youtube-ah2a6rjRn-U.jpg",
    title: "뉴잉글랜드 vs 시카고 · 쇼타임 모음",
    category: "NFL",
    duration: "06:39",
    meta: "2026.10.23",
    rating: "5.0",
  },
  {
    image: "/images/sports/replays/youtube-Dc-AYmLD5p8.jpg",
    title: "전북 vs 대전 풀 하이라이트",
    category: "K리그1",
    duration: "10:24",
    meta: "2026.10.31",
    rating: "5.0",
  },
  {
    image: "/images/sports/replays/youtube-_rSdMGA6-Q8.jpg",
    title: "브라질 vs 프랑스 풀 하이라이트",
    category: "국가대표 친선경기",
    duration: "13:35",
    meta: "2026.03.27",
    rating: "4.4",
  },
  {
    image: "/images/sports/replays/youtube-tsWC9smiIRE.jpg",
    title: "포틀랜드 vs LA 레이커스 · 클러치 모음",
    category: "NBA",
    duration: "04:59",
    meta: "2026.10.28",
    rating: "3.5",
  },
  {
    image: "/images/sports/replays/youtube-FV3xiFn86GI.jpg",
    title: "울산 vs 강원 풀 하이라이트",
    category: "K리그1",
    duration: "08:57",
    meta: "2026.11.01",
    rating: "4.1",
  },
  {
    image: "/images/sports/replays/youtube-fVM9q2XmDME.jpg",
    title: "시애틀 vs 덴버 · 쇼타임 모음",
    category: "NFL",
    duration: "06:20",
    meta: "2026.10.16",
    rating: "3.7",
  },
  {
    image: "/images/sports/replays/youtube-pJoqgXV4M6U.jpg",
    title: "밀워키 vs 필라델피아 · 클러치 모음",
    category: "NBA",
    duration: "05:25",
    meta: "2026.10.25",
    rating: "4.8",
  },
  {
    image: "/images/sports/replays/youtube-4Hd0SBuBZcM.jpg",
    title: "포항 vs 제주 풀 하이라이트",
    category: "K리그1",
    duration: "10:19",
    meta: "2026.11.01",
    rating: "3.8",
  },
  {
    image: "/images/sports/replays/youtube-YUMs288eZEg.jpg",
    title: "대구 vs 수원 풀 하이라이트",
    category: "K리그2",
    duration: "13:50",
    meta: "2026.10.31",
    rating: "4.8",
  },
  {
    image: "/images/sports/replays/youtube-jXWD02IBJIs.jpg",
    title: "용인 vs 서울E 풀 하이라이트",
    category: "K리그2",
    duration: "13:58",
    meta: "2026.10.31",
    rating: "4.2",
  },
];

export const SPORTS_LIVE_POSTERS = {
  PL: "/images/sports/campaign/live-premier-league.png",
  nba: "/images/sports/campaign/live-nba.png",
  FAC: "/images/sports/campaign/live-cup.png",
  PD: "/images/sports/campaign/live-laliga.png",
  default: "/images/sports/campaign/live-premier-league.png",
};

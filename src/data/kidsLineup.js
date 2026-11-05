const movie = (id) => ({ id, type: 'movie' });
const tv = (id) => ({ id, type: 'tv' });

export const kidsBanner = [
  movie(1084242), // 주토피아 2
  movie(1241982), // 모아나 2
  movie(1022789), // 인사이드 아웃 2
  movie(1022787), // 엘리오
];

export const kidsCharacters = [
  { name: '엘사', work: movie(109445) },
  { name: '스티치', work: movie(11544) },
  { name: '주디와 닉', work: movie(269149) },
  { name: '우디와 버즈', work: movie(862) },
  { name: '라이트닝 맥퀸', work: movie(920) },
  { name: '모아나', work: movie(277834) },
];

export const kidsPromo = {
  title: '픽사와 함께 우주로!',
  work: movie(1022787), // 엘리오
};

export const kidsRails = [
  {
    key: 'kids-family',
    title: '온 가족이 함께 보는 디즈니',
    imageType: '세로',
    entries: [
      movie(109445), // 겨울왕국
      movie(269149), // 주토피아
      movie(354912), // 코코
      movie(568124), // 엔칸토
      movie(38757), // 라푼젤
      movie(11544), // 릴로 & 스티치
    ],
  },
  {
    key: 'kids-characters',
    title: '좋아하는 친구들과 함께',
    entries: [
      movie(862), // 토이 스토리
      movie(920), // 카
      movie(12), // 니모를 찾아서
      movie(260514), // 인크레더블 2
      movie(330457), // 겨울왕국 2
      movie(10193), // 토이 스토리 3
    ],
  },
  {
    key: 'kids-pixar',
    title: '다시 보고 싶은 픽사',
    entries: [
      movie(150540), // 인사이드 아웃
      movie(14160), // 업
      movie(2062), // 라따뚜이
      movie(585), // 몬스터 주식회사
      movie(10681), // 월-E
      movie(508442), // 소울
    ],
  },
  {
    key: 'kids-new-stories',
    title: '요즘 만나는 새 이야기',
    entries: [
      ...kidsBanner,
      movie(976573), // 엘리멘탈
      movie(1022796), // 위시
    ],
  },
  {
    key: 'kids-magic',
    title: '신비한 마법 여행',
    entries: [
      movie(330457), // 겨울왕국 2
      movie(4523), // 마법에 걸린 사랑
      movie(10020), // 미녀와 야수
      movie(11224), // 신데렐라
      movie(568124), // 엔칸토
      movie(38757), // 라푼젤
    ],
  },
  {
    key: 'kids-adventure',
    title: '용감한 주인공들의 모험',
    entries: [
      movie(277834), // 모아나
      movie(527774), // 라야와 마지막 드래곤
      movie(10674), // 뮬란
      movie(62177), // 메리다와 마법의 숲
      movie(177572), // 빅 히어로
      movie(260514), // 인크레더블 2
    ],
  },
  {
    key: 'kids-school',
    title: '초등 친구들을 위한 콘텐츠',
    entries: [
      tv(40075), // 그래비티 폴즈
      tv(1877), // 피니와 퍼브
      movie(508943), // 루카
      movie(508947), // 메이의 새빨간 비밀
      movie(62211), // 몬스터 대학교
      movie(609), // 인크레더블
    ],
  },
];
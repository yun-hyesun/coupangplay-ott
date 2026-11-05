// 홈·상세 추천·더보기가 공유하는 콘텐츠 설정
export const railConfig = {
  //##################### 홈
  'home-ranking': { 
    title: '인기 시리즈 TOP 20',
    type: 'all',
    variant: 'ranking',
    sort: 'popularity.desc',
    imageType: '세로',
    country: 'KR',
    limit: 20 
  },

  'home-latest': { 
    title: '새롭게 공개된 콘텐츠',
    type: 'tv',
    sort: 'first_air_date.desc',
    imageType: '가로',
    gridImageType: '가로',
  },

  'home-binge': { 
    title: '정주행하기 좋은 시리즈',
    type: 'tv',
    genre: '18,35',
    ended: true, 
    imageType: '가로',
    gridImageType: '가로',
    country: 'KR' 
  },

  'home-movie': { 
    title: '지금 주목받는 영화',
    type: 'movie',
    imageType: '가로',
    gridImageType: '가로',
    sort: 'primary_release_date.desc',
    country: 'KR|US' 
  },

  'home-drama': { 
    title: '지금 가장 핫한 드라마',
    type: 'tv',
    genre: '18',
    imageType: '가로',
    gridImageType: '가로',
    country: 'KR|US',
    sort: 'first_air_date.desc' 
  },

  'home-coupang-series': {
    title: '오직 쿠팡플레이에서',
    type: 'tv',
    network: '5169',
    sort: 'first_air_date.desc',
    imageType: '세로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  // ########## jplus
  'home-jplus': {
    title: 'JPLUS',
    type: 'tv',
    country: 'JP',
    genre: '18',
    sort: 'first_air_date.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
    useTving: false,
  },

  'home-fun': { 
    title: '웃음이 필요할 때',
    type: 'tv',
    genre: '10764,10767', 
    sort: 'first_air_date.desc', 
    imageType: '가로',
    gridImageType: '가로',
  },

  'home-classics': { 
    title: '다시 꺼내 보는 명작', 
    type: 'movie', 
    untilYear: 2020, 
    minVotes: 300, 
    sort: 'vote_average.desc', 
    imageType: '가로',
    gridImageType: '가로', 
    country: 'KR|US' 
  },
  
  'home-light': { 
    title: '가볍게 보기 좋은 영화', 
    type: 'movie', 
    genre: '35,18,10749', 
    imageType: '가로',
    gridImageType: '가로', 
    sort: 'primary_release_date.desc', 
    country: 'KR|US' 
  },

  // ##################### 개별구매
  'store-ranking': {
    title: '인기 구매 영화 TOP 20',
    type: 'movie',
    monetizationType: 'buy',
    variant: 'ranking',
    sort: 'popularity.desc',
    imageType: '세로',
    gridImageType: '세로',
    limit: 20,
    fullList: true,
  },

  'store-latest': {
    title: '최근 개봉한 구매 영화',
    type: 'movie',
    monetizationType: 'buy',
    sort: 'primary_release_date.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'store-action-adventure': {
    title: '액션과 모험 영화',
    type: 'movie',
    monetizationType: 'buy',
    genre: '28|12',
    sort: 'popularity.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'store-family-animation': {
    title: '온 가족이 함께 보는 영화',
    type: 'movie',
    monetizationType: 'buy',
    genre: '10751|16',
    sort: 'popularity.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  //##################### 키즈
    'kids-ranking': {
    title: '인기 키즈 TOP 20',
    type: 'movie',
    kidsOnly: true,
    useTving: false,
    country: 'KR|US',
    genre: '16',
    variant: 'ranking',
    sort: 'popularity.desc',
    imageType: '세로',
    gridImageType: '세로',
    limit: 20,
    fullList: true,
  },

  'kids-korean-animation': {
    title: '한국 애니메이션',
    type: 'tv',
    kidsOnly: true,
    useTving: false,
    country: 'KR',
    genre: '16',
    sort: 'popularity.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'kids-family': {
    title: '온 가족이 함께 보는 디즈니 영화',
    type: 'movie',
    kidsOnly: true,
    companies: '2|3',
    genre: '10751',
    sort: 'popularity.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'kids-animation': {
    title: '다시 보고 싶은 디즈니·픽사 애니메이션',
    type: 'movie',
    kidsOnly: true,
    companies: '2|3',
    genre: '16',
    minVotes: 100,
    sort: 'vote_average.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'kids-latest': {
    title: '새롭게 만나는 디즈니·픽사',
    type: 'movie',
    kidsOnly: true,
    companies: '2|3',
    sort: 'primary_release_date.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },

  'kids-fantasy-adventure': {
    title: '마법과 전설을 찾아 떠나는 모험',
    type: 'movie',
    kidsOnly: true,
    useTving: false,
    genre: '12,14', // 모험과 판타지 장르를 둘 다 포함
    excludeGenres: '16', // 애니메이션은 별도 레일에서 표시
    sort: 'popularity.desc',
    imageType: '가로',
    gridImageType: '가로',
    limit: 20,
    fullList: true,
  },
};

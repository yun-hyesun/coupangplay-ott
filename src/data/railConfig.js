// 홈·상세 추천·더보기가 공유하는 콘텐츠 설정

export const railConfig = {
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
};

// 메뉴 표시 순서는 전달받은 목록과 같습니다.
// curated 항목은 아래 categoryCollections에서 작품 ID로 분류합니다.
export const categorySections = {
  drama: {
  label: '드라마',
  type: 'tv',
  categories: [
    {
      id: 'korean',
      label: '한국 드라마',
      params: {
        with_origin_country: 'KR',
        with_genres: '18',
      },
    },
    {
      id: 'american',
      label: '미국 드라마',
      params: {
        with_origin_country: 'US',
        with_genres: '18',
      },
    },
    {
      id: 'japanese',
      label: '일본 드라마',
      params: {
        with_origin_country: 'JP',
        with_genres: '18',
        without_genres: '16,10764,10767,10763',
      },
    },
    {
      id: 'chinese',
      label: '중국 드라마',
      params: {
        with_origin_country: 'CN',
        with_genres: '18',
      },
    },
    {
      id: 'drama',
      label: '드라마',
      params: { with_genres: '18' },
    },
    {
      id: 'romance',
      label: '로맨스',
      params: { with_genres: '18' },
      keyword: 'romance',
    },
    {
      id: 'comedy',
      label: '코미디',
      params: { with_genres: '18,35' },
    },
    {
      id: 'action',
      label: '액션',
      params: { with_genres: '18,10759' },
    },
    {
      id: 'thriller',
      label: '스릴러',
      params: { with_genres: '18' },
      keyword: 'thriller',
    },
    {
      id: 'crime',
      label: '범죄',
      params: { with_genres: '18,80' },
    },
    {
      id: 'horror',
      label: '공포',
      params: { with_genres: '18' },
      keyword: 'horror',
    },
    {
      id: 'fantasy',
      label: '판타지',
      params: { with_genres: '18,10765' },
    },
    {
      id: 'mystery',
      label: '미스터리',
      params: { with_genres: '18,9648' },
    },
    {
      id: 'wuxia',
      label: '무협',
      params: { with_genres: '18' },
      keyword: 'wuxia',
    },
    {
      id: 'animation',
      label: '애니메이션',
      params: { with_genres: '16' },
    },
    {
      id: 'documentary',
      label: '다큐멘터리',
      params: { with_genres: '99' },
    },
  ],
},
  "entertainment": {
    "label": "예능",
    "type": "tv",
    "categories": [
      {
        "id": "variety",
        "label": "버라이어티",
        "params": {},
        "curated": true
      },
      {
        "id": "documentary",
        "label": "다큐멘터리",
        "params": {
          "with_genres": "99",
          "with_origin_country": "KR"
        }
      },
      {
        "id": "travel",
        "label": "여행",
        "params": {},
        "curated": true
      },
      {
        "id": "cooking",
        "label": "쿡방/먹방",
        "params": {},
        "curated": true
      },
      {
        "id": "dating",
        "label": "연애 리얼리티&토크쇼",
        "params": {},
        "curated": true
      },
      {
        "id": "na-young-seok",
        "label": "나영석 예능",
        "params": {},
        "curated": true
      },
      {
        "id": "quiz",
        "label": "게임/퀴즈쇼",
        "params": {},
        "curated": true
      },
      {
        "id": "talk",
        "label": "토크쇼",
        "params": {
          "with_genres": "10767",
          "with_origin_country": "KR"
        }
      },
      {
        "id": "survival",
        "label": "서바이벌",
        "params": {},
        "curated": true
      },
      {
        "id": "observational",
        "label": "관찰리얼리티",
        "params": {},
        "curated": true
      },
      {
        "id": "sports",
        "label": "스포츠 예능",
        "params": {},
        "curated": true
      },
      {
        "id": "education",
        "label": "교육&독서 예능",
        "params": {},
        "curated": true
      },
      {
        "id": "healing",
        "label": "힐링 예능",
        "params": {},
        "curated": true
      },
      {
        "id": "idol",
        "label": "아이돌(리얼리티)",
        "params": {},
        "curated": true
      },
      {
        "id": "music-survival",
        "label": "음악 서바이벌",
        "params": {},
        "curated": true
      },
      {
        "id": "music",
        "label": "음악예능",
        "params": {},
        "curated": true
      },
      {
        "id": "comedy",
        "label": "코미디",
        "params": {
          "with_genres": "35",
          "with_origin_country": "KR",
          "without_genres": "18,16"
        }
      },
      {
        "id": "family",
        "label": "가족 예능",
        "params": {},
        "curated": true
      },
      {
        "id": "beauty",
        "label": "뷰티/스타일",
        "params": {},
        "curated": true
      },
      {
        "id": "pets",
        "label": "펫/애니멀",
        "params": {},
        "curated": true
      },
      {
        "id": "concert",
        "label": "콘서트/시상식/축제",
        "params": {},
        "curated": true
      },
      {
        "id": "special",
        "label": "예능 스페셜",
        "params": {},
        "curated": true
      }
    ]
  },
  "movie": {
    "label": "영화",
    "type": "movie",
    "categories": [
      {
        "id": "korean",
        "label": "한국 영화",
        "params": {
          "with_origin_country": "KR"
        }
      },
      {
        "id": "foreign",
        "label": "외국 영화",
        "params": {},
        "foreign": true
      },
      {
        "id": "american",
        "label": "미국 영화",
        "params": {
          "with_origin_country": "US"
        }
      },
      {
        "id": "japanese",
        "label": "일본 영화",
        "params": {
          "with_origin_country": "JP"
        }
      },
      {
        "id": "chinese",
        "label": "중화권 영화",
        "params": {
          "with_origin_country": "CN|TW|HK|MO"
        }
      },
      {
        "id": "european",
        "label": "유럽 영화",
        "params": {
          "with_origin_country": "GB|FR|DE|IT|ES|PT|NL|BE|AT|CH|IE|DK|SE|NO|FI|IS|PL|CZ|SK|HU|RO|BG|GR|HR|SI|RS|BA|ME|MK|AL|EE|LV|LT|LU|MT|CY|UA|BY|MD|RU"
        }
      },
      {
        "id": "drama",
        "label": "드라마",
        "params": {
          "with_genres": "18"
        }
      },
      {
        "id": "romance",
        "label": "로맨스",
        "params": {
          "with_genres": "10749"
        }
      },
      {
        "id": "comedy",
        "label": "코미디",
        "params": {
          "with_genres": "35"
        }
      },
      {
        "id": "action",
        "label": "액션",
        "params": {
          "with_genres": "28"
        }
      },
      {
        "id": "adventure",
        "label": "어드벤처",
        "params": {
          "with_genres": "12"
        }
      },
      {
        "id": "thriller",
        "label": "스릴러",
        "params": {
          "with_genres": "53"
        }
      },
      {
        "id": "crime",
        "label": "범죄",
        "params": {
          "with_genres": "80"
        }
      },
      {
        "id": "horror",
        "label": "공포",
        "params": {
          "with_genres": "27"
        }
      },
      {
        "id": "sf",
        "label": "SF",
        "params": {
          "with_genres": "878"
        }
      },
      {
        "id": "fantasy",
        "label": "판타지",
        "params": {
          "with_genres": "14"
        }
      },
      {
        "id": "mystery",
        "label": "미스터리",
        "params": {
          "with_genres": "9648"
        }
      },
      {
        "id": "wuxia",
        "label": "무협",
        "params": {},
        "curated": true
      },
      {
        "id": "animation",
        "label": "애니메이션",
        "params": {
          "with_genres": "16"
        }
      },
      {
        "id": "documentary",
        "label": "다큐멘터리",
        "params": {
          "with_genres": "99"
        }
      }
    ]
  },
  "store": {
    "label": "스토어",
    "type": "movie",
    "categories": [
      {
        "id": "korean",
        "label": "한국 영화",
        "params": {
          "with_origin_country": "KR"
        }
      },
      {
        "id": "foreign",
        "label": "외국 영화",
        "params": {},
        "foreign": true
      },
      {
        "id": "american",
        "label": "미국 영화",
        "params": {
          "with_origin_country": "US"
        }
      },
      {
        "id": "japanese",
        "label": "일본 영화",
        "params": {
          "with_origin_country": "JP"
        }
      },
      {
        "id": "chinese",
        "label": "중화권 영화",
        "params": {
          "with_origin_country": "CN|TW|HK|MO"
        }
      },
      {
        "id": "european",
        "label": "유럽 영화",
        "params": {
          "with_origin_country": "GB|FR|DE|IT|ES|PT|NL|BE|AT|CH|IE|DK|SE|NO|FI|IS|PL|CZ|SK|HU|RO|BG|GR|HR|SI|RS|BA|ME|MK|AL|EE|LV|LT|LU|MT|CY|UA|BY|MD|RU"
        }
      },
      {
        "id": "drama",
        "label": "드라마",
        "params": {
          "with_genres": "18"
        }
      },
      {
        "id": "romance",
        "label": "로맨스",
        "params": {
          "with_genres": "10749"
        }
      },
      {
        "id": "comedy",
        "label": "코미디",
        "params": {
          "with_genres": "35"
        }
      },
      {
        "id": "action",
        "label": "액션",
        "params": {
          "with_genres": "28"
        }
      },
      {
        "id": "adventure",
        "label": "어드벤처",
        "params": {
          "with_genres": "12"
        }
      },
      {
        "id": "thriller",
        "label": "스릴러",
        "params": {
          "with_genres": "53"
        }
      },
      {
        "id": "crime",
        "label": "범죄",
        "params": {
          "with_genres": "80"
        }
      },
      {
        "id": "horror",
        "label": "공포",
        "params": {
          "with_genres": "27"
        }
      },
      {
        "id": "sf",
        "label": "SF",
        "params": {
          "with_genres": "878"
        }
      },
      {
        "id": "fantasy",
        "label": "판타지",
        "params": {
          "with_genres": "14"
        }
      },
      {
        "id": "mystery",
        "label": "미스터리",
        "params": {
          "with_genres": "9648"
        }
      },
      {
        "id": "wuxia",
        "label": "무협",
        "params": {},
        "curated": true
      },
      {
        "id": "animation",
        "label": "애니메이션",
        "params": {
          "with_genres": "16"
        }
      }
    ]
  }
};

categorySections.kids = {
  "label": "키즈",
  "type": "all",
  "categories": [
    {
      "id": "tobot",
      "label": "또봇",
      "image": "/images/category/kids/kids_01.svg",
      "queries": [
        "또봇",
        "Tobot"
      ],
      "params": {}
    },
    {
      "id": "butt-detective",
      "label": "엉덩이 탐정",
      "image": "/images/category/kids/kids_02.svg",
      "queries": [
        "엉덩이 탐정",
        "Butt Detective"
      ],
      "params": {}
    },
    {
      "id": "mom-katuri",
      "label": "엄마 까투리",
      "image": "/images/category/kids/kids_03.svg",
      "queries": [
        "엄마 까투리",
        "Katuri"
      ],
      "params": {}
    },
    {
      "id": "anpanman",
      "label": "호빵맨",
      "image": "/images/category/kids/kids_04.svg",
      "queries": [
        "호빵맨",
        "Anpanman"
      ],
      "params": {}
    },
    {
      "id": "hello-jadoo",
      "label": "안녕 자두야",
      "image": "/images/category/kids/kids_05.svg",
      "queries": [
        "안녕 자두야",
        "Hello Jadoo"
      ],
      "params": {}
    },
    {
      "id": "larva",
      "label": "라바",
      "image": "/images/category/kids/kids_06.svg",
      "queries": [
        "라바",
        "Larva"
      ],
      "params": {}
    },
    // {
    //   id: 'carrie-tv',
    //   label: '캐리TV',
    //   image: '/images/category/kids/kids_07.svg',
    //   queries: [
    //     '쿠킹하우스',
    //     '점프점프',
    //     '탐구생활',
    //     '캐리야 학교가자',
    //     '캐리야 학교 가자',
    //     '뱅뱅의 캐리',
    //     '장난감 친구들',
    //     '엘리가 간다',
    //     '엘리가간다',
    //     '우당탕탕 동화나라',
    //     '오싹오싹 이야기',
    //     '렛츠고 미술학교',
    //     '오픈키친',
    //     '호기심 아파트',
    //     '엘리의 동화나라',
    //     '캐리앤송',
    //   ],
    //   params: {},
    // },
    {
      "id": "komo",
      "label": "토닥토닥 꼬모",
      "image": "/images/category/kids/kids_08.svg",
      "queries": [
        "토닥토닥 꼬모",
        "꼬모",
        "Komo"
      ],
      "params": {}
    },
    {
      "id": "hello-carbot",
      "label": "헬로카봇",
      "image": "/images/category/kids/kids_09.svg",
      "queries": [
        "헬로카봇",
        "Hello Carbot"
      ],
      "params": {}
    },
    {
      "id": "tv-kindergarten",
      "label": "TV유치원",
      "image": "/images/category/kids/kids_10.svg",
      "queries": [
        "TV유치원",
        "TV 유치원"
      ],
      "params": {}
    },
    {
      "id": "bread-barbershop",
      "label": "브레드 이발소",
      "image": "/images/category/kids/kids_11.svg",
      "queries": [
        "브레드 이발소",
        "Bread Barbershop"
      ],
      "params": {}
    },
    {
      "id": "lego",
      "label": "레고",
      "image": "/images/category/kids/kids_12.svg",
      "queries": [
        "레고",
        "LEGO"
      ],
      "params": {}
    },
    {
      "id": "octonauts",
      "label": "바다탐험대 옥토넛",
      "image": "/images/category/kids/kids_13.svg",
      "queries": [
        "옥토넛",
        "Octonauts"
      ],
      "params": {}
    },
    {
      "id": "secret-jouju",
      "label": "시크릿 쥬쥬",
      "image": "/images/category/kids/kids_14.svg",
      "queries": [
        "시크릿 쥬쥬",
        "Secret Jouju"
      ],
      "params": {}
    },
    {
      "id": "pinkfong",
      "label": "핑크퐁",
      "image": "/images/category/kids/kids_15.svg",
      "queries": [
        "핑크퐁",
        "Pinkfong",
        "베베핀",
        "Bebefinn"
      ],
      "params": {}
    },
    {
      "id": "junytony",
      "label": "주니토니",
      "image": "/images/category/kids/kids_16.svg",
      "queries": [
        "주니토니",
        "JunyTony"
      ],
      "params": {}
    },
    {
      "id": "robocar-poli",
      "label": "로보카 폴리",
      "image": "/images/category/kids/kids_17.svg",
      "queries": [
        "로보카 폴리",
        "Robocar Poli"
      ],
      "params": {}
    },
    {
      "id": "kongsuni",
      "label": "콩순이",
      "image": "/images/category/kids/kids_18.svg",
      "queries": [
        "콩순이",
        "Kongsuni"
      ],
      "params": {}
    },
    {
      "id": "barbie",
      "label": "바비",
      "image": "/images/category/kids/kids_19.svg",
      "queries": [
        "바비",
        "Barbie"
      ],
      "params": {}
    },
    {
      "id": "gogo-dino",
      "label": "고고다이노",
      "image": "/images/category/kids/kids_20.svg",
      "queries": [
        "고고다이노",
        "Gogo Dino"
      ],
      "params": {}
    },
    {
      "id": "mecard",
      "label": "메카드 시리즈",
      "image": "/images/category/kids/kids_21.svg",
      "queries": [
        "메카드",
        "Mecard"
      ],
      "params": {}
    },
    {
      "id": "super-wings",
      "label": "출동! 슈퍼윙스",
      "image": "/images/category/kids/kids_22.svg",
      "queries": [
        "슈퍼윙스",
        "Super Wings"
      ],
      "params": {}
    }
  ]
};

// 모든 메뉴의 첫 카테고리는 전체입니다.
for (const [section, config] of Object.entries(categorySections)) {
  config.categories.unshift({
    id: 'all',
    label: '전체',
    params: section === 'drama' ? { with_genres: '18' } : {},
  });
}

export const categoryCollections = {
  'drama-romance': [], // 드라마 > 로맨스
  'drama-action': [], // 드라마 > 액션
  'drama-thriller': [], // 드라마 > 스릴러
  'drama-horror': [], // 드라마 > 공포
  'drama-fantasy': [], // 드라마 > 판타지
  'drama-wuxia': [], // 드라마 > 무협
  'entertainment-variety': [], // 예능 > 버라이어티
  'entertainment-travel': [], // 예능 > 여행
  'entertainment-cooking': [], // 예능 > 쿡방/먹방
  'entertainment-dating': [], // 예능 > 연애 리얼리티&토크쇼
  'entertainment-na-young-seok': [], // 예능 > 나영석 예능
  'entertainment-quiz': [], // 예능 > 게임/퀴즈쇼
  'entertainment-survival': [], // 예능 > 서바이벌
  'entertainment-observational': [], // 예능 > 관찰리얼리티
  'entertainment-sports': [], // 예능 > 스포츠 예능
  'entertainment-education': [], // 예능 > 교육&독서 예능
  'entertainment-healing': [], // 예능 > 힐링 예능
  'entertainment-idol': [], // 예능 > 아이돌(리얼리티)
  'entertainment-music-survival': [], // 예능 > 음악 서바이벌
  'entertainment-music': [], // 예능 > 음악예능
  'entertainment-family': [], // 예능 > 가족 예능
  'entertainment-beauty': [], // 예능 > 뷰티/스타일
  'entertainment-pets': [], // 예능 > 펫/애니멀
  'entertainment-concert': [], // 예능 > 콘서트/시상식/축제
  'entertainment-special': [], // 예능 > 예능 스페셜
  'movie-wuxia': [], // 영화 > 무협
  'store-wuxia': [], // 스토어 > 무협
};

// 등록 예시
// categoryCollections['entertainment-na-young-seok'] = [실제_TMDB_작품_ID];


// 세부 예능 분류: 제목으로 TMDB ID를 찾습니다. 별칭은 배열로 등록할 수 있습니다.
export const entertainmentCategoryTitles = {
  "variety": [
    "런닝맨",
    "놀라운 토요일",
    "아는 형님",
    "신서유기",
    "뿅뿅 지구오락실",
    "식스센스",
    "무한도전",
    "1박 2일",
    "놀면 뭐하니?",
    "라디오스타",
    "강심장",
    "패밀리가 떴다",
    "해피투게더"
  ],
  "travel": [
    "꽃보다 청춘",
    "꽃보다 할배",
    "텐트 밖은 유럽",
    "꽃보다 누나",
    "부산촌놈 in 시드니",
    "윤식당",
    "태어난 김에 세계일주",
    "나 혼자 산다",
    "다시갈지도",
    "톡파원 25시",
    "배틀트립",
    "짠내투어",
    "걸어서 세계속으로",
    "어서와~ 한국은 처음이지?"
  ],
  "cooking": [
    "삼시세끼",
    "윤식당",
    "서진이네",
    "백패커",
    "장사천재 백사장",
    "줄 서는 식당",
    "백종원의 골목식당",
    "백종원의 푸드트럭",
    "냉장고를 부탁해",
    "맛있는 녀석들",
    "편스토랑",
    "한식대첩",
    "수미네 반찬",
    "집밥 백선생",
    "삼시세끼 어촌편"
  ],
  "dating": [
    "환승연애",
    "러브캐처",
    "나는 SOLO",
    "돌싱글즈",
    "연애의 참견",
    "체인지 데이즈",
    "하트시그널",
    "짝",
    "연애남매",
    "러브라인 추리게임 하트시그널",
    "우결",
    "우리 결혼했어요",
    "선다방"
  ],
  "na-young-seok": [
    "신서유기",
    "삼시세끼",
    "윤식당",
    "윤스테이",
    "서진이네",
    "뿅뿅 지구오락실",
    "꽃보다 청춘",
    "나나투어 with 세븐틴",
    "1박 2일",
    "꽃보다 할배",
    "꽃보다 누나",
    "스페인 하숙",
    "신서유기 외전 강식당",
    "강식당"
  ],
  "quiz": [
    "대탈출",
    "놀라운 토요일",
    "여고추리반",
    "더 지니어스",
    "문제적남자",
    "크라임씬",
    "퀴즈 위의 아이돌",
    "대한외국인",
    "옥탑방의 문제아들",
    "1 대 100",
    "가족오락관",
    "퀴즈 대한민국"
  ],
  "survival": [
    "더 지니어스",
    "소사이어티 게임",
    "피의 게임",
    "보물찾기",
    "더 타임 호텔",
    "더 커뮤니티",
    "대학전쟁",
    "강철부대",
    "생존왕",
    "흑백요리사: 요리 계급 전쟁",
    "피지컬: 100"
  ],
  "observational": [
    "나 혼자 산다",
    "전지적 참견 시점",
    "미운 우리 새끼",
    "동상이몽 2 - 너는 내 운명",
    "온앤오프",
    "살림하는 남자들",
    "슈퍼맨이 돌아왔다",
    "아빠! 어디가?",
    "살림남",
    "인간극장"
  ],
  "sports": [
    "뭉쳐야 찬다",
    "최강야구",
    "골 때리는 그녀들",
    "무쇠소녀단",
    "라켓보이즈",
    "우리동네 예체능",
    "노는 언니",
    "핸섬타이거즈",
    "골프왕",
    "편먹고 공치리",
    "전설체전",
    "뭉쳐야 쏜다"
  ],
  "education": [
    "알쓸신잡",
    "알쓸범잡",
    "벌거벗은 세계사",
    "어쩌다 어른",
    "책 읽어드립니다",
    "선을 넘는 녀석들",
    "차이나는 클라스",
    "꼬리에 꼬리를 무는 그날 이야기",
    "역사저널 그날",
    "명견만리",
    "이슈 픽 쌤과 함께"
  ],
  "healing": [
    "윤스테이",
    "삼시세끼",
    "바퀴 달린 집",
    "숲속의 작은 집",
    "언니네 산지직송",
    "효리네 민박",
    "캠핑클럽",
    "여름방학",
    "리틀 포레스트",
    "아주 사적인 동남아",
    "삼시세끼 어촌편"
  ],
  "idol": [
    "나나투어 with 세븐틴",
    "출장 십오야",
    "인더숲 세븐틴편",
    "아이돌 인간극장",
    "주간 아이돌",
    "아이돌룸",
    "신인왕 방탄소년단 - 채널방탄",
    "EXO의 사다리 타고 세계여행",
    "리얼 GOT7",
    "달려라 방탄"
  ],
  "music-survival": [
    "쇼미더머니",
    "슈퍼스타K",
    "보이스 코리아",
    "스트릿 우먼 파이터",
    "퀸덤",
    "보이즈 플래닛",
    "싱어게인",
    "팬텀싱어",
    "미스터트롯",
    "미스트롯",
    "복면가왕",
    "불후의 명곡",
    "K팝스타",
    "프로듀스 101"
  ],
  "music": [
    "너의 목소리가 보여",
    "놀라운 토요일",
    "비긴어게인",
    "슈퍼밴드",
    "유명가수전",
    "유희열의 스케치북",
    "더 시즌즈",
    "전국노래자랑",
    "열린음악회",
    "쇼! 음악중심",
    "뮤직뱅크",
    "인기가요",
    "엠카운트다운"
  ],
  "family": [
    "아빠! 어디가?",
    "슈퍼맨이 돌아왔다",
    "신박한 정리",
    "해방타운",
    "오은영 리포트 - 결혼 지옥",
    "동상이몽 2 - 너는 내 운명",
    "금쪽같은 내새끼",
    "살림하는 남자들",
    "유자식 상팔자",
    "둥지탈출"
  ],
  "beauty": [
    "겟잇뷰티",
    "스타일 로그",
    "화장대를 부탁해",
    "팔로우미",
    "언니네 쌀롱",
    "렛미인"
  ],
  "pets": [
    "개는 훌륭하다",
    "TV 동물농장",
    "세상에 나쁜 개는 없다",
    "고독한 훈련사",
    "동물은 훌륭하다",
    "동물의 사생활",
    "펫 비타민",
    "개밥 주는 남자",
    "달려라 댕댕이"
  ],
  "concert": [
    "MAMA AWARDS",
    "골든디스크 어워즈",
    "백상예술대상",
    "청룡시리즈어워즈",
    "KBS 연예대상",
    "MBC 방송연예대상",
    "SBS 연예대상",
    "KBS 가요대축제",
    "MBC 가요대제전",
    "SBS 가요대전"
  ],
  "special": [
    "출장 십오야",
    "콩 심은 데 콩 나고 팥 심은 데 팥 난다",
    "라끼남",
    "아이슬란드 간 세끼",
    "신서유기 스페셜 스프링 캠프",
    "무한도전",
    "놀면 뭐하니?"
  ]
};

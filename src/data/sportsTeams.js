import catalog from "./coupangSportsCatalog.json";
import { sportsTeamAliases } from "./sportsTeamAliases";
import { kleagueTeamNameKo } from "./kleagueTeamNameKo";
import { nbaTeamNameKo } from "./nbaTeamNameKo";
import { teamNameKo } from "./teamNameKo";

const teamLogoPath = (slug) => {
  if (!slug) return "";
  const filename = /\.(png|jpe?g|svg|webp)$/i.test(slug) ? slug : `${slug}.png`;
  return `/images/sports/icon/team_logo/team-${filename}`;
};

// teamNameKo의 리그별 ID 묶음과 팀명 사전을 그대로 사용합니다.
const footballTeamIdsByLeague = {
  PL: [57, 58, 61, 62, 63, 64, 65, 66, 67, 71, 73, 322, 341, 349, 351, 354, 397, 402, 1044, 1076],
  PD: [77, 78, 79, 80, 81, 82, 84, 86, 87, 88, 90, 92, 94, 95, 263, 285, 558, 559, 560, 5335],
  BL1: [1, 2, 3, 4, 5, 6, 7, 10, 12, 15, 16, 17, 18, 19, 28, 29, 719, 721],
  FL1: [511, 512, 516, 519, 521, 522, 523, 524, 525, 529, 531, 532, 533, 535, 546, 548, 576, 1045],
  DED: [666, 670, 672, 673, 674, 675, 676, 677, 678, 680, 682, 684, 718, 1909, 1912, 1915, 1920, 6806],
  ELC: [59, 60, 68, 69, 70, 72, 74, 76, 325, 328, 332, 340, 342, 343, 346, 348, 356, 384, 387, 404, 563, 715, 1081, 1126],
};

const footballTeamLogos = {
  57: "arsenal", 58: "aston-villa", 61: "chelsea", 62: "everton", 63: "fulham",
  64: "liverpool", 65: "manchester-city", 66: "manchester-united", 67: "newcastle-united",
  71: "sunderland", 73: "tottenham-hotspur", 322: "hull-city", 341: "leeds-united",
  349: "ipswich-town", 351: "nottingham-forest", 354: "crystal-palace",
  397: "brighton-hove-albion", 402: "brentford", 1044: "bournemouth", 1076: "coventry-city",
  77: "athletic-bilbao", 78: "atletico-madrid", 79: "osasuna", 80: "espanyol",
  81: "barcelona", 82: "getafe", 84: "malaga", 86: "real-madrid", 87: "rayo-vallecano",
  88: "levante", 90: "real-betis", 92: "real-sociedad", 94: "villarreal", 95: "valencia",
  263: "alaves", 285: "elche", 558: "celta-vigo", 559: "sevilla", 560: "deportivo",
  5335: "racing-santander", 3: "bayer-leverkusen", 4: "borussia-dortmund", 5: "bayern-munich",
  2: "hoffenheim", 10: "stuttgart", 12: "werder-bremen", 15: "mainz-05", 16: "augsburg",
  17: "freiburg", 18: "borussia-monchengladbach", 19: "eintracht-frankfurt", 721: "rb-leipzig",
  511: "toulouse", 512: "brest", 516: "marseille", 521: "lille", 522: "nice", 523: "lyon",
  524: "paris-saint-germain", 525: "lorient", 546: "lens", 548: "monaco", 576: "strasbourg",
  674: "psv-eindhoven", 675: "feyenoord", 682: "az-alkmaar", 1920: "fortuna-sittard",
  332: "birmingham-city", 343: "middlesbrough",
};

const nbaTeamLogos = {
  "nba-atl": "atlanta-hawks", "nba-bkn": "brooklyn-nets",
  "nba-bos": "boston-celtics", "nba-cha": "charlotte-hornets",
  "nba-chi": "chicago-bulls", "nba-cle": "cleveland-cavaliers",
  "nba-dal": "dallas-mavericks", "nba-den": "denver-nuggets",
  "nba-det": "detroit-pistons", "nba-ind": "indiana-pacers",
  "nba-gsw": "golden-state-warriors", "nba-hou": "houston-rockets",
  "nba-lac": "los-angeles-clippers", "nba-mem": "memphis-grizzlies",
  "nba-lal": "los-angeles-lakers", "nba-mia": "miami-heat",
  "nba-mil": "milwaukee-bucks", "nba-nop": "new-orleans-pelicans",
  "nba-min": "minnesota-timberwolves", "nba-nyk": "new-york-knicks",
  "nba-okc": "oklahoma-city-thunder", "nba-orl": "orlando-magic",
  "nba-phi": "philadelphia-76ers", "nba-por": "portland-trail-blazers",
  "nba-phx": "phoenix-suns", "nba-sac": "sacramento-kings",
  "nba-sas": "san-antonio-spurs", "nba-uta": "utah-jazz",
  "nba-tor": "toronto-raptors", "nba-was": "washington-wizards",
};

const kleagueTeamLogos = {
  K01: "ulsan", K02: "suwon-samsung", K03: "pohang-steelers", K04: "jeju-sk",
  K05: "jeonbuk", K06: "busan-ipark", K07: "jeonnam-dragons", K08: "seongnam",
  K09: "fc-seoul", K10: "daejeon", K17: "daegu", K18: "incheon-united", K20: "gyeongnam",
  K21: "gangwon", K22: "gwangju", K26: "bucheon-1995", K27: "fc-anyang", K29: "suwon-fc",
  K31: "seoul-e-land", K32: "ansan-greeners", K34: "chungnam-asan", K35: "gimcheon-sangmu",
  K36: "gimpo", K37: "chungbuk-cheongju", K38: "cheonan-city", K39: "hwaseong",
  K40: "paju", K41: "gimhae", K42: "yongin",
};

const buildFootballTeams = (leagueId) =>
  (footballTeamIdsByLeague[leagueId] || [])
    .map((teamId) => ({
      id: leagueId + ":" + teamId,
      teamId,
      name: teamNameKo[teamId],
      logoPath: teamLogoPath(footballTeamLogos[teamId]),
    }))
    .filter((team) => team.name);

const seedTeamsByLeague = {
  ...Object.fromEntries(
    Object.keys(footballTeamIdsByLeague).map((leagueId) => [leagueId, buildFootballTeams(leagueId)]),
  ),
  "kleague-1": Object.entries(kleagueTeamNameKo)
    .filter(([teamId]) => ["K09", "K01", "K10", "K18", "K05", "K21", "K04", "K27", "K03", "K35", "K26", "K22"].includes(teamId))
    .map(([teamId, name]) => ({ id: "kleague-1:" + teamId, teamId, name, logoPath: teamLogoPath(kleagueTeamLogos[teamId]) })),
  "kleague-2": Object.entries(kleagueTeamNameKo)
    .filter(([teamId]) => !["K09", "K01", "K10", "K18", "K05", "K21", "K04", "K27", "K03", "K35", "K26", "K22"].includes(teamId))
    .map(([teamId, name]) => ({ id: "kleague-2:" + teamId, teamId, name, logoPath: teamLogoPath(kleagueTeamLogos[teamId]) })),
  nba: Object.entries(nbaTeamNameKo).map(([teamId, name]) => ({
    id: "nba:" + teamId,
    teamId,
    name,
    logoPath: teamLogoPath(nbaTeamLogos[teamId]),
  })),
};

const extraFootballLogos = {
  "쾰른": "koln",
  "샬케": "schalke-04",
  "함부르크": "hamburg",
  "우니온 베를린": "union-berlin",
  "파더보른": "paderborn-07",
  "엘버스베르크": "elversberg",
  "오세르": "auxerre",
  "스타드 렌": "stade-rennes",
  "트루아": "troyes",
  "앙제": "angers",
  "르 아브르": "le-havre",
  "르망": "le-mans",
  "파리 FC": "paris-fc",
  "덴하흐": "ado-den-haag",
  "포츠머스": "portsmouth",
  "볼턴": "bolton-wanderers",
  "사우스햄튼": "southampton",
  "스토크": "stoke-city",
  "WBA": "west-bromwich-albion",
  "고베": "vissel-kobe",
  "감바 오사카": "gamba-osaka",
  "가시마": "kashima-antlers",
  "가시와": "kashiwa-reysol",
  "교토 상가": "kyoto-sanga",
  "상하이 하이강": "shanghai-port",
  "베이징 궈안": "beijing-guoan",
  "알 나스르": "al-nassr",
  "뉴캐슬 제츠": "newcastle-jets",
  "조호르": "johor",
  "부리람": "buriram-united",
  "포트": "port-fc",
  "꽁안 하노이": "cong-an-hanoi",
  "마치다": "machida-zelvia",
  "멜버른 빅토리": "melbourne-victory",
  "프놈펜": "phnom-penh-crown",
  "비엣텔": "viettel",
  "쿠칭 시티": "kuching-city",
  "LAFC": "lafc",
  "밴쿠버": "vancouver-whitecaps",
  "오스틴": "austin-fc",
  "LA 갤럭시": "los-angeles-galaxy",
  "뉴욕 시티": "new-york-city",
  "다름슈타트": "darmstadt-98",
  "마그데부르크": "magdeburg",
  "장크트파울리": "st-pauli",
  "카를스루어": "karlsruhe",
  "코트부스": "energie-cottbus",
  "베식타시": "besiktas",
  "대한민국": "south-korea",
  "베네수엘라": "venezuela",
  "알 아흘리 SFC": "al-ahli-saudi",
  "알 아인": "al-ain",
  "생테티엔": "saint-etienne",
  "페르시브": "persib-bandung",
  "노리치": "norwich-city",
  "더비 카운티": "derby-county",
  "렉섬": "wrexham",
  "링컨 시티": "lincoln-city",
  "밀월": "millwall",
  "번리": "burnley",
  "브리스톨 시티": "bristol-city",
  "블랙번": "blackburn-rovers",
  "셰필드 유나이티드": "sheffield-united",
  "스완지": "swansea-city",
  "왓포드": "watford",
  "울버햄튼": "wolverhampton-wanderers",
  "웨스트햄": "west-ham-united",
  "찰턴": "charlton-athletic",
  "카디프": "cardiff-city",
  "프레스턴": "preston-north-end",
  "QPR": "queens-park-rangers",
  "뉘른베르크": "1-fc-nurnberg",
  "드레스덴": "dynamo-dresden",
  "보훔": "vfl-bochum",
  "볼프스부르크": "vfl-wolfsburg",
  "브라운슈바이크": "tsv-eintracht-braunschweig",
  "빌레펠트": "arminia-bielefeld",
  "오스나브뤼크": "vfl-osnabruck",
  "카이저슬라우테른": "kaiserslautern",
  "퓌르트": "spvgg-greuther-furth",
  "하노버": "hannover-96",
  "하이덴하임": "1-fc-heidenheim-1846",
  "헤르타": "hertha-berlin",
  "홀슈타인 킬": "holstein-kiel",
  "레스터": "leicester-city",
  "셰필드 웬즈데이": "sheffield-wednesday",
  "옥스퍼드": "oxford-united",
  "플리머스": "plymouth-argyle",
  "크롤리 타운": "crawley-town",
  "허더즈필드": "huddersfield-town",
  "맨스필드": "mansfield-town",
  "그림스비": "grimsby-town",
  "포트 베일": "port-vale",
  "동커스터": "doncaster-rovers",
  "월솔": "walsall",
  "프로이센 뮌스터": "preussen-munster",
  "비스바덴": "sv-wehen-wiesbaden",
  "레이턴": "leyton-orient",
  "모컴": "morecambe",
  "서튼": "sutton-united",
  "솔퍼드": "salford-city",
  "애크링턴": "accrington-stanley",
  "엑서터": "exeter-city",
  "레알 에스파냐": "real-espana",
  "클루브 아메리카": "club-america",
  "올림피아": "club-deportivo-olimpia",
  "카르타히네스": "cartagines",
  "레알 오비에도": "real-oviedo",
  "마요르카": "mallorca",
  "지로나": "girona",
  "그라나다": "granada",
  "라스팔마스": "las-palmas",
  "레알 바야돌리드": "real-valladolid",
  "부르고스": "burgos",
  "히혼": "sporting-gijon",
  "안도라": "fc-andorra",
  "알메리아": "almeria",
  "알바세테": "albacete",
  "카디스": "cadiz",
  "레가네스": "leganes",
  "미란데스": "mirandes",
  "카스테욘": "castellon",
  "에이바르": "eibar",
  "우에스카": "huesca",
  "카르타헤나": "fc-cartagena",
  "세우타": "ceuta",
  "테네리페": "tenerife",
  "아모레비에타": "amorebieta",
  "폰페라디나": "ponferradina",
  "로그로녜스": "ud-logrones",
  "고 어헤드": "go-ahead-eagles",
  "네이메헨": "nec-nijmegen",
  "빌럼": "willem-ii",
  "스파르타": "sparta-rotterdam",
  "아약스": "ajax-amsterdam",
  "엑셀시오르": "excelsior",
  "위트레흐트": "fc-utrecht",
  "즈볼러": "pec-zwolle",
  "캄뷔르": "sc-cambuur",
  "텔스타": "telstar",
  "트벤테": "fc-twente",
  "헤이렌베인": "heerenveen",
  "흐로닝언": "fc-groningen",
  "낭트": "nantes",
  "메스": "metz",
  "로데스": "rodez-aveyron",
  "몽펠리에": "montpellier",
  "발랑시엔": "valenciennes",
  "소쇼": "sochaux",
  "랭스": "stade-de-reims",
  "라발루아": "stade-laval",
  "클레르몽": "clermont-foot",
  "오를레앙": "orleans",
  "됭케르크": "dunkerque",
  "파흐타코르": "pakhtakor.svg",
  "킷치": "kitchee",
  "스바이 리엥": "svay-rieng",
  "에센": "rot-weiss-essen",
  "미네라": "deportiva-minera",
  "폰테베드라": "pontevedra",
  "우니오니스타스": "unionistas-salamanca",
  "엑스트레마두라": "cd-extremadura",
  "콘켄세": "ub-conquense",
  "루앙": "fc-rouen",
  "브리오신": "stade-briochin",
  "귀터슬로": "fc-gutersloh",
  "탬워스": "tamworth",
  "라싱 페롤": "racing-ferrol",
  "마르베야": "marbella",
  "아란디나": "arandina",
  "에스포르티바": "ue-vic",
  "호베 에스파뇰": "jove-espanol",
  "루고": "cd-lugo",
  "카세레뇨": "cacereno",
  "바르바스트로": "barbastro",
  "오베르뉴": "le-puy-en-velay.webp",
  "베흐제학 페리고흐": "bergerac-perigord",
  "보르도": "bordeaux",
  "에스팔리": "fc-espaly",
  "흐벨": "us-revel.jpg",
};

// 같은 도시명이나 축약명을 쓰는 다른 구단의 로고와 섞이지 않게 리그별로 지정합니다.
const footballLogosByLeague = {
  mls: {
    "댈러스": "fc-dallas",
    "미네소타": "minnesota-united-fc",
    "산호세": "san-jose-earthquakes",
    "샌디에이고": "san-diego-fc",
    "세인트루이스": "st-louis-city-sc",
    "솔트레이크": "real-salt-lake",
    "시애틀 사운더스": "seattle-sounders-fc",
    "캔자스시티": "sporting-kansas-city",
    "콜로라도": "colorado-rapids",
    "포틀랜드": "portland-timbers",
    "휴스턴": "houston-dynamo-fc",
    "내슈빌": "nashville-sc",
    "뉴욕 레드불스": "new-york-red-bulls",
    "뉴잉글랜드": "new-england-revolution",
    "몽레알": "cf-montreal",
    "샬럿": "charlotte-fc",
    "시카고": "chicago-fire-fc",
    "신시내티": "fc-cincinnati",
    "애틀랜타": "atlanta-united-fc",
    "올랜도 시티": "orlando-city-sc",
    "인터 마이애미": "inter-miami-cf",
    "콜럼버스": "columbus-crew",
    "토론토": "toronto-fc",
    "필라델피아": "philadelphia-union",
    "DC 유나이티드": "dc-united",
  },
  dfb: { "포르튀나": "fortuna-dusseldorf" },
};

const nflLogos = {
  "뉴욕 제츠": "new-york-jets",
  "덴버": "denver-broncos",
  "마이애미": "miami-dolphins",
  "신시내티": "cincinnati-bengals",
  "인디애나폴리스": "indianapolis-colts",
  "테네시": "tennessee-titans",
  "휴스턴": "houston-texans",
  "LA 차저스": "los-angeles-chargers",
  "그린베이": "green-bay-packers",
  "뉴욕 자이언츠": "new-york-giants",
  "미네소타": "minnesota-vikings",
  "시카고": "chicago-bears",
  "애리조나": "arizona-cardinals",
  "워싱턴": "washington-commanders",
  "뉴잉글랜드": "new-england-patriots",
  "라스베이거스": "las-vegas-raiders",
  "버펄로": "buffalo-bills",
  "볼티모어": "baltimore-ravens",
  "잭슨빌": "jacksonville-jaguars",
  "캔자스시티": "kansas-city-chiefs",
  "클리블랜드": "cleveland-browns",
  "피츠버그": "pittsburgh-steelers",
  "뉴올리언스": "new-orleans-saints",
  "댈러스": "dallas-cowboys",
  "디트로이트": "detroit-lions",
  "샌프란시스코": "san-francisco-49ers",
  "시애틀": "seattle-seahawks",
  "애틀랜타": "atlanta-falcons",
  "캐롤라이나": "carolina-panthers",
  "탬파베이": "tampa-bay-buccaneers",
  "필라델피아": "philadelphia-eagles",
  "LA 램스": "los-angeles-rams"
};

const footballTeamsByName = new Map(
  Object.entries(seedTeamsByLeague)
    .filter(([leagueId]) => leagueId !== "nba")
    .flatMap(([, teams]) => teams.map((team) => [team.name, team])),
);

export const SPORTS_TEAMS_BY_LEAGUE = Object.fromEntries(
  catalog.map((league) => {
    const existing = new Map((seedTeamsByLeague[league.id] || []).map((team) => [team.name, team]));
    const teams = league.teams.map((name) => {
      // 독일 포칼의 포르튀나와 네덜란드 포르튀나는 다른 팀입니다.
      const shared = league.sport === "축구" && !(league.id === "dfb" && name === "포르튀나")
        ? footballTeamsByName.get(name)
        : null;
      const seed = existing.get(name) || shared;
      const teamId = seed?.teamId;
      const slug = league.id === "nfl"
        ? nflLogos[name]
        : league.sport === "축구"
          ? footballLogosByLeague[league.id]?.[name] || extraFootballLogos[name]
          : "";
      return {
        id: `${league.id}:${teamId ?? encodeURIComponent(name)}`,
        ...(teamId != null ? { teamId } : {}),
        name,
        logoPath: seed?.logoPath || teamLogoPath(slug),
      };
    });
    return [league.id, teams];
  }),
);

const normalizedName = (value = "") => String(value).normalize("NFKC").replace(/[\s.·-]/g, "").toLowerCase();
const aliasByName = new Map(Object.entries(sportsTeamAliases).map(([alias, name]) => [normalizedName(alias), name]));

// API 응답은 리그 안의 허용된 팀에 연결되는 경우에만 사용합니다.
export function findSportsTeam(leagueId, candidate = {}) {
  const teams = SPORTS_TEAMS_BY_LEAGUE[leagueId];
  if (!teams) return null;
  const providerId = candidate.teamId ?? candidate.team_id ?? candidate.id;
  if (providerId != null) {
    const match = teams.find((team) => team.teamId != null && String(team.teamId) === String(providerId));
    if (match) return match;
  }
  for (const value of [candidate.name, candidate.shortName, candidate.teamName]) {
    if (!value) continue;
    const name = aliasByName.get(normalizedName(value)) || value;
    const match = teams.find((team) => normalizedName(team.name) === normalizedName(name));
    if (match) return match;
  }
  return null;
}

export function mergeSportsTeamDetails(leagueId, remoteTeams = []) {
  const localTeams = SPORTS_TEAMS_BY_LEAGUE[leagueId] || [];
  const details = new Map();
  for (const remote of remoteTeams) {
    const local = findSportsTeam(leagueId, remote);
    if (local) details.set(local.id, remote);
  }
  return localTeams.map((team) => ({ ...details.get(team.id), ...team, crest: details.get(team.id)?.crest }));
}


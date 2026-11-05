import catalog from "./coupangSportsCatalog.json";
import { ESPN_LEAGUE_PATHS } from "./espnLeagues";

// 표시 순서와 명칭은 사용자가 제공한 쿠팡플레이 목록을 기준으로 합니다.
export const SPORTS_LEAGUES = catalog.map((league) => ({
  ...league,
  ...(ESPN_LEAGUE_PATHS[league.id] ? { espnPath: ESPN_LEAGUE_PATHS[league.id] } : {}),
}));
export const SPORTS_LEAGUE_BY_ID = Object.fromEntries(SPORTS_LEAGUES.map((league) => [league.id, league]));

export const SPORTS_CATEGORIES = ["전체", "축구", "해외축구", "농구", "레이싱", "골프", "일반"];
export const DEFAULT_SELECTED_LEAGUE_IDS = ["PL", "nba", "f1", "PD", "kleague-1"];

export const SPORTS_BANNERS = [
  {
    id: "premier-league",
    image: "/images/sports/campaign/hero-premier-league.png",
    alt: "프리미어리그",
  },
  {
    id: "formula-one",
    image: "/images/sports/campaign/hero-f1.png",
    alt: "F1",
  },
  {
    id: "laliga",
    image: "/images/sports/campaign/hero-laliga-clean.png",
    alt: "라리가",
  },
];

export const SPORTS_FEATURED_LEAGUE_IDS = ["PL", "PD", "nba"];

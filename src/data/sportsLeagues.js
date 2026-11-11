import catalog from "./coupangSportsCatalog.json";
import { ESPN_LEAGUE_PATHS } from "./espnLeagues";

// ESPN 경로와 별도 일정 서비스가 연결된 리그만 목록에 노출합니다.
const SCHEDULE_API_LEAGUE_IDS = new Set([
  ...Object.keys(ESPN_LEAGUE_PATHS),
  "kleague-1",
  "kleague-2",
  "f1", // Jolpica F1 일정 API
]);

// 표시 순서는 기존 카탈로그를 따르고 API 일정이 연결된 리그만 포함합니다.
export const SPORTS_LEAGUES = catalog.filter((league) => SCHEDULE_API_LEAGUE_IDS.has(league.id)).map((league) => ({
  ...league,
  whiteLogoPath: `/images/sports/league-detail/white-logos/${league.id}.png`,
  ...(ESPN_LEAGUE_PATHS[league.id] ? { espnPath: ESPN_LEAGUE_PATHS[league.id] } : {}),
}));
export const SPORTS_LEAGUE_BY_ID = Object.fromEntries(SPORTS_LEAGUES.map((league) => [league.id, league]));

const AVAILABLE_NON_FOOTBALL_CATEGORIES = [...new Set(
  SPORTS_LEAGUES.map((league) => league.sport).filter((sport) => sport !== "축구"),
)];
export const SPORTS_CATEGORIES = ["전체", "축구", "해외축구", ...AVAILABLE_NON_FOOTBALL_CATEGORIES];
export const DEFAULT_SELECTED_LEAGUE_IDS = ["PL", "nba", "f1", "PD", "kleague-1", "nfl"];

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

import { sportsTeamAliases } from "./sportsTeamAliases.js";

export const LEAGUE_VIDEO_QUERIES = {
  PL: "프리미어리그", PD: "라리가", PD2: "라리가2", BL1: "분데스리가", BL2: "분데스리가2",
  FL1: "리그1", DED: "에레디비시", ELC: "챔피언십", FAC: "FA컵", carabao: "카라바오컵",
  "kleague-1": "K리그1", "kleague-2": "K리그2", nba: "NBA", nfl: "NFL", f1: "F1",
  mls: "MLS", dfb: "DFB 포칼", "copa-del-rey": "코파 델 레이", "coupe-de-france": "쿠프 드 프랑스",
  "concacaf-champions-cup": "CONCACAF", acle: "AFC 챔피언스리그", acl2: "AFC 챔피언스리그2", "super-lig": "쉬페르리그",
};

const normalizeLeague = value => String(value).normalize("NFKC").replace(/[\s.·_-]/g, "").toLowerCase();
const leagueNames = new Map(Object.entries(LEAGUE_VIDEO_QUERIES).flatMap(([id, name]) => [
  [normalizeLeague(id), id], [normalizeLeague(name), id],
]));

export function getExplicitVideoLeague(title = "") {
  // Descriptions advertise several leagues, so search hits alone do not identify the competition.
  // Read only explicit title labels; unlabeled match previews are resolved by their teams later.
  const labels = [...title.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
  labels.push(...title.split(/\s+[lI|ㅣ]\s+/));
  return labels.map(label => leagueNames.get(normalizeLeague(label))).find(Boolean);
}

export function matchesVideoLeague(leagueId, title = "") {
  const explicit = getExplicitVideoLeague(title);
  return !explicit || explicit === leagueId;
}

export const getVideoTeamQuery = team => team === "라싱 산탄데르" ? "산탄데르" : team;

export function matchesVideoTeam(team, title = "") {
  if (!team) return true;
  const names = [team, ...Object.entries(sportsTeamAliases).filter(([, name]) => normalizeLeague(name) === normalizeLeague(team)).map(([alias]) => alias)];
  const text = normalizeLeague(title);
  return names.some(name => text.includes(normalizeLeague(name)));
}

export function getVideoMonthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("조회할 월을 선택해 주세요.");
  const [year, number] = month.split("-").map(Number);
  if (year < 2010 || year > 2100) throw new Error("조회할 월이 올바르지 않습니다.");
  const start = Date.UTC(year, number - 1, 1) - 9 * 60 * 60 * 1000;
  const end = Date.UTC(year, number, 1) - 9 * 60 * 60 * 1000;
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

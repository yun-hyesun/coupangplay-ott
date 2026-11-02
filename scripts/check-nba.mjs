import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.API_NINJAS_KEY;
const BASE = "https://api.api-ninjas.com/v1";

async function call(path, params = {}) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "X-Api-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${path})`);
  return res.json();
}

if (!API_KEY) throw new Error("API_NINJAS_KEY가 설정되지 않았습니다.");

// 팀 목록
const teams = await call("/sportsteams", { league: "nba" });
console.log(`\n=== 팀 ${teams.length}개 (첫 팀 구조) ===`);
console.log(JSON.stringify(teams[0], null, 2));
console.table(teams.map((t) => ({ team_id: t.team_id, name: t.name, abbr: t.abbreviation })));

// 순위
const standings = await call("/sportsstandings", { league: "nba" });
console.log("\n=== 순위 (첫 팀 구조) ===");
console.log(JSON.stringify(standings[0], null, 2));

// 오늘 경기 (날짜를 주지 않으면 미국 동부시간 기준 오늘)
const games = await call("/sportsgames", { league: "nba" });
console.log(`\n=== 오늘 경기 ${games.length}개 (첫 경기 구조) ===`);
console.log(JSON.stringify(games[0], null, 2));
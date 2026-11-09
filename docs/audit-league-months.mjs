import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const year = Number(process.argv[2] || 2026);
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, watch: null, hmr: false } });
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => originalFetch(typeof input === "string" && input.startsWith("/") ? `http://localhost:5173${input}` : input, options);
try {
  const { SPORTS_LEAGUES } = await server.ssrLoadModule("/src/data/sportsLeagues.js");
  const { getLeagueMonthAvailability } = await server.ssrLoadModule("/src/service/leagueMonthAvailabilityService.js");
  const results = [];
  let index = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (index < SPORTS_LEAGUES.length) {
      const league = SPORTS_LEAGUES[index++];
      const data = await getLeagueMonthAvailability(league.id, year);
      const months = status => Object.keys(data.months).filter(month => data.months[month] === status).map(month => Number(month.slice(5)));
      const row = { ...data, name: league.name, active: months("active"), inactive: months("inactive"), unknown: months("unknown") };
      results.push(row);
      console.log(JSON.stringify({ league: league.name, active: row.active, inactive: row.inactive, unknown: row.unknown }));
    }
  }));
  results.sort((a, b) => SPORTS_LEAGUES.findIndex(league => league.id === a.leagueId) - SPORTS_LEAGUES.findIndex(league => league.id === b.leagueId));
  const format = months => months.length ? months.map(month => `${month}월`).join(", ") : "없음";
  const report = [`# ${year}년 리그별 월 선택 가능 여부`, "", `확인 시각: ${new Date().toISOString()}`, "",
    "사이트에 노출되는 23개 리그의 경기 일정과 공식 시즌·라운드 달력을 조회했습니다. 한국 시간으로 변환한 경기 날짜와 발표된 대회 일정으로 해당 연도의 조회 가능한 월을 판정합니다.", "",
    "경기 없는 월과 조회 실패·불완전 응답은 구분합니다. 미확인 월은 비시즌으로 확정하지 않으며 재조회할 수 있습니다. 동영상 달력의 현재 월 이후 선택 제한은 별도로 유지합니다.", "",
    "| 리그 | 시즌·경기 월 | 비시즌·경기 없는 월 | 미확인 월 | 확인된 출처 |", "|---|---|---|---|---|",
    ...results.map(row => `| ${row.name} | ${format(row.active)} | ${format(row.inactive)} | ${format(row.unknown)} | ${row.sources.join(", ") || "미확인"} |`), "",
    "사용 출처: Football-Data 경기 일정, ESPN 리그별 시즌 달력·라운드 일정, K리그 공식 발표, Jolpica F1 레이스 일정.", "",
    "K리그 월별 API는 일부 과거 월의 기록이 비어 있으므로 2026년은 공식 발표로 교차 확인했습니다. [대회 일정](https://www.kleague.com/about/competition.do), [K리그1 월드컵 휴식기 종료](https://www.kleague.com/news_view.do?orderBy=seq&page=1&seq=95533&viewOption=album), [K리그2 후반기 재개](https://www.kleague.com/news_view.do?orderBy=seq&page=1&seq=95442&viewOption=album), [K리그2 플레이오프](https://www.kleague.com/news_view.do?orderBy=seq&seq=96661&viewOption=album).", "",
    "달력에서 선택한 연도의 API 일정으로 다시 판정하며, K리그 2026년은 위 공식 발표로 보완합니다. 컵대회·플레이오프·프리시즌도 해당 리그 API에 실제 경기로 등록되어 있으면 경기 있는 월로 처리합니다.", ""];
  await mkdir(new URL("./", import.meta.url), { recursive: true });
  await writeFile(new URL(`./league-season-months-${year}.md`, import.meta.url), report.join("\n"));
  await writeFile(new URL(`./league-season-months-${year}.json`, import.meta.url), JSON.stringify(results, null, 2));
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}

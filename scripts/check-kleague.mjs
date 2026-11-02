import { KLEAGUE_LEAGUES } from "../src/data/kleagueLeagues.js";
import { kleagueTeamNameKo } from "../src/data/kleagueTeamNameKo.js";

const BASE = "https://www.kleague.com";

for (const league of KLEAGUE_LEAGUES) {
  const res = await fetch(`${BASE}/record/teamRank.do?leagueId=${league.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  const teams = json.data.teamRank;

  console.log(`\n=== ${league.name} (leagueId=${league.id}) / ${teams.length}팀 ===`);
  console.table(
    teams.map((t) => ({
      teamId: t.teamId,
      영문: t.teamName,
      한글: kleagueTeamNameKo[t.teamId] ?? "❌ 매핑 없음",
    }))
  );
}
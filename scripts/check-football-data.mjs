import { config } from "dotenv";
import { teamNameKo } from "../src/data/teamNameKo.js";
import { leagueNameKo } from "../src/data/leagueNameKo.js";
config({ path: ".env.local" });

const API_KEY = process.env.FOOTBALL_DATA_KEY;

async function checkApi() {
  try {
    if (!API_KEY) {
      throw new Error("FOOTBALL_DATA_KEY가 없습니다.");
    }

    const response = await fetch(
      "https://api.football-data.org/v4/competitions/ELC/teams?season=2026",
      {
        headers: {
          "X-Auth-Token": API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("API 오류:", response.status, data);
      return;
    }

    console.log(
  "리그:",
  leagueNameKo[data.competition.code] ?? data.competition.name
);
    console.log("시즌:", data.season.startDate);

console.log(
  data.teams.map((team) => ({
    id: team.id,
    name: teamNameKo[team.id] ?? team.name
  }))
);
  } catch (error) {
    console.error("오류:", error);
  }
}

checkApi();
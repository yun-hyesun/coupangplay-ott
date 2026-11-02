import { config } from "dotenv";

config({ path: ".env.local" });

const API_KEY = process.env.API_FOOTBALL_KEY;

async function checkApi() {
  try {
    if (!API_KEY) {
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    const response = await fetch(
      "https://v3.football.api-sports.io/teams?league=39&season=2024",
      {
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("API 오류:", data.errors);
      return;
    }

    console.log(
      data.response.map(({ team }) => ({
        id: team.id,
        name: team.name
      }))
    );
  } catch (error) {
    console.error("오류 발생:", error);
  }
}

checkApi();
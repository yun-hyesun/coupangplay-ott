const BASE = "https://api.jolpi.ca/ergast/f1";
const SEASON = "2026";

async function call(path) {
  const res = await fetch(`${BASE}${path}.json?limit=100`);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${path})`);
  return (await res.json()).MRData;
}

// 1. 팀(컨스트럭터) 목록
const c = await call(`/${SEASON}/constructors`);
const constructors = c.ConstructorTable.Constructors;
console.log(`\n=== ${SEASON} 팀 ${constructors.length}개 (첫 팀 구조) ===`);
console.log(JSON.stringify(constructors[0], null, 2));
console.table(
  constructors.map((t) => ({
    constructorId: t.constructorId,
    팀: t.name,
    국적: t.nationality,
  }))
);

// 2. 드라이버 목록
const d = await call(`/${SEASON}/drivers`);
const drivers = d.DriverTable.Drivers;
console.log(`\n=== ${SEASON} 드라이버 ${drivers.length}명 (첫 드라이버 구조) ===`);
console.log(JSON.stringify(drivers[0], null, 2));
console.table(
  drivers.map((x) => ({
    driverId: x.driverId,
    번호: x.permanentNumber,
    코드: x.code,
    이름: `${x.givenName} ${x.familyName}`,
    국적: x.nationality,
  }))
);

// 3. 팀별 소속 드라이버 (드라이버 순위 응답에 소속팀이 들어 있습니다)
const s = await call(`/${SEASON}/driverstandings`);
const rows = s.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
const byTeam = {};
rows.forEach((r) => {
  r.Constructors.forEach((t) => {
    (byTeam[t.name] ??= []).push(`${r.Driver.givenName} ${r.Driver.familyName}`);
  });
});
console.log("\n=== 팀별 드라이버 ===");
console.table(Object.entries(byTeam).map(([팀, list]) => ({ 팀, 드라이버: list.join(", ") })));
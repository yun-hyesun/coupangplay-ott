// kleague.com teamId → 한글 팀명
export const kleagueTeamNameKo = {
  // K리그1
  K09: "서울",
  K01: "울산",
  K10: "대전",
  K18: "인천",
  K05: "전북",
  K21: "강원",
  K04: "제주",
  K27: "안양",
  K03: "포항",
  K35: "김천",
  K26: "부천",
  K22: "광주",

  // K리그2
  K02: "수원",
  K29: "수원FC",
  K31: "서울E",
  K17: "대구",
  K06: "부산",
  K39: "화성",
  K34: "충남아산",
  K36: "김포",
  K20: "경남",
  K40: "파주",
  K42: "용인",
  K37: "충북청주",
  K08: "성남",
  K38: "천안",
  K07: "전남",
  K32: "안산",
  K41: "김해",
};

export const getKleagueTeamName = (teamId, fallback) =>
  kleagueTeamNameKo[teamId] ?? fallback;
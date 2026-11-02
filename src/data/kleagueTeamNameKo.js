// kleague.com teamId → 한글 팀명
export const kleagueTeamNameKo = {
  // K리그1
  K09: "FC서울",
  K01: "울산 HD",
  K10: "대전 하나 시티즌",
  K18: "인천 유나이티드",
  K05: "전북 현대",
  K21: "강원FC",
  K04: "제주 SK",
  K27: "FC안양",
  K03: "포항 스틸러스",
  K35: "김천 상무",
  K26: "부천FC 1995",
  K22: "광주FC",

  // K리그2
  K02: "수원 삼성",
  K29: "수원FC",
  K31: "서울 이랜드",
  K17: "대구FC",
  K06: "부산 아이파크",
  K39: "화성FC",
  K34: "충남아산",
  K36: "김포FC",
  K20: "경남FC",
  K40: "파주 프런티어",
  K42: "용인FC",
  K37: "충북청주",
  K08: "성남FC",
  K38: "천안시티FC",
  K07: "전남 드래곤즈",
  K32: "안산 그리너스",
  K41: "김해FC",
};

export const getKleagueTeamName = (teamId, fallback) =>
  kleagueTeamNameKo[teamId] ?? fallback;
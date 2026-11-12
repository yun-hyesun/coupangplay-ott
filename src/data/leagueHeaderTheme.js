const LEAGUE_HEADER_COLORS = {
  PL: "#321852",
  nba: "#174d9c",
  PD: "#ff515d",
  "kleague-1": "#ff80b4",
  "kleague-2": "#315da7",
  BL1: "#d71920",
  BL2: "#d71920",
  mls: "#000000",
  nfl: "#d11322",
  FL1: "#075ce5",
  ELC: "#47246f",
  FAC: "#d80b22",
  carabao: "#d91f32",
  dfb: "#00bb75",
  "copa-del-rey": "#ff4b00",
  "coupe-de-france": "#2549a1",
  "concacaf-champions-cup": "#263a65",
  acle: "#cf1833",
  acl2: "#315da7",
  "super-lig": "#df2433",
  PD2: "#ff515d",
};

export function getLeagueTheme(league) {
  if (league.accent) return league.accent;
  if (LEAGUE_HEADER_COLORS[league.id]) return LEAGUE_HEADER_COLORS[league.id];
  if (league.sport === "농구") return "#173c68";
  if (league.sport === "레이싱") return "#3a1720";
  if (league.sport === "미식축구" || league.sport === "일반") return "#1b314d";
  return "#391548";
}

export function getLeagueHeaderStyle(league) {
  return {
    "--league-header-color": getLeagueTheme(league),
    "--league-header-background-image": league.id === "PL"
      ? 'url("/images/sports/league-detail/detail-brand-veil.svg"), url("/images/sports/league-detail/detail-bg-panels.svg")'
      : "linear-gradient(120deg, transparent, rgba(0, 0, 0, .16))",
  };
}

import { findSportsTeam } from "./sportsTeams";
import { SPORTS_LEAGUE_BY_ID } from "./sportsLeagues";

const dateKey = (value, timeZone) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export function hasPromoKickoffTime(game) {
  if (typeof game.kickoffTimeConfirmed === "boolean") return game.kickoffTimeConfirmed;
  return game.sourceProvider === "football-data" && game.statusDetail === "TIMED";
}

export function selectNextElClasico(games, now = Date.now()) {
  const today = dateKey(now, "Europe/Madrid");
  return games.filter(game => {
    if (game.competitionCode !== "PD" || !/^(SCHEDULED|TIMED)$/i.test(game.status || "")) return false;
    if (!game.home || !game.away) return false;
    const homeId = findSportsTeam("PD", game.home)?.teamId;
    const awayId = findSportsTeam("PD", game.away)?.teamId;
    if (!((homeId === 81 && awayId === 86) || (homeId === 86 && awayId === 81))) return false;
    const kickoff = Date.parse(game.utcDate || game.startTime);
    if (!Number.isFinite(kickoff)) return false;
    return hasPromoKickoffTime(game) ? kickoff > Number(new Date(now)) : dateKey(kickoff, "Europe/Madrid") >= today;
  }).sort((a, b) => Date.parse(a.utcDate || a.startTime) - Date.parse(b.utcDate || b.startTime))[0] || null;
}

export function formatPromoMatchDate(game) {
  const confirmed = hasPromoKickoffTime(game);
  const date = new Date(game.utcDate || game.startTime);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ko-KR", {
    timeZone: confirmed ? "Asia/Seoul" : "Europe/Madrid",
    year: "numeric", month: "numeric", day: "numeric", weekday: "short",
  }).formatToParts(date).map(part => [part.type, part.value]));
  const day = `${parts.year}년 ${parts.month}월 ${parts.day}일 (${parts.weekday})`;
  return confirmed ? `${day} ${new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit",
  }).format(date)} (한국시간)` : `${day} · 시간 미정 (현지 날짜)`;
}

export function getPromoMatchWatchlistContent(game) {
  return {
    id: `${game.competitionCode}_${game.gameId ?? game.id}`,
    media_type: "sports",
    title: `${game.home.name} vs ${game.away.name}`,
    leagueId: game.competitionCode,
    sport: SPORTS_LEAGUE_BY_ID[game.competitionCode]?.sport || game.sport || null,
    homeName: game.home.name,
    awayName: game.away.name,
    homeTeamId: game.home.teamId ?? game.home.id ?? null,
    awayTeamId: game.away.teamId ?? game.away.id ?? null,
    homeLogo: game.home.crest || game.home.logoPath || null,
    awayLogo: game.away.crest || game.away.logoPath || null,
    thumbnail: game.broadcastThumbnail || game.thumbnail || null,
    raceName: game.raceName || null,
    startTime: hasPromoKickoffTime(game) ? game.utcDate || game.startTime : null,
  };
}

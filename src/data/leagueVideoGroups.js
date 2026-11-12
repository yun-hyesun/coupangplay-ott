import { SPORTS_TEAMS_BY_LEAGUE, findSportsTeam } from "./sportsTeams";
import { getVideoTeamAliases, matchesVideoLeague } from "./leagueVideoQueries";
import { matchesScheduleUnit } from "./leagueScheduleUnits";

const normalize = value => String(value || "").normalize("NFKC").replace(/[\s.·_–-]/g, "").toLowerCase();
export function getVideoDateKey(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const getCurrentVideoMonth = () => getVideoDateKey().slice(0, 7);
export function shiftVideoMonth(month, offset) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function formatVideoMonth(month) {
  const [year, number] = month.split("-").map(Number);
  return `${year}년 ${number}월`;
}
export function formatVideoDate(dateKey) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${dateKey}T00:00:00Z`));
}

function teamMentions(leagueId, text, last = false) {
  const normalized = normalize(text);
  return (SPORTS_TEAMS_BY_LEAGUE[leagueId] || []).flatMap(team => {
    const aliases = getVideoTeamAliases(team.name);
    const indexes = aliases.map(alias => last ? normalized.lastIndexOf(normalize(alias)) : normalized.indexOf(normalize(alias))).filter(index => index >= 0);
    return indexes.length ? [{ team, index: last ? Math.max(...indexes) : Math.min(...indexes), length: normalize(team.name).length }] : [];
  }).sort((a, b) => a.index - b.index || b.length - a.length).filter((entry, index, all) => !all.slice(0, index).some(previous => previous.index === entry.index));
}

export function parseVideoMatch(leagueId, video) {
  const title = video.title || "";
  const round = title.match(/(?:^|[\s\]])(\d{1,2})\s*(?:R\b|라운드)/i)?.[1] || "";
  const versus = title.match(/\bvs\.?\b|\s대\s/i);
  if (versus) {
    const left = teamMentions(leagueId, title.slice(0, versus.index), true);
    const right = teamMentions(leagueId, title.slice(versus.index + versus[0].length));
    // The matchup often appears after a player name or commentary in the title.
    const home = left.at(-1)?.team;
    const away = right.find(entry => entry.team.id !== home?.id)?.team;
    if (home && away) return { home, away, round };
  }
  const mentions = teamMentions(leagueId, title);
  return { home: mentions[0]?.team || null, away: null, round };
}

export function groupLeagueVideos({ leagueId, videos, fixtures = [], teamId = "", round = "", month = "" }) {
  const groups = new Map();
  const seen = new Set();
  const parsedVideos = videos.map(video => ({ video, parsed: parseVideoMatch(leagueId, video) }));
  for (const { video, parsed } of parsedVideos) {
    if (seen.has(video.id) || !video.publishedAt || Number.isNaN(Date.parse(video.publishedAt))) continue;
    seen.add(video.id);
    if (!matchesVideoLeague(leagueId, video.title)) continue;
    // Search also matches descriptions shared across leagues. Only identifiable league matchups belong in this feed.
    if (!parsed.home || !parsed.away) continue;
    if (teamId && parsed.home?.id !== teamId && parsed.away?.id !== teamId) continue;
    const pair = [parsed.home.id, parsed.away.id].sort().join("|");
    const roundEvidence = parsedVideos.filter(entry => entry.parsed.round && entry.parsed.home && entry.parsed.away
      && [entry.parsed.home.id, entry.parsed.away.id].sort().join("|") === pair
      && (!parsed.round || entry.parsed.round === parsed.round)
      && Math.abs(Date.parse(entry.video.publishedAt) - Date.parse(video.publishedAt)) < 3 * 86400000);
    const relatedRound = parsed.round || roundEvidence[0]?.parsed.round || "";
    const uploadAnchor = roundEvidence.filter(entry => entry.parsed.round === relatedRound)
      .sort((a, b) => a.video.publishedAt.localeCompare(b.video.publishedAt))[0]?.video.publishedAt || video.publishedAt;
    const candidates = parsed.home && parsed.away ? fixtures.filter(game => {
      const home = findSportsTeam(leagueId, { name: game.home?.name });
      const away = findSportsTeam(leagueId, { name: game.away?.name });
      return home && away && [home.id, away.id].sort().join("|") === [parsed.home.id, parsed.away.id].sort().join("|")
        && Math.abs(Date.parse(video.publishedAt) - Date.parse(game.utcDate || game.startTime)) < 4 * 86400000;
    }).sort((a, b) => Math.abs(Date.parse(a.utcDate || a.startTime) - Date.parse(video.publishedAt)) - Math.abs(Date.parse(b.utcDate || b.startTime) - Date.parse(video.publishedAt))) : [];
    const fixture = candidates[0];
    const matchRound = relatedRound || String(fixture?.matchday || "");
    if (!matchesScheduleUnit(String(round), fixture, video.title, matchRound)) continue;
    const dateKey = getVideoDateKey(fixture?.utcDate || fixture?.startTime || uploadAnchor);
    if (month && dateKey.slice(0, 7) !== month) continue;
    const key = fixture ? `match:${fixture.gameId || fixture.id || `${pair}:${dateKey}`}` : `${pair}:${matchRound}:${dateKey}`;
    let group = groups.get(key);
    if (!group) {
      const home = fixture ? findSportsTeam(leagueId, { name: fixture.home.name }) : parsed.home;
      const away = fixture ? findSportsTeam(leagueId, { name: fixture.away.name }) : parsed.away;
      group = { key, dateKey, isMatchDate: Boolean(fixture), home, away, round: matchRound,
        homeScore: fixture?.home?.score ?? null, awayScore: fixture?.away?.score ?? null, videos: [] };
      groups.set(key, group);
    }
    group.videos.push(video);
  }
  const typeOrder = { highlight: 0, replay: 1, recommend: 2 };
  return [...groups.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).map(group => ({ ...group,
    videos: group.videos.sort((a, b) => (typeOrder[a.kind] ?? 2) - (typeOrder[b.kind] ?? 2) || b.publishedAt.localeCompare(a.publishedAt)),
  }));
}

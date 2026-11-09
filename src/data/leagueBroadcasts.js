export const BROADCAST_LIMIT = 4;

export function getBroadcastStatus(status = "") {
  const value = String(status).trim().toUpperCase().replace(/[ -]/g, "_");
  if (/^(LIVE|IN_PLAY|IN_PROGRESS|PAUSED|HALFTIME|OVERTIME|EXTRA_TIME|PENALTY_SHOOTOUT)$/.test(value)) return "live";
  if (/^(SCHEDULED|TIMED|NOT_STARTED|PRE)$/.test(value)) return "scheduled";
  return null;
}

export function selectBroadcastGames(games, now = Date.now()) {
  return [...new Map(games.map((game) => [game.gameId, game])).values()]
    .filter((game) => {
      const status = getBroadcastStatus(game.status);
      return status === "live" || (status === "scheduled" && new Date(game.utcDate || game.startTime).getTime() >= now);
    })
    .sort((first, second) => {
      const liveOrder = Number(getBroadcastStatus(second.status) === "live") - Number(getBroadcastStatus(first.status) === "live");
      return liveOrder || new Date(first.utcDate || first.startTime) - new Date(second.utcDate || second.startTime);
    })
    .slice(0, BROADCAST_LIMIT);
}

// 오늘 경기가 끝났더라도 다음 2주 안의 가까운 중계 일정을 채웁니다.
export async function loadLeagueBroadcasts({ dateKey, loadSchedule, signal, now = Date.now() }) {
  const games = [], errors = [];
  const date = new Date(`${dateKey}T00:00:00Z`);
  for (let offset = 0; offset < 14 && !signal?.aborted; offset += 1) {
    try {
      const result = await loadSchedule(date.toISOString().slice(0, 10));
      if (signal?.aborted) break;
      games.push(...result.games);
      errors.push(...(result.errors || []));
      if (selectBroadcastGames(games, now).length >= BROADCAST_LIMIT) break;
    } catch (error) {
      errors.push(error?.message || "중계 일정을 불러오지 못했습니다.");
      break;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return { games: selectBroadcastGames(games, now), loading: false, errors };
}

export function formatBroadcastDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "일정 미정";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour);
  const period = hour < 12 ? "오전" : "오후";
  return `${parts.month}.${parts.day} (${parts.weekday}) ${period} ${String(hour % 12 || 12).padStart(2, "0")}:${parts.minute}`;
}

// Round metadata and fixture cards share this in-flight request. Each caller
// keeps its own cache and cancellation cannot cancel another screen's lookup.
const pending = new Map();

export async function getFootballDataSeason(leagueId, season, { signal } = {}) {
  const path = `/football-data/competitions/${leagueId}/matches?season=${season}`;
  signal?.throwIfAborted();
  let request = pending.get(path);
  if (!request) {
    request = (async () => {
      const response = await fetch(path, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Object.assign(new Error(response.status === 429
        ? "경기 정보 조회가 잠시 제한되었습니다. 잠시 후 다시 확인해 주세요."
        : "현재 라운드와 경기 일정을 불러오지 못했습니다."), { status: response.status });
      const data = await response.json();
      if (!Array.isArray(data.matches) || (data.competition?.code && data.competition.code !== leagueId)) {
        throw new Error("현재 라운드 정보를 확인할 수 없습니다.");
      }
      return data;
    })().finally(() => pending.delete(path));
    pending.set(path, request);
  }
  const data = await request;
  signal?.throwIfAborted();
  return data;
}

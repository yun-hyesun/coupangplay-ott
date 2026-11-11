const F1_API_BASE = "/jolpica";
const F1_CACHE_MS = 12 * 60 * 60 * 1000;
const f1Cache = new Map();
const f1Pending = new Map();
const SEOUL_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getSeoulDateKey(value) {
  const parts = Object.fromEntries(
    SEOUL_DATE_FORMAT.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function fetchF1SeasonData(year, resource, limit) {
  const key = `${year}/${resource}`;
  const cached = f1Cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (f1Pending.has(key)) return f1Pending.get(key);

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        `${F1_API_BASE}/f1/${year}/${resource}.json?limit=${limit}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error(`F1 ${resource} 조회 오류: ${response.status}`);
      const data = await response.json();
      const races = data.MRData?.RaceTable?.Races;
      if (!Array.isArray(races)) throw new Error("F1 경기 응답 형식이 올바르지 않습니다.");
      f1Cache.set(key, { data, expiresAt: Date.now() + F1_CACHE_MS });
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`F1 ${resource} 조회 시간이 초과되었습니다.`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  f1Pending.set(key, request);
  try {
    return await request;
  } finally {
    f1Pending.delete(key);
  }
}

function getRaceWinner(race) {
  const winner = race.Results?.find((result) => result.position === "1") || race.Results?.[0];
  if (!winner?.Driver) return "";
  return [winner.Driver.givenName, winner.Driver.familyName].filter(Boolean).join(" ");
}

function getRaceStatus(startTime, hasResult) {
  if (hasResult) return "FINISHED";
  if (!Number.isFinite(startTime)) return "SCHEDULED";
  const now = Date.now();
  if (startTime > now) return "SCHEDULED";
  if (now - startTime < 4 * 60 * 60 * 1000) return "IN_PLAY";
  return "FINISHED";
}

export async function getF1SeasonScheduleUnits(year) {
  const data = await fetchF1SeasonData(year, "races", 100);
  return data.MRData.RaceTable.Races.map(race => {
    const instant = race.date && race.time ? Date.parse(`${race.date}T${race.time}`) : NaN;
    return { competitionCode: "f1", round: Number(race.round), matchday: Number(race.round), scheduleSegment: `${race.round}라운드`, utcDate: Number.isFinite(instant) ? new Date(instant).toISOString() : null, status: getRaceStatus(instant, false) };
  });
}

export async function getF1RacesForDate(seoulDate) {
  const year = Number(seoulDate?.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seoulDate || "") || !Number.isInteger(year)) return [];

  const [scheduleData, resultData] = await Promise.all([
    fetchF1SeasonData(year, "races", 100),
    fetchF1SeasonData(year, "results", 1000).catch(() => null),
  ]);
  const races = scheduleData.MRData.RaceTable.Races;
  const results = resultData?.MRData?.RaceTable?.Races || [];
  const resultsByRound = new Map(results.map((race) => [String(race.round), race]));

  return races.flatMap((race) => {
    if (!race.date || race.round == null) return [];
    const instant = race.time ? new Date(`${race.date}T${race.time}`).getTime() : NaN;
    const localDate = Number.isFinite(instant) ? getSeoulDateKey(instant) : race.date;
    if (localDate !== seoulDate) return [];

    const round = Number(race.round);
    const result = resultsByRound.get(String(race.round));
    const winnerName = getRaceWinner(result || {});
    const dateTime = Number.isFinite(instant) ? new Date(instant).toISOString() : null;
    const location = race.Circuit?.Location;
    const venue = [
      race.Circuit?.circuitName,
      [location?.locality, location?.country].filter(Boolean).join(", "),
    ].filter(Boolean).join(" · ");

    return [{
      gameId: `f1:${year}:${race.round}`,
      sourceProvider: "jolpica",
      sourceEventId: `${year}:${race.round}`,
      competitionCode: "f1",
      competitionName: "F1",
      raceName: race.raceName || "Grand Prix",
      round,
      matchday: round,
      stage: `${round}라운드`,
      scheduleSegment: `${round}라운드`,
      status: getRaceStatus(instant, Boolean(result?.Results?.length)),
      statusDetail: winnerName ? `우승: ${winnerName}` : "",
      winnerName,
      venue,
      utcDate: dateTime,
      startTime: dateTime,
      home: {
        id: "f1:series",
        name: "F1",
        crest: "/images/sports/icon/League_logo/F1.svg",
        score: null,
      },
      away: {
        id: `f1:${year}:${race.round}:race`,
        name: race.raceName || "Grand Prix",
        crest: "",
        score: null,
      },
    }];
  }).sort((first, second) => new Date(first.utcDate || 0) - new Date(second.utcDate || 0));
}

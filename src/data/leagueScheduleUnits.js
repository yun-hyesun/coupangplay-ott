export function getScheduleUnit(game) {
  const label = String(game.scheduleSegment || "").trim();
  const week = label.match(/^(\d+)주차$/)?.[1];
  if (week && Number(week) > 0 && Number(week) <= 100) return { value: `week:${Number(week)}`, label, kind: "week", number: Number(week) };
  const rawRound = String(game.matchday ?? game.round ?? "").trim();
  const round = label.match(/^(\d+)라운드$/)?.[1] || (/^\d+$/.test(rawRound) ? rawRound : rawRound.match(/(?:matchday|round)\s*[-:#]?\s*(\d+)/i)?.[1]);
  if (round && game.competitionCode !== "nba" && game.competitionCode !== "nfl") {
    const number = Number(round);
    if (number > 0 && number <= 100) return { value: String(number), label: `${number}라운드`, kind: "round", number };
  }
  if (label) return { value: `stage:${label}`, label, kind: "stage" };
  return null;
}

export const getScheduleUnitLabel = game => getScheduleUnit(game)?.label || "";

export function hasMatchStarted(game, now = Date.now()) {
  const start = Date.parse(game.utcDate || game.startTime);
  return Number.isFinite(start) && start <= Number(now)
    && /^(LIVE|IN_PLAY|PAUSED|EXTRA_TIME|PENALTY_SHOOTOUT|FINISHED(?:_AET|_PEN)?|AWARDED)$/i.test(game.status || "");
}

export function buildScheduleUnitOptions(matches, now = Date.now()) {
  const options = new Map();
  const started = matches.filter(game => hasMatchStarted(game, now)).sort((a, b) => Date.parse(a.utcDate || a.startTime) - Date.parse(b.utcDate || b.startTime));
  for (const game of started) {
    const unit = getScheduleUnit(game);
    if (!unit) continue;
    if (unit.number) {
      for (let number = 1; number <= unit.number; number++) {
        const value = unit.kind === "week" ? `week:${number}` : String(number);
        options.set(value, { value, label: `${number}${unit.kind === "week" ? "주차" : "라운드"}`, kind: unit.kind, number });
      }
    } else options.set(unit.value, unit);
  }
  const values = [...options.values()];
  const latest = started.map(getScheduleUnit).filter(Boolean).at(-1);
  const current = latest?.number ? values.filter(unit => unit.kind === latest.kind).sort((a, b) => b.number - a.number)[0] : latest;
  return { options: values, currentLabel: current?.label || "" };
}

export function resolveScheduleUnitState(result, fixtures, month, currentMonth, now = Date.now()) {
  if (!result?.error || result.options?.length || month !== currentMonth) return result;
  const units = buildScheduleUnitOptions(fixtures, now);
  if (!units.options.length) return result;
  return { ...result, ...units, error: "", unavailable: false,
    warning: "최신 라운드 갱신이 지연되어 조회된 경기 일정 기준으로 표시합니다.", source: "경기 일정" };
}

export function matchesScheduleUnit(value, game, title = "", parsedRound = "") {
  if (!value) return true;
  value = String(value);
  const unit = getScheduleUnit(game || {});
  if (/^\d+$/.test(value) && parsedRound) return String(parsedRound) === value;
  if (unit?.value === value) return true;
  if (/^\d+$/.test(value)) return false;
  if (value.startsWith("week:")) {
    const number = title.match(/(?:^|\D)(\d+)\s*주차/)?.[1] || title.match(/\bweek\s*(\d+)/i)?.[1];
    return number != null && Number(number) === Number(value.slice(5));
  }
  return value.startsWith("stage:") && title.replace(/\s+/g, "").includes(value.slice(6).replace(/\s+/g, ""));
}

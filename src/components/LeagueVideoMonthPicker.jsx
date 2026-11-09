import { useEffect, useRef, useState } from "react";
import { SportsCalendarDialog, SportsCalendarNavButton } from "./SportsCalendarDialog";
import { getLeagueMonthAvailability } from "../service/leagueMonthAvailabilityService";

export function LeagueVideoMonthPicker({ leagueId, value, maxMonth, onSelect, onClose }) {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const lastAttempt = useRef(0);
  const key = `${leagueId}:${year}:${attempt}`;
  const loading = result?.key !== key;
  const availability = !loading ? result : null;
  const incomplete = availability?.error || Object.values(availability?.months || {}).includes("unknown");
  const minYear = 2010;
  const maxYear = Number(maxMonth.slice(0, 4));
  useEffect(() => {
    const controller = new AbortController();
    const force = attempt > lastAttempt.current;
    lastAttempt.current = attempt;
    getLeagueMonthAvailability(leagueId, year, { signal: controller.signal, force }).then(data => {
      if (!controller.signal.aborted) setResult({ ...data, key });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, months: {}, error: true });
    });
    return () => controller.abort();
  }, [leagueId, year, attempt, key]);
  return (
    <SportsCalendarDialog label="조회할 월 선택" onClose={onClose}>
      <div className="sports-calendar__heading">
        <SportsCalendarNavButton previous label="이전 연도" disabled={year <= minYear} onClick={() => setYear(year - 1)} />
        <div className="sports-calendar__month">
          <select aria-label="영상 달력 연도" value={year} onChange={event => setYear(Number(event.target.value))}>
            {Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map(option => <option key={option} value={option}>{option}년</option>)}
          </select>
        </div>
        <SportsCalendarNavButton label="다음 연도" disabled={year >= maxYear} onClick={() => setYear(year + 1)} />
      </div>
      <p className="sports-calendar__notice" role="status">
        {loading ? "리그 경기 일정을 확인하고 있습니다." : incomplete ? "일부 월의 일정을 확인하지 못했습니다. 확인된 월만 선택할 수 있습니다." : "경기가 있는 월만 선택할 수 있습니다."}
        {!loading && incomplete && <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button>}
      </p>
      <div className="sports-calendar__grid sports-calendar__grid--months" role="group" aria-label="조회할 월" aria-busy={loading}>
        {Array.from({ length: 12 }, (_, index) => {
          const month = `${year}-${String(index + 1).padStart(2, "0")}`;
          const status = availability?.months[month];
          const outside = month < "2010-01" || month > maxMonth;
          const disabled = outside || loading || status !== "active";
          const reason = outside ? "현재 월까지 조회할 수 있습니다." : loading ? "경기 일정을 확인 중입니다." : status === "inactive" ? "경기 일정이 없는 월입니다." : "경기 일정을 확인하지 못했습니다.";
          return <button type="button" key={month} disabled={disabled} title={disabled ? reason : undefined} aria-label={`${year}년 ${index + 1}월`} aria-pressed={!disabled && month === value} aria-current={month === maxMonth ? "date" : undefined}
            onClick={() => { if (!disabled) { onSelect(month); onClose(); } }}>{index + 1}월</button>;
        })}
      </div>
    </SportsCalendarDialog>
  );
}

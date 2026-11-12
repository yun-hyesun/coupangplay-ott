import { useEffect, useRef, useState } from "react";
import { SportsCalendarDialog } from "./SportsCalendarDialog";
import { getLeagueMonthAvailability } from "../service/leagueMonthAvailabilityService";

export function LeagueVideoMonthPicker({ leagueId, value, maxMonth, onSelect, onClose }) {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const lastAttempt = useRef(0);
  const yearListRef = useRef(null);
  const monthListRef = useRef(null);
  const selectedNumber = Number(value.slice(5, 7));
  const key = `${leagueId}:${year}:${attempt}`;
  const loading = result?.key !== key;
  const availability = !loading ? result : null;
  const incomplete = availability?.error || Object.values(availability?.months || {}).includes("unknown");
  const minYear = 2010;
  const maxYear = Number(maxMonth.slice(0, 4));

  useEffect(() => {
    for (const list of [yearListRef.current, monthListRef.current]) {
      const selected = list?.querySelector('[aria-pressed="true"]');
      if (selected) list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top
        - (list.clientHeight - selected.clientHeight) / 2;
    }
  }, [year, loading, value]);

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
    <SportsCalendarDialog label="동영상 조회 연도·월 선택" onClose={onClose}>
      <div className="sports-calendar__heading">
        <div className="sports-calendar__month">
          <strong className="sports-calendar__period-label">{year}년 {selectedNumber}월</strong>
        </div>
      </div>
      <p className="sports-calendar__notice" role="status">
        {loading ? "리그 경기 일정을 확인하고 있습니다." : incomplete ? "일부 월의 일정을 확인하지 못했습니다. 확인된 월만 선택할 수 있습니다." : "경기가 있는 월만 선택할 수 있습니다."}
        {!loading && incomplete && <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 조회</button>}
      </p>
      <div className="sports-calendar__year-month-picker sports-calendar__year-month-picker--video" role="group" aria-label="동영상 조회 연도와 월">
        <div className="sports-calendar__year-month-column" role="group" aria-label="영상 달력 연도 선택" ref={yearListRef}>
          {Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map(option => <button type="button" key={option} aria-pressed={year === option} onClick={() => setYear(option)}>
            <span>{option}년</span>{year === option && <span className="sports-calendar__selection-check" aria-hidden="true" />}
          </button>)}
        </div>
        <div className="sports-calendar__year-month-column" role="group" aria-label="영상 달력 월 선택" aria-busy={loading} ref={monthListRef}>
        {Array.from({ length: 12 }, (_, index) => {
          const number = 12 - index;
          const month = `${year}-${String(number).padStart(2, "0")}`;
          const status = availability?.months[month];
          const outside = month < "2010-01" || month > maxMonth;
          const disabled = outside || loading || status !== "active";
          const reason = outside ? "현재 월까지 조회할 수 있습니다." : loading ? "경기 일정을 확인 중입니다." : status === "inactive" ? "경기 일정이 없는 월입니다." : "경기 일정을 확인하지 못했습니다.";
          const selected = !disabled && number === selectedNumber;
          return <button type="button" key={month} disabled={disabled} title={disabled ? reason : undefined} aria-label={`${year}년 ${number}월`} aria-pressed={selected} aria-current={month === maxMonth ? "date" : undefined}
            onClick={() => { if (!disabled) { onSelect(month); onClose(); } }}>
            <span>{number}월</span>{selected && <span className="sports-calendar__selection-check" aria-hidden="true" />}
          </button>;
        })}
        </div>
      </div>
    </SportsCalendarDialog>
  );
}

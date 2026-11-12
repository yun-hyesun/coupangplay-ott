import { useEffect, useRef } from "react";

export function SportsCalendarYearMonthPicker({ id, year, month, minYear, maxYear, onYearChange, onMonthChange }) {
  const yearListRef = useRef(null);
  const monthListRef = useRef(null);

  useEffect(() => {
    for (const list of [yearListRef.current, monthListRef.current]) {
      const selected = list?.querySelector('[aria-pressed="true"]');
      if (selected) list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top
        - (list.clientHeight - selected.clientHeight) / 2;
    }
  }, []);

  return (
    <div className="sports-calendar__year-month-picker" id={id} role="group" aria-label="연도와 월 목록">
      <div className="sports-calendar__year-month-column" role="group" aria-label="연도 선택" ref={yearListRef}>
        {Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map(value => (
          <button type="button" key={value} aria-pressed={year === value} onClick={() => onYearChange(value)}>
            <span>{value}년</span>{year === value && <span className="sports-calendar__selection-check" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="sports-calendar__year-month-column" role="group" aria-label="월 선택" ref={monthListRef}>
        {Array.from({ length: 12 }, (_, index) => 12 - index).map(value => (
          <button type="button" key={value} aria-pressed={month === value} onClick={() => onMonthChange(value)}>
            <span>{value}월</span>{month === value && <span className="sports-calendar__selection-check" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}

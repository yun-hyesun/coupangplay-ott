import { useEffect, useId, useRef, useState } from "react";
import { SportsCalendarDialog, SportsCalendarNavButton } from "../../../components/SportsCalendarDialog";
import { SportsCalendarYearMonthPicker } from "../../../components/SportsCalendarYearMonthPicker";
import { getCalendarDays, getScheduleBrowseRange, isScheduleDateInRange } from "../../../data/leagueScheduleView";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function SportsScheduleCalendar({ date, today, onSelect, onClose }) {
  const range = getScheduleBrowseRange(today);
  const minMonth = range.from.slice(0, 7);
  const maxMonth = range.to.slice(0, 7);
  const [selectedMonth, setMonth] = useState(() => date.slice(0, 7));
  const month = selectedMonth < minMonth ? minMonth : selectedMonth > maxMonth ? maxMonth : selectedMonth;
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(month);
  const monthPickerId = useId();
  const selectedDayRef = useRef(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const [draftYear, draftNumber] = draftMonth.split("-").map(Number);
  const firstYear = Number(range.from.slice(0, 4));
  const lastYear = Number(range.to.slice(0, 4));
  const days = getCalendarDays(month);

  useEffect(() => {
    selectedDayRef.current?.focus({ preventScroll: true });
  }, []);

  const selectDate = (day) => {
    if (!isScheduleDateInRange(day, range)) return;
    onSelect(day);
    onClose();
  };
  const selectMonth = (value) => {
    if (value >= minMonth && value <= maxMonth) setMonth(value);
  };
  const toggleMonthPicker = () => {
    if (monthPickerOpen) selectMonth(draftMonth);
    else setDraftMonth(month);
    setMonthPickerOpen(value => !value);
  };
  const chooseMonth = (value) => {
    selectMonth(`${draftYear}-${String(value).padStart(2, "0")}`);
    setMonthPickerOpen(false);
  };
  const shiftMonth = (amount) => {
    selectMonth(new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7));
  };

  return (
    <SportsCalendarDialog label="오늘의 경기 일정 날짜 선택" onClose={onClose}>
      <div className="sports-calendar__heading">
        {monthPickerOpen ? <span className="sports-calendar__nav" aria-hidden="true" /> : <SportsCalendarNavButton previous label="달력 이전 달" disabled={month <= minMonth} onClick={() => shiftMonth(-1)} />}
        <div className="sports-calendar__month sports-calendar__month--date">
          <button type="button" className="sports-calendar__year-month-toggle" aria-label="연도와 월 선택" aria-expanded={monthPickerOpen} aria-controls={monthPickerId} onClick={toggleMonthPicker}>
            <span>{monthPickerOpen ? draftYear : year}년 {monthPickerOpen ? draftNumber : monthNumber}월</span>
            <span className="sports-calendar__year-month-chevron" aria-hidden="true" />
          </button>
        </div>
        {monthPickerOpen ? <span className="sports-calendar__nav" aria-hidden="true" /> : <SportsCalendarNavButton label="달력 다음 달" disabled={month >= maxMonth} onClick={() => shiftMonth(1)} />}
      </div>
      {monthPickerOpen ? (
        <SportsCalendarYearMonthPicker
          id={monthPickerId}
          year={draftYear}
          month={draftNumber}
          minYear={firstYear}
          maxYear={lastYear}
          onYearChange={value => setDraftMonth(`${value}-${String(draftNumber).padStart(2, "0")}`)}
          onMonthChange={chooseMonth}
        />
      ) : <>
      <p className="sports-calendar__notice">
        날짜를 선택하면 해당 날짜의 경기 일정을 볼 수 있습니다.
        <button type="button" onClick={() => selectDate(today)}>오늘</button>
      </p>
      <div className="sports-calendar__grid" role="group" aria-label={`${year}년 ${monthNumber}월 날짜 선택`}>
        {WEEKDAYS.map((day) => <span className="sports-calendar__weekday" key={day}>{day}</span>)}
        {days.map((day) => (
          <button
            type="button"
            key={day}
            ref={day === date ? selectedDayRef : null}
            disabled={!isScheduleDateInRange(day, range)}
            aria-label={`${day} ${isScheduleDateInRange(day, range) ? "경기 일정 선택" : "선택 불가"}`}
            aria-pressed={day === date}
            aria-current={day === today ? "date" : undefined}
            className={day.slice(0, 7) !== month ? "is-outside" : undefined}
            onClick={() => selectDate(day)}
          >
            {Number(day.slice(-2))}
          </button>
        ))}
      </div>
      </>}
    </SportsCalendarDialog>
  );
}

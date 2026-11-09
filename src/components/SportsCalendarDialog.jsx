import { useEffect, useId, useRef } from "react";
import "./scss/SportsCalendarDialog.scss";

const ASSETS = "/images/sports/league-detail/schedule/";

export function SportsCalendarDialog({ label, onClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => { dialog.current.showModal(); }, []);
  return (
    <dialog className="sports-calendar" ref={dialog} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <h2 className="sports-calendar__sr-only" id={titleId}>{label}</h2>
      {children}
      <button className="sports-calendar__close" type="button" onClick={onClose}>닫기</button>
    </dialog>
  );
}

export function SportsCalendarNavButton({ previous = false, label, disabled, onClick }) {
  return (
    <button className="sports-calendar__nav" type="button" aria-label={label} disabled={disabled} onClick={onClick}>
      {previous ? <span className="sports-calendar__previous" aria-hidden="true"><img src={ASSETS + "previous.svg"} alt="" /></span>
        : <img src={ASSETS + "next.svg"} alt="" aria-hidden="true" />}
    </button>
  );
}

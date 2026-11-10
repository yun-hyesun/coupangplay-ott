import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { SPORTS_LEAGUES } from "../data/sportsLeagues";
import "./scss/LeagueShortcutPopup.scss";

const CATEGORIES = ["전체", "축구", "농구", "레이싱", "일반"];

export function LeagueShortcutPopup({ id, currentLeagueId, activeTab, triggerRef, onClose }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [category, setCategory] = useState("전체");
  const leagues = SPORTS_LEAGUES.filter((league) => category === "전체" || league.sport === category);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return undefined;

    const positionPanel = () => {
      const anchor = trigger.getBoundingClientRect();
      const width = Math.min(640, window.innerWidth - 32);
      const roomBelow = window.innerHeight - anchor.bottom - 28;
      const top = roomBelow >= 280 ? anchor.bottom + 12 : 16;
      const height = Math.min(580, window.innerHeight - top - 16);
      panel.style.width = `${width}px`;
      panel.style.height = `${height}px`;
      panel.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - width - 16))}px`;
      panel.style.top = `${top}px`;
    };
    const closeOutside = (event) => {
      if (!panel.contains(event.target) && !trigger.contains(event.target)) onClose();
    };
    const closeOnPageScroll = (event) => {
      if (!panel.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (event.key === "Tab") {
        const buttons = [...panel.querySelectorAll("button:not([disabled])")];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    positionPanel();
    panel.querySelector("button")?.focus({ preventScroll: true });
    window.addEventListener("resize", positionPanel);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeOnPageScroll, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeOnPageScroll, true);
      trigger.focus({ preventScroll: true });
    };
  }, [onClose, triggerRef]);

  const selectLeague = (leagueId) => {
    onClose();
    if (leagueId === currentLeagueId) return;
    navigate(`/sports/league/${leagueId}`, { state: { leagueTab: activeTab } });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return createPortal(
    <section
      ref={panelRef}
      id={id}
      className="league-shortcut"
      role="dialog"
      aria-labelledby={`${id}-title`}
    >
      <div className="league-shortcut__header">
        <h2 id={`${id}-title`}>리그 선택</h2>
        <button type="button" className="league-shortcut__close" aria-label="리그 선택 닫기" onClick={onClose}>
          <img src="/images/sports/league-detail/shortcut-close.svg" alt="" aria-hidden="true" />
        </button>
      </div>
      <div className="league-shortcut__filters" role="group" aria-label="리그 종목">
        {CATEGORIES.map((name) => (
          <button
            type="button"
            key={name}
            className={category === name ? "is-selected" : ""}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >{name}</button>
        ))}
      </div>
      <p className="league-shortcut__count" aria-live="polite">
        <span>{category} 리그</span><span>{leagues.length}</span>
      </p>
      <div className="league-shortcut__list">
        {leagues.length ? (
          <ul>
            {leagues.map((league) => (
              <li key={league.id}>
                <button
                  type="button"
                  className={`league-shortcut__item${league.id === currentLeagueId ? " is-current" : ""}`}
                  aria-current={league.id === currentLeagueId ? "true" : undefined}
                  onClick={() => selectLeague(league.id)}
                >
                  <span className="league-shortcut__logo">
                    {league.logoPath ? <img src={league.logoPath} alt="" loading="lazy" /> : league.shortName || league.name}
                  </span>
                  <span className="league-shortcut__name">{league.name}</span>
                  {league.id === currentLeagueId && <span className="league-shortcut__current">현재</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="league-shortcut__empty">표시할 리그가 없습니다.</p>}
      </div>
    </section>,
    document.body,
  );
}

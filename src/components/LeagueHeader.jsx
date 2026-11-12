import { useCallback, useId, useRef, useState } from "react";
import { LeagueShortcutPopup } from "./LeagueShortcutPopup";
import { TeamImage } from "./LeagueDetailShared";

const LEAGUE_TABS = [
  ["home", "홈", null],
  ["videos", "동영상", "league-detail-popular-title"],
  ["schedule", "경기 일정", "league-detail-schedule-title"],
  ["standings", "순위", "league-detail-standings-title"],
];

const SPORT_ICON_PATHS = {
  축구: "/images/icon/DesignSystem_Icon08/icon-sport_football.svg",
  농구: "/images/icon/DesignSystem_Icon08/icon-sport_basketball.svg",
  레이싱: "/images/icon/DesignSystem_Icon08/icon-sport_racing.svg",
  골프: "/images/icon/DesignSystem_Icon08/icon-sport_golf.svg",
  일반: "/images/icon/DesignSystem_Icon08/icon-sport_american_football.svg",
};
const LEAGUE_ICON_PATHS = {
  "tour-de-france": "/images/icon/DesignSystem_Icon08/icon-sport_racing.svg",
};

export function LeagueHeader({ league, scoresOn, onToggleScores, showScoreToggle = true, activeTab, onTabChange, isMyLeague, selectedLeagueCount = 0, selectedTeams = [], onToggleMyLeague, onOpenTeamSettings }) {
  const [isLeagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const leagueMenuTriggerRef = useRef(null);
  const leagueMenuId = useId();
  const closeLeagueMenu = useCallback(() => setLeagueMenuOpen(false), []);
  const logoPath = league.whiteLogoPath || league.logoPath;
  const sportIconPath = LEAGUE_ICON_PATHS[league.id] || SPORT_ICON_PATHS[league.sport] || SPORT_ICON_PATHS.축구;
  const selectedTeam = selectedTeams[0];
  const teamCountLabel = selectedTeams.length >= 9 ? "9+" : String(selectedTeams.length);
  const leagueCountLabel = selectedLeagueCount >= 9 ? "9+" : String(selectedLeagueCount);

  return (
    <section className="league-detail__hero" aria-label={league.name + " 리그 정보"}>
      <div className="league-detail__hero-inner">
        <div className="league-detail__hero-info">
          <div className="league-detail__league-mark-wrap">
            {logoPath ? (
              <img
                className="league-detail__league-mark"
                src={logoPath}
                alt={league.name + " 로고"}
                onError={(event) => {
                  if (league.logoPath && event.currentTarget.dataset.fallback !== "true" && logoPath !== league.logoPath) {
                    event.currentTarget.dataset.fallback = "true";
                    event.currentTarget.src = league.logoPath;
                  } else {
                    event.currentTarget.hidden = true;
                  }
                }}
              />
            ) : (
              <span className="league-detail__league-fallback">{league.shortName || league.name}</span>
            )}
          </div>
          <div className="league-detail__league-copy">
            <h1 className="league-detail__league-select-heading">
              <button
                ref={leagueMenuTriggerRef}
                type="button"
                className="league-detail__league-select"
                title="다른 리그 선택"
                aria-label={`${league.name}, 다른 리그 선택`}
                aria-haspopup="dialog"
                aria-expanded={isLeagueMenuOpen}
                aria-controls={isLeagueMenuOpen ? leagueMenuId : undefined}
                onClick={() => setLeagueMenuOpen((open) => !open)}
              >
                <span className="league-detail__league-name">{league.name}</span>
                <span className="league-detail__league-arrow" aria-hidden="true">
                  <img src="/images/sports/league-detail/shortcut-arrow.svg" alt="" />
                </span>
              </button>
            </h1>
            {showScoreToggle && <button
              type="button"
              className={"league-detail__score-toggle" + (scoresOn ? " is-on" : "")}
              aria-pressed={scoresOn}
              onClick={onToggleScores}
            >점수 {scoresOn ? "ON" : "OFF"}</button>}
          </div>
        </div>
        <div className="league-detail__hero-actions">
          <button
            type="button"
            className={isMyLeague ? "is-selected" : ""}
            aria-pressed={isMyLeague}
            aria-label={isMyLeague ? `마이 리그, 등록된 리그 ${selectedLeagueCount}개` : "마이 리그"}
            onClick={onToggleMyLeague}
          >
            <span className="league-detail__action-content" aria-hidden="true">
              <span className="league-detail__action-label"><span>마이 리그</span></span>
              <span className={"league-detail__action-symbol" + (isMyLeague ? " league-detail__action-symbol--check" : "")}>
                {isMyLeague ? <span className="league-detail__action-check" /> : <>
                  <span className="league-detail__action-plus">＋</span>
                  <img className="league-detail__compact-plus" src="/images/sports/league-detail/detail-plus.svg" alt="" />
                </>}
              </span>
            </span>
            {isMyLeague && selectedLeagueCount > 0 && <span className="league-detail__count-badge" aria-hidden="true">{leagueCountLabel}</span>}
          </button>
          <button
            type="button"
            className={selectedTeam ? "has-selected-team" : ""}
            onClick={onOpenTeamSettings}
            aria-haspopup="dialog"
            aria-label={selectedTeams.length ? `마이 팀 설정, 선택된 팀 ${selectedTeams.length}개` : "마이 팀 설정"}
          >
            <span className="league-detail__action-content" aria-hidden="true">
              <span className="league-detail__action-label"><span>마이 팀</span></span>
              <span className={"league-detail__action-symbol" + (selectedTeam ? " league-detail__action-symbol--team" : " league-detail__action-symbol--sport")}>
                {selectedTeam
                  ? <TeamImage className="league-detail__selected-team-logo" team={selectedTeam} leagueId={league.id} />
                  : <>
                    <span className="league-detail__action-chevron" />
                    <img className="league-detail__action-team-icon" src={sportIconPath} alt="" />
                  </>}
              </span>
            </span>
            {selectedTeam && <span className="league-detail__count-badge" aria-hidden="true">{teamCountLabel}</span>}
          </button>
        </div>
      </div>
      <nav className="league-detail__tabs" aria-label="리그 상세 메뉴">
        {LEAGUE_TABS.map(([tabId, label, targetId]) => (
          <button
            type="button"
            key={tabId}
            className={activeTab === tabId ? "is-active" : ""}
            aria-current={activeTab === tabId ? "page" : undefined}
            onClick={() => onTabChange(tabId, targetId)}
          >{label}</button>
        ))}
      </nav>
      {isLeagueMenuOpen && <LeagueShortcutPopup
        id={leagueMenuId}
        currentLeagueId={league.id}
        activeTab={activeTab}
        triggerRef={leagueMenuTriggerRef}
        onClose={closeLeagueMenu}
      />}
    </section>
  );
}

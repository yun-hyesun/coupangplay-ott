import { Link } from "react-router-dom";

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

export function LeagueHeader({ league, scoresOn, onToggleScores, activeTab, onTabChange, isMyLeague, selectedLeagueCount = 0, selectedTeams = [], onToggleMyLeague, onOpenTeamSettings, isCompact }) {
  const logoPath = league.whiteLogoPath || league.logoPath;
  const sportIconPath = LEAGUE_ICON_PATHS[league.id] || SPORT_ICON_PATHS[league.sport] || SPORT_ICON_PATHS.축구;
  const selectedTeam = selectedTeams[0];
  const teamCountLabel = selectedTeams.length >= 9 ? "9+" : String(selectedTeams.length);
  const leagueCountLabel = selectedLeagueCount >= 9 ? "9+" : String(selectedLeagueCount);

  return (
    <section className={"league-detail__hero" + (isCompact ? " is-compact" : "")} aria-label={league.name + " 리그 정보"}>
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
            <Link className="league-detail__league-select" to="/sports" aria-label="스포츠 리그 목록으로 이동">
              <h1>{league.name}</h1>
              <img src="/images/sports/icon/sports-accordion-arrow.svg" alt="" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={"league-detail__score-toggle" + (scoresOn ? " is-on" : "")}
              aria-pressed={scoresOn}
              onClick={onToggleScores}
            >점수 {scoresOn ? "ON" : "OFF"}</button>
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
            <span className="league-detail__action-label">마이 리그</span>
            {isMyLeague ? (
              <>
                <span className="league-detail__action-check" aria-hidden="true" />
                {selectedLeagueCount > 0 && <span className="league-detail__count-badge" aria-hidden="true">{leagueCountLabel}</span>}
              </>
            ) : (
              <span className="league-detail__action-plus" aria-hidden="true">＋</span>
            )}
            {!isMyLeague && (
              <img className="league-detail__compact-plus" src="/images/sports/league-detail/detail-plus.svg" alt="" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className={selectedTeam ? "has-selected-team" : ""}
            onClick={onOpenTeamSettings}
            aria-haspopup="dialog"
            aria-label={selectedTeams.length ? `마이 팀 설정, 선택된 팀 ${selectedTeams.length}개` : "마이 팀 설정"}
          >
            <span className="league-detail__action-label">마이 팀</span>
            {!selectedTeam && <span className="league-detail__action-chevron" aria-hidden="true" />}
            {selectedTeam ? (
              <>
                <img className="league-detail__selected-team-logo" src={selectedTeam.logoPath || sportIconPath} alt="" aria-hidden="true" />
                <span className="league-detail__count-badge" aria-hidden="true">{teamCountLabel}</span>
              </>
            ) : (
              <img className="league-detail__action-team-icon" src={sportIconPath} alt="" aria-hidden="true" />
            )}
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
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { SPORTS_LEAGUES } from "../../../data/sportsLeagues";
import { mergeSportsTeamDetails } from "../../../data/sportsTeams";
import { getFootballTeams } from "../../../service/sportsService";

const MAX_SUBSCRIPTIONS = 10;
const SPORTS_SETTINGS_CATEGORIES = [
  "추천",
  "축구",
  ...new Set(SPORTS_LEAGUES.map((league) => league.sport).filter((sport) => sport !== "축구")),
];

function getLeaguesForCategory(category, includedLeagueId = "") {
  if (category === "추천") {
    const recommendedLeagues = SPORTS_LEAGUES.filter((league) => league.featured);
    const includedLeague = SPORTS_LEAGUES.find((league) => league.id === includedLeagueId);
    return includedLeague && !recommendedLeagues.some((league) => league.id === includedLeague.id)
      ? [...recommendedLeagues, includedLeague]
      : recommendedLeagues;
  }

  if (category === "축구") {
    return SPORTS_LEAGUES.filter((league) => league.sport === "축구");
  }

  if (category === "기타") {
    return SPORTS_LEAGUES.filter((league) => league.sport === "일반");
  }

  return SPORTS_LEAGUES.filter((league) => league.sport === category);
}

function getLeagueAbbreviation(league) {
  return league.shortName || league.id.toUpperCase().replace("KLEAGUE-", "K");
}

function LeagueImage({ league }) {
  return (
    <span className="sports-settings-league-logo" aria-hidden="true">
      {league.logoPath ? (
        <img src={league.logoPath} alt="" loading="lazy" />
      ) : (
        <span>{getLeagueAbbreviation(league)}</span>
      )}
    </span>
  );
}

function TeamImage({ team }) {
  const imageSource = team.logoPath || team.crest;
  const [failedImageSource, setFailedImageSource] = useState("");
  const hasImage = Boolean(imageSource && imageSource !== failedImageSource);

  return (
    <span
      className={"sports-settings-team-logo" + (hasImage ? " sports-settings-team-logo--image" : "")}
      aria-hidden="true"
    >
      {hasImage ? (
        <img
          src={imageSource}
          alt=""
          loading="lazy"
          onError={() => setFailedImageSource(imageSource)}
        />
      ) : (
        <span>{team.name.slice(0, 1)}</span>
      )}
    </span>
  );
}

function reorderIds(ids, draggedId, targetId) {
  if (!draggedId || draggedId === targetId) return ids;
  const next = [...ids];
  const fromIndex = next.indexOf(draggedId);
  const toIndex = next.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return ids;
  next.splice(toIndex, 0, next.splice(fromIndex, 1)[0]);
  return next;
}

export function SportsSettingsModal({
  isOpen,
  onClose,
  initialTab = "leagues",
  initialCategory = "추천",
  initialExpandedLeagueId = "",
  title = "전체보기",
  selectedLeagueIds,
  onToggleLeague,
  onReorderLeagues,
  selectedTeamIds,
  onToggleTeam,
  onReorderTeams,
}) {
  const [activeTab, setActiveTab] = useState("leagues");
  const [activeCategory, setActiveCategory] = useState("추천");
  const [expandedLeagueIds, setExpandedLeagueIds] = useState([]);
  const [notice, setNotice] = useState("");
  const [draggedLeagueId, setDraggedLeagueId] = useState("");
  const [draggedTeamId, setDraggedTeamId] = useState("");
  const requestedLeagueIdsRef = useRef(new Set());
  const [remoteTeamsByLeague, setRemoteTeamsByLeague] = useState({});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setActiveCategory(initialCategory);
    setExpandedLeagueIds(initialExpandedLeagueId ? [initialExpandedLeagueId] : []);
    setNotice("");
  }, [isOpen, initialTab, initialCategory, initialExpandedLeagueId]);

  useEffect(() => {
    if (!isOpen || activeTab !== "teams") return;
    const leagueIds = new Set([
      ...expandedLeagueIds,
      ...selectedTeamIds.map((teamId) => teamId.split(":")[0]),
    ]);
    for (const leagueId of leagueIds) {
      const league = SPORTS_LEAGUES.find((item) => item.id === leagueId);
      if (!league?.espnPath?.startsWith("soccer/") || requestedLeagueIdsRef.current.has(leagueId)) continue;
      requestedLeagueIdsRef.current.add(leagueId);
      getFootballTeams(leagueId)
        .then((teams) => {
          setRemoteTeamsByLeague((current) => ({ ...current, [leagueId]: teams }));
        })
        .catch(() => {
          // API 사용 권한·일시 장애와 무관하게 제공된 명단은 계속 표시합니다.
          requestedLeagueIdsRef.current.delete(leagueId);
        });
    }
  }, [isOpen, activeTab, expandedLeagueIds, selectedTeamIds]);

  const visibleLeagues = useMemo(
    () => getLeaguesForCategory(activeCategory, initialExpandedLeagueId),
    [activeCategory, initialExpandedLeagueId],
  );

  const teamsByLeague = useMemo(
    () => Object.fromEntries(
      SPORTS_LEAGUES.map((league) => [
        league.id,
        mergeSportsTeamDetails(league.id, remoteTeamsByLeague[league.id]),
      ]),
    ),
    [remoteTeamsByLeague],
  );

  const teamDirectory = useMemo(
    () => Object.values(teamsByLeague)
        .flat()
        .reduce((directory, team) => {
          directory[team.id] = team;
          return directory;
        }, {}),
    [teamsByLeague],
  );

  const subscribedTeams = selectedTeamIds
    .map((teamId) => teamDirectory[teamId])
    .filter(Boolean);

  if (!isOpen) return null;

  const toggleLeague = (league) => {
    const isSelected = selectedLeagueIds.includes(league.id);
    if (!isSelected && selectedLeagueIds.length >= MAX_SUBSCRIPTIONS) {
      setNotice("리그는 최대 10개까지 구독할 수 있습니다.");
      return;
    }
    setNotice("");
    onToggleLeague(league);
  };

  const toggleTeam = (team) => {
    const isSelected = selectedTeamIds.includes(team.id);
    if (!isSelected && selectedTeamIds.length >= MAX_SUBSCRIPTIONS) {
      setNotice("팀은 최대 10개까지 구독할 수 있습니다.");
      return;
    }
    setNotice("");
    onToggleTeam(team.id);
  };

  const handleBackdropMouseDown = (event) => {
    if (event.currentTarget === event.target) onClose?.();
  };

  const toggleExpandedLeague = (leagueId) => {
    setExpandedLeagueIds((current) =>
      current.includes(leagueId)
        ? current.filter((id) => id !== leagueId)
        : [...current, leagueId],
    );
  };

  return (
    <div
      className="sports-settings-backdrop"
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        className="sports-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sports-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sports-settings-modal__header">
          <h2 id="sports-settings-title">{title}</h2>
          <button
            type="button"
            className="sports-settings-modal__close"
            aria-label="설정 창 닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="sports-settings-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            id="sports-settings-tab-leagues"
            aria-selected={activeTab === "leagues"}
            aria-controls="sports-settings-panel-leagues"
            className={activeTab === "leagues" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("leagues");
              setNotice("");
            }}
          >
            마이 리그 <span>{selectedLeagueIds.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="sports-settings-tab-teams"
            aria-selected={activeTab === "teams"}
            aria-controls="sports-settings-panel-teams"
            className={activeTab === "teams" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("teams");
              setNotice("");
            }}
          >
            마이 팀 <span>{selectedTeamIds.length}</span>
          </button>
        </div>

        {activeTab === "leagues" ? (
          <div
            className="sports-settings-panel"
            id="sports-settings-panel-leagues"
            role="tabpanel"
            aria-labelledby="sports-settings-tab-leagues"
          >
            <section className="sports-settings-subscribed">
              <p className="sports-settings-subscribed__description">
                최대 10 리그까지 가능하며, 선호도에 따라 순서를 변경해 보세요.
              </p>
              <div className="sports-settings-subscribed__list">
                {selectedLeagueIds.length === 0 ? (
                  <p className="sports-settings-empty">
                    구독 중인 리그가 없습니다. 아래에서 리그를 추가해 주세요.
                  </p>
                ) : (
                  selectedLeagueIds
                    .map((leagueId) =>
                      SPORTS_LEAGUES.find((league) => league.id === leagueId),
                    )
                    .filter(Boolean)
                    .map((league, index) => (
                      <div
                        className="sports-settings-subscribed-row"
                        key={league.id}
                        draggable
                        onDragStart={() => setDraggedLeagueId(league.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() =>
                          onReorderLeagues(
                            reorderIds(selectedLeagueIds, draggedLeagueId, league.id),
                          )
                        }
                        onDragEnd={() => setDraggedLeagueId("")}
                      >
                        <span className="sports-settings-subscribed-row__index">
                          {index + 1}
                        </span>
                        <LeagueImage league={league} />
                        <span className="sports-settings-subscribed-row__name">
                          {league.name}
                        </span>
                        <button
                          type="button"
                          className="sports-settings-remove"
                          aria-label={league.name + " 구독 해제"}
                          onClick={() => toggleLeague(league)}
                        >
                          ×
                        </button>
                        <span
                          className="sports-settings-drag-handle"
                          aria-label="드래그해 순서 변경"
                          title="드래그해 순서 변경"
                        >
                          ⠿
                        </span>
                      </div>
                    ))
                )}
              </div>
            </section>

            <div className="sports-settings-divider" />

            <section className="sports-settings-browser">
              <div className="sports-settings-categories" role="group" aria-label="리그 종목 필터">
                {SPORTS_SETTINGS_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={activeCategory === category ? "is-active" : ""}
                    aria-pressed={activeCategory === category}
                    onClick={() => {
                      setActiveCategory(category);
                      setNotice("");
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="sports-settings-list" role="list">
                {visibleLeagues.map((league) => {
                  const selected = selectedLeagueIds.includes(league.id);
                  return (
                    <div className="sports-settings-league-row" role="listitem" key={league.id}>
                      <LeagueImage league={league} />
                      <span className="sports-settings-league-row__name">
                        {league.name}
                      </span>
                      {activeCategory !== "추천" && league.featured && (
                        <span className="sports-settings-recommended-badge">추천</span>
                      )}
                      <button
                        type="button"
                        className={
                          "sports-settings-select" + (selected ? " is-selected" : "")
                        }
                        aria-label={league.name + (selected ? " 구독 해제" : " 구독")}
                        aria-pressed={selected}
                        onClick={() => toggleLeague(league)}
                      >
                        {selected ? "✓" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div
            className="sports-settings-panel"
            id="sports-settings-panel-teams"
            role="tabpanel"
            aria-labelledby="sports-settings-tab-teams"
          >
            <section className="sports-settings-subscribed sports-settings-subscribed--teams">
              <p className="sports-settings-subscribed__description">
                최대 10 팀까지 구독할 수 있습니다. 선호하는 팀을 선택해 보세요.
              </p>
              <div className="sports-settings-subscribed__list">
                {subscribedTeams.length === 0 ? (
                  <p className="sports-settings-empty">
                    구독 중인 팀이 없습니다. 아래에서 리그를 펼쳐 팀을 선택해 주세요.
                  </p>
                ) : (
                  subscribedTeams.map((team, index) => {
                    const leagueId = team.id.split(":")[0];
                    const league = SPORTS_LEAGUES.find((item) => item.id === leagueId);
                    return (
                      <div
                        className="sports-settings-subscribed-row sports-settings-subscribed-row--team"
                        key={team.id}
                        draggable
                        onDragStart={() => setDraggedTeamId(team.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() =>
                          onReorderTeams(
                            reorderIds(selectedTeamIds, draggedTeamId, team.id),
                          )
                        }
                        onDragEnd={() => setDraggedTeamId("")}
                      >
                        <span className="sports-settings-subscribed-row__index">
                          {index + 1}
                        </span>
                        <TeamImage team={team} />
                        <span className="sports-settings-subscribed-row__team-copy">
                          <strong>{team.name}</strong>
                          <small>{league?.name || "스포츠"}</small>
                        </span>
                        <button
                          type="button"
                          className="sports-settings-remove"
                          aria-label={team.name + " 구독 해제"}
                          onClick={() => toggleTeam(team)}
                        >
                          ×
                        </button>
                        <span
                          className="sports-settings-drag-handle"
                          aria-label="드래그해 순서 변경"
                          title="드래그해 순서 변경"
                        >
                          ⠿
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="sports-settings-divider" />

            <section className="sports-settings-browser sports-settings-browser--teams">
              <div className="sports-settings-categories" role="group" aria-label="팀 리그 종목 필터">
                {SPORTS_SETTINGS_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={activeCategory === category ? "is-active" : ""}
                    aria-pressed={activeCategory === category}
                    onClick={() => {
                      setActiveCategory(category);
                      setExpandedLeagueIds(initialExpandedLeagueId ? [initialExpandedLeagueId] : []);
                      setNotice("");
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="sports-settings-list sports-settings-list--teams">
                {visibleLeagues.map((league) => {
                  const expanded = expandedLeagueIds.includes(league.id);
                  const teams = teamsByLeague[league.id] || [];
                  return (
                    <div
                      className={
                        "sports-settings-team-league" + (expanded ? " is-expanded" : "")
                      }
                      key={league.id}
                    >
                      <button
                        type="button"
                        className="sports-settings-team-league__trigger"
                        aria-expanded={expanded}
                        onClick={() => toggleExpandedLeague(league.id)}
                      >
                        <LeagueImage league={league} />
                        <span className="sports-settings-team-league__name">
                          {league.name}
                        </span>
                        {activeCategory !== "추천" && league.featured && (
                          <span className="sports-settings-recommended-badge">추천</span>
                        )}
                        <span
                          className={
                            "sports-settings-chevron" +
                            (expanded ? " is-expanded" : "")
                          }
                          aria-hidden="true"
                        >
                          <img
                            src="/images/sports/icon/sports-accordion-arrow.svg"
                            alt=""
                          />
                        </span>
                      </button>
                      {expanded && (
                        teams.length > 0 ? (
                          <div className="sports-settings-teams-list">
                            {teams.map((team) => {
                              const selected = selectedTeamIds.includes(team.id);
                              return (
                                <div className="sports-settings-team-row" key={team.id}>
                                  <TeamImage team={team} />
                                  <span>{team.name}</span>
                                  <button
                                    type="button"
                                    className={
                                      "sports-settings-select" +
                                      (selected ? " is-selected" : "")
                                    }
                                    aria-label={team.name + (selected ? " 구독 해제" : " 구독")}
                                    aria-pressed={selected}
                                    onClick={() => toggleTeam(team)}
                                  >
                                    {selected ? "✓" : "+"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="sports-settings-team-empty">
                            해당 대회에는 선택할 팀이 없습니다.
                          </p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <p className="sports-settings-notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>
    </div>
  );
}

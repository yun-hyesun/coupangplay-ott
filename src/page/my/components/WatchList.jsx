
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/useAuthStore'
import { useWatchlistStore } from '../../../store/useWatchlistStore'
import { useProfileStore } from '../../../store/useProfileStore'
import { SPORTS_LEAGUE_BY_ID } from '../../../data/sportsLeagues'
import { findSportsTeam } from '../../../data/sportsTeams'
import { formatBroadcastDate } from '../../../data/leagueBroadcasts'
import '../scss/WatchList.scss'

const MATCH_BACKGROUNDS = {
  축구: "/images/sports/league-detail/detail-matchup-bg.png",
  농구: "/images/sports/league-detail/broadcast-basketball-bg.png",
  레이싱: "/images/sports/league-detail/broadcast-racing-flag-bg.png",
  일반: "/images/sports/league-detail/broadcast-rugby-bg.png",
};

function getSportsWatchlistArtwork(item) {
  const league = SPORTS_LEAGUE_BY_ID[item.leagueId];
  const sport = league?.sport || item.sport || "축구";
  const homeTeam = findSportsTeam(item.leagueId, { id: item.homeTeamId, name: item.homeName });
  const awayTeam = findSportsTeam(item.leagueId, { id: item.awayTeamId, name: item.awayName });
  return {
    background: MATCH_BACKGROUNDS[sport] || MATCH_BACKGROUNDS.축구,
    thumbnail: item.thumbnail || "",
    homeLogo: homeTeam?.logoPath || item.homeLogo || "",
    awayLogo: awayTeam?.logoPath || item.awayLogo || "",
    leagueLogo: league?.logoPath || "",
    isRace: sport === "레이싱" || Boolean(item.raceName),
  };
}

function formatSportsWatchlistDate(value) {
  return value && Number.isFinite(Date.parse(value)) ? formatBroadcastDate(value) : "일정 미정";
}

function getWatchlistNavigation(item) {
  if (item.media_type !== "sports") {
    return { to: `/detail/${item.media_type === "movie" ? "movie" : "tv"}/${item.id}` };
  }
  if (!SPORTS_LEAGUE_BY_ID[item.leagueId]) return { to: "/sports" };
  const prefix = `${item.leagueId}_`;
  const savedId = String(item.id);
  return {
    to: `/sports/league/${encodeURIComponent(item.leagueId)}`,
    state: {
      leagueTab: "schedule",
      expandScheduleMatch: false,
      scheduleMatch: {
        gameId: savedId.startsWith(prefix) ? savedId.slice(prefix.length) : savedId,
        competitionCode: item.leagueId,
        utcDate: item.startTime || null,
        home: { id: item.homeTeamId, name: item.homeName, crest: item.homeLogo },
        away: { id: item.awayTeamId, name: item.awayName, crest: item.awayLogo },
        raceName: item.raceName || (SPORTS_LEAGUE_BY_ID[item.leagueId].sport === "레이싱" ? item.homeName || item.title : undefined),
      },
    },
  };
}

function TeamLogo({ src, name }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img className="sports-watchlist-thumbnail__team-logo" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <strong className="sports-watchlist-thumbnail__team-name">{name}</strong>
  );
}

function SportsWatchlistThumbnail({ item }) {
  const artwork = getSportsWatchlistArtwork(item);
  const [failedThumbnail, setFailedThumbnail] = useState(null);
  const showThumbnail = artwork.thumbnail && artwork.thumbnail !== failedThumbnail;
  const date = formatSportsWatchlistDate(item.startTime);
  const homeLogo = artwork.isRace ? artwork.leagueLogo : artwork.homeLogo;

  return (
    <div className="sports-watchlist-thumbnail" style={{ backgroundImage: `url("${artwork.background}")` }} role="img" aria-label={`${item.title} · ${date}`}>
      {showThumbnail ? (
        <img className="sports-watchlist-thumbnail__image" src={artwork.thumbnail} alt="" loading="lazy" onError={() => setFailedThumbnail(artwork.thumbnail)} />
      ) : (
        <div className="sports-watchlist-thumbnail__teams" aria-hidden="true">
          <TeamLogo key={homeLogo || item.homeName} src={homeLogo} name={artwork.isRace ? item.title : item.homeName} />
          {!artwork.isRace && <>
            <span className="sports-watchlist-thumbnail__versus">VS</span>
            <TeamLogo key={artwork.awayLogo || item.awayName} src={artwork.awayLogo} name={item.awayName} />
          </>}
        </div>
      )}
      <span className="sports-watchlist-thumbnail__shade" aria-hidden="true" />
      <time className="sports-watchlist-thumbnail__date" dateTime={item.startTime || undefined}>{date}</time>
    </div>
  );
}


export const WatchList = () => {
    // 로그인 사용자
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    // 현재 선택된 프로필
    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    // 찜 목록 데이터
    const watchlist = useWatchlistStore(
        (state) => state.watchlist
    );

    const loading = useWatchlistStore(
        (state) => state.loading
    );

    const error = useWatchlistStore(
        (state) => state.error
    );

    const ownerKey = useWatchlistStore(
        (state) => state.ownerKey
    );

    const onLoadWatchlist = useWatchlistStore(
        (state) => state.onLoadWatchlist
    );

    const onResetWatchlist = useWatchlistStore(
        (state) => state.onResetWatchlist
    );

    // 계정 또는 프로필이 변경되면 찜 목록 새로 불러오기
    useEffect(() => {
        onResetWatchlist();

        if (!authLoading && user?.uid && currentProfile?.id) {
            onLoadWatchlist();
        }
    }, [
        authLoading,
        user?.uid,
        currentProfile?.id,
        onLoadWatchlist,
        onResetWatchlist
    ]);

    // 현재 로그인 계정과 프로필의 찜 목록인지 확인
    const expectedOwnerKey =
        user?.uid && currentProfile?.id
            ? `${user.uid}_${currentProfile.id}`
            : null;

    const isCurrentList =
        expectedOwnerKey !== null &&
        ownerKey === expectedOwnerKey;

    const items = isCurrentList ? watchlist.slice(0, 5) : [];

    // 실제 요청 중일 때만 로딩 표시
    const isLoading =
        authLoading ||
        (user && currentProfile && loading);

    return (
        <section className="watchlist">
            <div className="watchlist-header">
                <Link
                    to="/my/watchlist"
                    className="watchlist-heading"
                >
                    <h2>찜한 콘텐츠</h2>
                    <img className="watchlist-arrow" src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg" alt="화살표 아이콘" />
                </Link>

                <Link
                    to="/my/watchlist"
                    className="watchlist-more"
                    aria-label="전체 찜 목록 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>

            {isLoading ? (
                <p className="watchlist-message">
                    찜 목록을 불러오는 중입니다.
                </p>
            ) : !user || !currentProfile ? (
                <p className="watchlist-message">
                    프로필을 먼저 선택해 주세요.
                </p>
            ) : error ? (
                <p className="watchlist-message">
                    {error}
                </p>
            ) : !isCurrentList ? (
                <p className="watchlist-message">
                    찜 목록을 불러오지 못했습니다.
                </p>
            ) : items.length === 0 ? (
                <p className="watchlist-message">
                    아직 찜한 콘텐츠가 없습니다.
                </p>
            ) : (
                <div className="watchlist-grid">
                    {items.map((item) => (
                        <Link
                            key={item.docId}
                            {...getWatchlistNavigation(item)}
                            className="watchlist-item"
                        >
                            <div className="watchlist-thumbnail">
                                {item.media_type === 'sports' ? (
                                    <SportsWatchlistThumbnail item={item} />
                                ) : item.backdrop_path || item.poster_path ? (
                                    <picture>
                                        {item.poster_path && (
                                            <source
                                                media="(max-width: 767px)"
                                                srcSet={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                            />
                                        )}
                                        <img
                                            src={`https://image.tmdb.org/t/p/w780${item.backdrop_path || item.poster_path}`}
                                            alt={item.title}
                                        />
                                    </picture>
                                ) : (
                                    <span>이미지 없음</span>
                                )}
                            </div>

                            <p className="watchlist-title">
                                {item.title}
                            </p>
                            {item.media_type === 'sports' && <p className="watchlist-match-date">{formatSportsWatchlistDate(item.startTime)}</p>}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

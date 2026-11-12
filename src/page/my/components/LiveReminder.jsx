import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/useAuthStore'
import { useProfileStore } from '../../../store/useProfileStore'
import { getLiveReminderItems, useWatchlistStore } from '../../../store/useWatchlistStore'
import { SPORTS_LEAGUE_BY_ID } from '../../../data/sportsLeagues'
import { findSportsTeam, SPORTS_TEAM_PLACEHOLDER } from '../../../data/sportsTeams'
import { formatBroadcastDate } from '../../../data/leagueBroadcasts'
import '../scss/LiveReminder.scss'

const MATCH_BACKGROUNDS = {
    축구: '/images/sports/league-detail/detail-matchup-bg.png',
    농구: '/images/sports/league-detail/broadcast-basketball-bg.png',
    레이싱: '/images/sports/league-detail/broadcast-racing-flag-bg.png',
    일반: '/images/sports/league-detail/broadcast-rugby-bg.png',
};

function getSportsWatchlistArtwork(item) {
    const league = SPORTS_LEAGUE_BY_ID[item.leagueId];
    const sport = league?.sport || item.sport || '축구';
    const homeTeam = findSportsTeam(item.leagueId, { id: item.homeTeamId, name: item.homeName });
    const awayTeam = findSportsTeam(item.leagueId, { id: item.awayTeamId, name: item.awayName });

    return {
        background: MATCH_BACKGROUNDS[sport] || MATCH_BACKGROUNDS.축구,
        thumbnail: item.thumbnail || '',
        homeLogo: homeTeam?.logoPath || item.homeLogo || '',
        awayLogo: awayTeam?.logoPath || item.awayLogo || '',
    };
}

function TeamLogo({ src }) {
    const [failed, setFailed] = useState(false);
    const hasImage = Boolean(src && !failed);

    return <img className="sports-watchlist-thumbnail__team-logo" src={hasImage ? src : SPORTS_TEAM_PLACEHOLDER}
        alt="" loading="lazy" onError={hasImage ? () => setFailed(true) : undefined} />;
}

// 이전 경기 찜 목록의 썸네일을 요약·전체 예약 목록에서 함께 사용합니다.
export const SportsWatchlistThumbnail = ({ item }) => {
    const artwork = getSportsWatchlistArtwork(item);
    const [failedThumbnail, setFailedThumbnail] = useState(null);
    const showThumbnail = artwork.thumbnail && artwork.thumbnail !== failedThumbnail;
    const date = formatBroadcastDate(item.startTime);
    const homeLogo = artwork.homeLogo;

    return (
        <div className="sports-watchlist-thumbnail" style={{ backgroundImage: `url("${artwork.background}")` }} role="img" aria-label={`${item.title} · ${date}`}>
            {showThumbnail ? (
                <img className="sports-watchlist-thumbnail__image" src={artwork.thumbnail} alt="" loading="lazy" onError={() => setFailedThumbnail(artwork.thumbnail)} />
            ) : (
                <div className="sports-watchlist-thumbnail__teams" aria-hidden="true">
                    <TeamLogo key={homeLogo || item.homeName} src={homeLogo} />
                    <span className="sports-watchlist-thumbnail__versus">VS</span>
                    <TeamLogo key={artwork.awayLogo || item.awayName} src={artwork.awayLogo} />
                </div>
            )}
            <span className="sports-watchlist-thumbnail__shade" aria-hidden="true" />
            <time className="sports-watchlist-thumbnail__date" dateTime={item.startTime || undefined}>{date}</time>
        </div>
    );
};

export const LiveReminder = () => {
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const currentProfile = useProfileStore((state) => state.currentProfile);
    const { watchlist, ownerKey, loading, error, onLoadWatchlist } = useWatchlistStore();
    const currentOwnerKey = user?.uid && currentProfile?.id
        ? `${user.uid}_${currentProfile.id}`
        : null;
    const isCurrentList = Boolean(!authLoading && currentOwnerKey && ownerKey === currentOwnerKey);
    const liveReminders = isCurrentList ? getLiveReminderItems(watchlist) : [];

    useEffect(() => {
        const store = useWatchlistStore.getState();
        if (!authLoading && currentOwnerKey && store.ownerKey !== currentOwnerKey && !store.loading) {
            onLoadWatchlist();
        }
    }, [authLoading, currentOwnerKey, onLoadWatchlist]);

    return (
        <section className="live-reminder">
            <div className="live-reminder-header">
                <Link
                    to="/my/live"
                    className="live-reminder-heading"
                >
                    <h2>라이브 예약 알림</h2>
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                        alt=""
                        className="live-reminder-arrow"
                    />
                </Link>

                <Link
                    to="/my/live"
                    className="live-reminder-more"
                    aria-label="전체 라이브 예약 알림 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>

            {authLoading || (currentOwnerKey && loading) ? (
                <p className="live-reminder-message">
                    라이브 예약 알림을 불러오는 중입니다.
                </p>
            ) : !currentOwnerKey ? (
                <p className="live-reminder-message">
                    프로필을 먼저 선택해 주세요.
                </p>
            ) : error || !isCurrentList ? (
                <p className="live-reminder-message">
                    라이브 예약 알림을 불러오지 못했습니다.
                </p>
            ) : liveReminders.length === 0 ? (
                <p className="live-reminder-message">
                    예약한 라이브 알림이 없습니다.
                </p>
            ) : (
                <div className="live-reminder-grid">
                    {liveReminders.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            state={item.state}
                            className="live-reminder-item"
                        >
                            <div className="live-reminder-thumbnail">
                                <SportsWatchlistThumbnail item={item} />
                            </div>

                            <p className="live-reminder-title">
                                {item.title}
                            </p>
                            <p className="live-reminder-date">
                                {item.date}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}


import { useEffect, useState } from 'react';
import { StarIcon, ActionIcon, Chevron, EpisodeReviews, ReviewPopup } from './DetailComponents';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMovieStore } from '../../store/useMovieStore';
import { ContentRail } from '../../components/content/ContentRail';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import './Detail.scss';
import { subscribeEpisodeReviews, createEpisodeReview, updateEpisodeReview, deleteEpisodeReview } from '../../service/reviewService';
import { communityError } from '../../data/communityData';

const EMPTY = [];
const IMG = 'https://image.tmdb.org/t/p/original';
const imageUrl = (path) => path ? `${IMG}${path}` : '';

export const Detail = () => {
  const { type, id } = useParams();
  const { state } = useLocation();

  const [season, setSeason] = useState('1');
  const [openedEpisode, setOpenedEpisode] = useState(null);
  const [popupEpisode, setPopupEpisode] = useState(null);
  const [reviewsByEpisode, setReviewsByEpisode] = useState({});
  const [reviewError, setReviewError] = useState('');

  // 로그인 및 프로필 정보
  const user = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.loading);
  const currentProfile = useProfileStore(s => s.currentProfile);

  // Firebase 찜 목록
  const watchlist = useWatchlistStore(s => s.watchlist);
  const ownerKey = useWatchlistStore(s => s.ownerKey);
  const watchlistLoading = useWatchlistStore(s => s.loading);
  const watchlistError = useWatchlistStore(s => s.error);

  const onLoadWatchlist = useWatchlistStore(s => s.onLoadWatchlist);
  const onAddWatchlist = useWatchlistStore(s => s.onAddWatchlist);
  const onRemoveWatchlist = useWatchlistStore(s => s.onRemoveWatchlist);
  const onResetWatchlist = useWatchlistStore(s => s.onResetWatchlist);

  // 영화 / 드라마 상세 정보
  const key = `${type}-${id}`;
  const fetched = useMovieStore(s => s.contentDetails[key]);
  const recommendations = useMovieStore(
    s => s.detailRecommendations[key] ?? EMPTY
  );
  const loading = useMovieStore(s => s.detailLoading[key]);
  const error = useMovieStore(s => s.detailErrors[key]);
  const onFetchContentDetail = useMovieStore(s => s.onFetchContentDetail);

  const seasons = useMovieStore(s => s.seasons[id] ?? EMPTY);
  const episodes = useMovieStore(
    s => s.episodes[`${id}-${season}`] ?? EMPTY
  );
  const onFetchSeason = useMovieStore(s => s.onFetchSeason);
  const onFetchEpisode = useMovieStore(s => s.onFetchEpisode);

  // 상세 정보 불러오기
  useEffect(() => {
    setOpenedEpisode(null);
    setPopupEpisode(null);

    if ((type === 'tv' || type === 'movie') && id) {
      onFetchContentDetail(type, id);

      if (type === 'tv') {
        onFetchSeason(id);
      }
    }
  }, [type, id, onFetchContentDetail, onFetchSeason]);

  // 시즌 / 회차 불러오기
  useEffect(() => {
    if (type !== 'tv' || !id || !seasons.length) return;

    const available = seasons.filter(
      s => s.season_number >= 0
    );

    const selected = available.some(
      s => String(s.season_number) === season
    )
      ? season
      : String(available[0]?.season_number ?? 1);

    if (selected !== season) {
      setSeason(selected);
      return;
    }

    onFetchEpisode(id, Number(selected));
  }, [type, id, seasons, season, onFetchEpisode]);

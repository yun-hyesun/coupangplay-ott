import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getScheduleSeason } from "../../../data/leagueScheduleView";
import { formatPromoMatchDate, getPromoMatchWatchlistContent, selectNextElClasico } from "../../../data/sportsPromoMatch";
import { getLeagueSeasonSchedule } from "../../../service/leagueScheduleService";
import { auth } from "../../../firebase/firebase";
import { useAuthStore } from "../../../store/useAuthStore";
import { useProfileStore } from "../../../store/useProfileStore";
import { useWatchlistStore } from "../../../store/useWatchlistStore";

export function SportsPromo() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const profile = useProfileStore(state => state.currentProfile);
  const watchlist = useWatchlistStore(state => state.watchlist);
  const ownerKey = useWatchlistStore(state => state.ownerKey);
  const watchlistLoading = useWatchlistStore(state => state.loading);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const loading = result?.attempt !== attempt;
  const game = loading ? null : result.game;
  const content = game ? getPromoMatchWatchlistContent(game) : null;
  const expectedOwner = user && profile?.id ? `${user.uid}_${profile.id}` : null;
  const checkingFavorite = Boolean(expectedOwner && ownerKey !== expectedOwner && watchlistLoading);
  const isFavorite = Boolean(expectedOwner && ownerKey === expectedOwner && content && watchlist.some(item =>
    item.media_type === "sports" && String(item.id) === content.id));

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const now = new Date();
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
        const season = getScheduleSeason("PD", today);
        const data = await getLeagueSeasonSchedule("PD", season, { signal: controller.signal, force: attempt > 0 });
        let nextGame = selectNextElClasico(data.games, now);
        if (!nextGame && !data.errors.length) {
          const nextSeason = await getLeagueSeasonSchedule("PD", season + 1, { signal: controller.signal, force: attempt > 0 });
          nextGame = selectNextElClasico(nextSeason.games, now);
        }
        if (!controller.signal.aborted) setResult({ attempt, game: nextGame, error: !nextGame && data.errors.length > 0 });
      } catch {
        if (!controller.signal.aborted) setResult({ attempt, game: null, error: true });
      }
    };
    load();
    return () => controller.abort();
  }, [attempt]);

  const toggleFavorite = async () => {
    if (!game || saving) return;
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    if (!profile?.id) {
      navigate("/profiles");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let store = useWatchlistStore.getState();
      const targetOwner = `${auth.currentUser.uid}_${profile.id}`;
      if (store.ownerKey !== targetOwner) {
        await store.onLoadWatchlist();
        store = useWatchlistStore.getState();
      }
      if (store.ownerKey !== targetOwner || auth.currentUser?.uid !== user?.uid
        || useProfileStore.getState().currentProfile?.id !== profile.id) {
        setMessage("찜 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const saved = store.watchlist.some(item => item.media_type === "sports" && String(item.id) === content.id);
      const success = isFavorite
        ? !saved || await store.onRemoveWatchlist(content)
        : saved || await store.onAddWatchlist(content);
      if (!success) setMessage("경기 찜하기를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="sports-promo" aria-label="엘클라시코 경기 안내" aria-busy={loading}>
      <img src="/images/sports/campaign/el-clasico.png" alt="" loading="lazy" />
      <div className="sports-promo__shade" aria-hidden="true" />
      <div className="sports-promo__copy">
        <div className="sports-promo__tags"><span className="sports-promo__pass">패스</span><span>예정</span></div>
        <h2>{game ? `${game.home.name} vs ${game.away.name}` : "다음 엘클라시코"}</h2>
        <p className="sports-promo__date">
          {loading ? "경기 일정을 불러오는 중입니다." : game ? formatPromoMatchDate(game)
            : result.error ? "경기 일정을 불러오지 못했습니다." : "예정된 경기가 확정되면 안내해 드립니다."}
        </p>
        <button type="button" className="sports-promo__favorite" disabled={!game || saving || checkingFavorite} aria-pressed={isFavorite} onClick={toggleFavorite}>
          {saving ? "저장 중…" : checkingFavorite ? "찜 목록 확인 중…" : isFavorite ? "경기 찜 완료" : "경기 찜하기"}
        </button>
        {!loading && result.error && <button type="button" className="sports-promo__retry" onClick={() => setAttempt(value => value + 1)}>다시 조회</button>}
        {message && <p className="sports-promo__message" role="status">{message}</p>}
      </div>
    </aside>
  );
}

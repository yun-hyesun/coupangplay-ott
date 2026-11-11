import { useEffect, useRef } from 'react';
import { useAuthStore } from './useAuthStore';
import { useProfileStore } from './useProfileStore';
import { useWatchHistoryStore } from './useWatchHistoryStore';

const EMPTY = [];

export const useProfileWatchHistory = ({ clipId = null } = {}) => {
  const uid = useAuthStore((state) => state.user?.uid);
  const profileId = useProfileStore((state) => state.currentProfile?.id);
  const ownerKey = uid && profileId ? `${uid}_${profileId}` : null;
  const history = useWatchHistoryStore((state) =>
    ownerKey && state.ownerKey === ownerKey ? state.history : EMPTY
  );
  const onLoadHistory = useWatchHistoryStore((state) => state.onLoadHistory);
  const previousOwner = useRef(null);

  useEffect(() => {
    const ownerChanged = previousOwner.current !== ownerKey;
    previousOwner.current = ownerKey;
    if (!ownerKey) return;
    const current = useWatchHistoryStore.getState();
    if (ownerChanged || (clipId && (current.ownerKey !== ownerKey || current.error))) {
      void onLoadHistory();
    }
  }, [clipId, ownerKey, onLoadHistory]);

  useEffect(() => {
    if (!ownerKey) return;
    const reload = () => { void onLoadHistory(); };
    window.addEventListener('online', reload);
    return () => window.removeEventListener('online', reload);
  }, [ownerKey, onLoadHistory]);

  return { history, ownerKey };
};


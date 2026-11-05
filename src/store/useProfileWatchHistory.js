import { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';
import { useProfileStore } from './useProfileStore';
import { useWatchHistoryStore } from './useWatchHistoryStore';

const EMPTY = [];

export const useProfileWatchHistory = () => {
  const uid = useAuthStore((state) => state.user?.uid);
  const profileId = useProfileStore((state) => state.currentProfile?.id);
  const ownerKey = uid && profileId ? `${uid}_${profileId}` : null;
  const history = useWatchHistoryStore((state) =>
    ownerKey && state.ownerKey === ownerKey ? state.history : EMPTY
  );
  const onLoadHistory = useWatchHistoryStore((state) => state.onLoadHistory);

  useEffect(() => {
    if (ownerKey) void onLoadHistory();
  }, [ownerKey, onLoadHistory]);

  return { history, ownerKey };
};


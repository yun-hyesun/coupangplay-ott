import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { wowClipService } from '../../../service/wowClipService';
import { hasOriginalWatchHistory } from '../utils/clipSource';

const EMPTY_HISTORY = [];

export const useSpoilerAccess = (clips, history = EMPTY_HISTORY, selectedId = null) => {
  const uid = useAuthStore((state) => state.user?.uid);
  const profileId = useProfileStore((state) => state.currentProfile?.id);
  const scope = uid && profileId ? JSON.stringify([uid, profileId]) : null;
  const originalWatched = new Set(clips.filter((clip) =>
    scope && clip.spoiler && hasOriginalWatchHistory(clip, history)).map((clip) => clip.id));
  const lookupKey = JSON.stringify(scope ? clips.filter((clip) =>
    clip.spoiler && clip.views > 0 && !originalWatched.has(clip.id))
    .map((clip) => clip.id).sort() : []);
  const [viewed, setViewed] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!scope) return;
    const retryOnReconnect = () => setRetry((count) => count + 1);
    window.addEventListener('online', retryOnReconnect);
    return () => window.removeEventListener('online', retryOnReconnect);
  }, [scope]);

  useEffect(() => {
    if (!scope) return;
    let active = true;
    // Another profile can record a play without changing the account-level count.
    const stops = JSON.parse(lookupKey).map((id) =>
      wowClipService.subscribeRecordedView(id, uid, profileId, (watched) => {
        if (!active || !watched) return;
        setViewed((previous) => {
          const ids = previous?.scope === scope ? previous.ids : undefined;
          if (ids?.has(id)) return previous;
          return { scope, ids: new Set([...(ids || []), id]) };
        });
      }, () => {}));
    return () => { active = false; stops.forEach((stop) => stop()); };
  }, [lookupKey, retry, selectedId, scope, uid, profileId]);

  const isProtected = (clip) => !!clip.spoiler && !originalWatched.has(clip.id) &&
    !(scope && viewed?.scope === scope && viewed.ids.has(clip.id));

  return { isProtected };
};

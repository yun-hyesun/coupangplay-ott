import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { wowClipService } from '../../../service/wowClipService';
import { hasOriginalWatchHistory } from '../utils/clipSource';

const EMPTY_HISTORY = [];

export const useSpoilerAccess = (clips, history = EMPTY_HISTORY, selectedId = null) => {
  const uid = useAuthStore((state) => state.user?.uid);
  const originalWatched = new Set(clips.filter((clip) =>
    uid && clip.spoiler && hasOriginalWatchHistory(clip, history)).map((clip) => clip.id));
  const lookupKey = JSON.stringify(uid ? clips.filter((clip) =>
    clip.spoiler && clip.views > 0 && !originalWatched.has(clip.id))
    .map((clip) => [clip.id, clip.views]).sort() : []);
  const cache = useRef(null);
  const [viewed, setViewed] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const retryOnReconnect = () => setRetry((count) => count + 1);
    window.addEventListener('online', retryOnReconnect);
    return () => window.removeEventListener('online', retryOnReconnect);
  }, [uid]);

  useEffect(() => {
    if (!cache.current || cache.current.uid !== uid) cache.current = { uid, reads: new Map() };
    const { reads } = cache.current;
    let active = true;

    for (const [id, views] of JSON.parse(lookupKey)) {
      let read = reads.get(id);
      // A view record is permanent; a negative result can change when views increase.
      const reconnectWhilePending = read?.pending && read.retry !== retry;
      if (!read || (!read.watched && read.views !== views) || reconnectWhilePending) {
        const entry = { views, watched: false, pending: true, retry };
        entry.promise = wowClipService.hasRecordedView(id, uid).then((watched) => {
          entry.pending = false;
          entry.watched = watched;
          return watched;
        }).catch(() => {
          // A failed read does not establish that this account has never watched the clip.
          if (reads.get(id) === entry) reads.delete(id);
          return false;
        });
        read = entry;
        reads.set(id, entry);
      }
      void read.promise.then((watched) => {
        if (!active || !watched) return;
        setViewed((previous) => {
          const ids = previous?.uid === uid ? previous.ids : undefined;
          if (ids?.has(id)) return previous;
          return { uid, ids: new Set([...(ids || []), id]) };
        });
      });
    }
    return () => { active = false; };
  }, [lookupKey, retry, selectedId, uid]);

  const isProtected = (clip) => !!clip.spoiler && !originalWatched.has(clip.id) &&
    !(uid && viewed?.uid === uid && viewed.ids.has(clip.id));

  return { isProtected };
};

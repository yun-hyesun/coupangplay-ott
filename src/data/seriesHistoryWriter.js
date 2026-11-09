import { arrayUnion, runTransaction } from 'firebase/firestore';
import { watchEpisodeKey } from './watchHistoryData.js';

const RETRY_DELAY_MS = 5000;
const RETRYABLE_ERRORS = new Set(['unavailable', 'deadline-exceeded', 'aborted', 'cancelled']);
const isOnline = () => globalThis.navigator?.onLine !== false;

const mergeWrites = (first, second) => {
  if (!first) return second;
  const latest = first.entry.resumeCapturedAt > second.entry.resumeCapturedAt ? first : second;
  return { ...latest, episodes: [...new Set([...first.episodes, ...second.episodes])] };
};

export const createSeriesHistoryWriter = ({ database, currentUid, onError, onRetrySaved }) => {
  const pending = new Map();
  const active = new Set();
  let retryTimer;
  let lastCapture = 0;

  function scheduleRetry() {
    if (retryTimer || !isOnline() || typeof window === 'undefined') return;
    retryTimer = window.setTimeout(retry, RETRY_DELAY_MS);
  }

  function queue(write) {
    pending.set(write.ref.path, mergeWrites(pending.get(write.ref.path), write));
    scheduleRetry();
  }

  function attempt(write, retrying = false) {
    const operation = { write, cancelled: false };
    operation.promise = runTransaction(database, async (transaction) => {
      const { ref, entry, episodes } = write;
      if (operation.cancelled || currentUid() !== write.uid) return false;
      const previous = (await transaction.get(ref)).data();
      if (operation.cancelled || currentUid() !== write.uid) return false;

      // Preserve the latest episode of documents saved before the episode list existed.
      const previousEpisode = watchEpisodeKey(previous);
      const watched = previousEpisode ? [...episodes, previousEpisode] : episodes;
      const update = entry.resumeCapturedAt > (previous?.resumeCapturedAt ?? 0) ? { ...entry } : {};
      if (watched.length) update.watchedEpisodes = arrayUnion(...watched);
      if (Object.keys(update).length) transaction.set(ref, update, { merge: true });
      return true;
    }).then((saved) => {
      if (saved && retrying && !operation.cancelled) onRetrySaved(write);
      return saved;
    }, (error) => {
      if (operation.cancelled) return false;
      if (RETRYABLE_ERRORS.has(error.code)) queue(write);
      else onError(error, write);
      return false;
    }).finally(() => active.delete(operation));
    active.add(operation);
    return operation.promise;
  }

  function retry() {
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = undefined;
    if (!isOnline()) return;
    for (const [path, write] of pending) {
      if (write.uid !== currentUid()) continue;
      pending.delete(path);
      void attempt(write, true);
    }
  }

  if (typeof window !== 'undefined') window.addEventListener('online', retry);

  return {
    save(ref, entry, uid, profileId) {
      lastCapture = Math.max(Date.now(), lastCapture + 1);
      const episode = watchEpisodeKey(entry);
      const write = mergeWrites(pending.get(ref.path), {
        ref, uid, profileId, entry: { ...entry, resumeCapturedAt: lastCapture }, episodes: episode ? [episode] : [],
      });
      pending.delete(ref.path);
      if (isOnline()) return attempt(write);
      queue(write);
      return Promise.resolve(false);
    },
    retry,
    async discard(refs) {
      const paths = new Set(refs.map((ref) => ref.path));
      for (const path of paths) pending.delete(path);
      const discarding = [...active].filter(({ write }) => paths.has(write.ref.path));
      for (const operation of discarding) operation.cancelled = true;
      await Promise.all(discarding.map(({ promise }) => promise));
    },
  };
};

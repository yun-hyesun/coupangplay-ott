import { preinit } from 'react-dom';
import { getCachedPreviewVideos, getVideoFallback, loadPreviewVideos } from '../../data/videoFallback';

const MAX_PREFETCHED_TITLES = 4;
const prefetchedTitles = new Set();
const visibleCallbacks = new Map();
let observer;
let playerPrepared = false;

function getObserver() {
  observer ??= new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      const prepare = visibleCallbacks.get(target);
      observer.unobserve(target);
      visibleCallbacks.delete(target);
      prepare?.();
    }
  }, { threshold: 0.5 });
  return observer;
}

export function prepareVisiblePreview(card, mediaType, id, originalLanguage, apiKey) {
  if (!card || !id || (mediaType !== 'movie' && mediaType !== 'tv')) return;
  if (!window.IntersectionObserver || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || '')) return;

  const key = `${mediaType}/${id}/${originalLanguage || ''}`;
  const hasLocalPreview = Boolean(getVideoFallback(mediaType, id, 'preview'));
  const canPrefetch = () => (
    apiKey && !hasLocalPreview && prefetchedTitles.size < MAX_PREFETCHED_TITLES &&
    !prefetchedTitles.has(key) && !getCachedPreviewVideos(mediaType, id, originalLanguage)
  );
  if (playerPrepared && !canPrefetch()) return;

  const prepare = () => {
    if (!playerPrepared) {
      playerPrepared = true;
      if (!window.YT?.Player) preinit('https://www.youtube.com/iframe_api', { as: 'script' });
    }
    if (canPrefetch()) {
      prefetchedTitles.add(key);
      void loadPreviewVideos(mediaType, id, originalLanguage, apiKey).catch(() => {});
    }
    if (prefetchedTitles.size === MAX_PREFETCHED_TITLES) {
      observer.disconnect();
      visibleCallbacks.clear();
    }
  };

  const cardObserver = getObserver();
  let cancelPrepare;
  visibleCallbacks.set(card, () => {
    if (window.requestIdleCallback) {
      const handle = window.requestIdleCallback(prepare, { timeout: 750 });
      cancelPrepare = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(prepare, 150);
      cancelPrepare = () => window.clearTimeout(handle);
    }
  });
  cardObserver.observe(card);

  return () => {
    cancelPrepare?.();
    visibleCallbacks.delete(card);
    cardObserver.unobserve(card);
  };
}

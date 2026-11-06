// YouTube가 iframe을 교체하는 순간에도 편집용 새 플레이어를 열 수 있도록
// 마지막으로 화면에 표시한 시각·길이를 보존합니다.
export const captureClipPlayback = (player, fallback) => {
  const read = (method, previous, positive = false) => {
    try {
      const value = player?.[method]?.();
      if (Number.isFinite(value) && (positive ? value > 0 : value >= 0)) return value;
    } catch { /* 교체된 플레이어는 마지막 표시값을 사용합니다. */ }
    return Number.isFinite(previous) && previous >= 0 ? previous : 0;
  };
  const playback = {
    currentTime: read('getCurrentTime', fallback.currentTime),
    duration: read('getDuration', fallback.duration, true),
  };
  try { player?.pauseVideo?.(); } catch { /* 이미 제거된 본편 iframe은 정지할 수 없습니다. */ }
  return playback;
};

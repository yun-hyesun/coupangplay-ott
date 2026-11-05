export const clampTime = (value, min, max) => Math.max(min, Math.min(max, Math.round(value * 10) / 10));

export const initialClipWindow = (duration = 0, currentTime = 0) => {
  const total = Number.isFinite(duration) && duration > 0 ? duration : Math.max(20, currentTime + 10);
  const end = Math.min(total, Math.max(5, currentTime));
  const start = Math.max(0, end - 5);
  const contextEnd = Math.min(total, Math.max(20, start + 11));
  return { start, end, contextStart: Math.max(0, contextEnd - 20), contextEnd };
};

export const moveClipRange = (range, edge, value, minimum, maximum) => {
  const minimumLength = Math.min(1, maximum - minimum);
  if (edge === 'move') {
    const length = range.end - range.start;
    const start = clampTime(value, minimum, maximum - length);
    return { start, end: Math.round((start + length) * 10) / 10 };
  }
  return edge === 'start'
    ? { ...range, start: clampTime(value, minimum, range.end - minimumLength) }
    : { ...range, end: clampTime(value, range.start + minimumLength, maximum) };
};

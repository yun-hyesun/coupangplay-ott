export const PORTRAIT_CROP_WIDTH = 81 / 256;

export const clipPresentation = (clip = {}) => ({
  layout: clip.layout === 'portrait' ? 'portrait' : 'landscape',
  cropX: Number.isFinite(clip.cropX) ? Math.max(0, Math.min(100, clip.cropX)) : 50,
});

export const cropLeftPercent = (position) => (1 - PORTRAIT_CROP_WIDTH) * clipPresentation({ cropX: position }).cropX;
export const sourceLeftPercent = (position) => -(1 / PORTRAIT_CROP_WIDTH - 1) * clipPresentation({ cropX: position }).cropX;
export const buildClipFeed = (clips, selected) => selected && !clips.some((clip) => clip.id === selected.id) ? [selected, ...clips] : clips;
export const formatViews = (value = 0) => new Intl.NumberFormat('ko-KR', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Math.max(0, Number(value) || 0));

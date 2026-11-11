/** 원본 점수의 만점을 명시해 5점 기준으로 환산합니다. 원본 데이터는 변경하지 않습니다. */
export const toFivePointRating = (value, sourceMax = 5) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isFinite(sourceMax) || sourceMax <= 0) return null;
  return Math.max(0, Math.min(sourceMax, number)) * 5 / sourceMax;
};

export const formatFivePointRating = (value, sourceMax = 5) => {
  const rating = toFivePointRating(value, sourceMax);
  return rating === null ? '—' : rating.toFixed(1);
};

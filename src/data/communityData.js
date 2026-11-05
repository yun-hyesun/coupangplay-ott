// TMDB 작품/회차 식별자를 Firestore 문서 경로에 안전하게 사용합니다.
export const contentKey = (type, id) => `${type}-${id}`;
export const episodeKey = (season, episode) => `s${season}-e${episode}`;
export const displayName = (user) => user?.displayName || user?.email?.split('@')[0] || '사용자';
export const toDate = (value) => value?.toDate?.()?.toISOString?.() || null;
export const communityError = (error) => {
  if (error?.code === 'permission-denied') return '접근 권한이 없습니다. 로그인 및 Firestore 보안 규칙을 확인해 주세요.';
  if (error?.code === 'unavailable') return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  return error?.message || '요청을 처리하지 못했습니다.';
};

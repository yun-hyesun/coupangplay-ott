// 와우클립 메타데이터만 브라우저에 보관합니다. 실제 영상 업로드/공개 API는 별도 연동이 필요합니다.
const PREFIX = 'coupang-wowclip-v2';
const keyFor = (uid) => `${PREFIX}:${uid || 'guest'}`;
export function readClips(uid) {
  try {
    const data = JSON.parse(localStorage.getItem(keyFor(uid)) || '[]');
    return Array.isArray(data) ? data.filter((item) => item && item.id && item.status) : [];
  } catch { return []; }
}
export function saveClip(uid, clip) {
  const list = readClips(uid);
  const now = new Date().toISOString();
  const id = clip.id || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const item = { ...clip, id, ownerId: uid || 'guest', updatedAt: now, createdAt: clip.createdAt || now };
  const next = [item, ...list.filter((old) => old.id !== id)];
  localStorage.setItem(keyFor(uid), JSON.stringify(next));
  return item;
}
export function removeClip(uid, id) {
  localStorage.setItem(keyFor(uid), JSON.stringify(readClips(uid).filter((item) => item.id !== id)));
}

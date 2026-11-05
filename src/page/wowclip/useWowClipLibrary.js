import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'coupangplay.wowclip.v1';

const readLibrary = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) throw new Error();
    const clips = saved.filter((clip) => clip && typeof clip.id === 'string'
      && /^[\w-]{11}$/.test(clip.videoKey || '') && clip.content?.id
      && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start
      && ['public', 'link'].includes(clip.visibility)
      && Array.isArray(clip.likes) && Array.isArray(clip.comments));
    return { clips, error: '' };
  } catch {
    return { clips: [], error: '저장한 클립을 불러오지 못했어요. 브라우저 저장소 설정을 확인해 주세요.' };
  }
};

// 팀의 인증·작품·시청 기록 저장소를 수정하지 않는 독립적인 클립 저장소입니다.
// 서버용 클립 API가 준비되면 이 훅의 읽기/쓰기만 교체할 수 있습니다.
export const useWowClipLibrary = () => {
  const [library, setLibrary] = useState(readLibrary);

  useEffect(() => {
    const sync = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) setLibrary(readLibrary());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const update = useCallback((change) => {
    const current = readLibrary();
    if (current.error) throw new Error(current.error);
    const clips = change(current.clips);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
    } catch {
      throw new Error('클립을 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.');
    }
    setLibrary({ clips, error: '' });
  }, []);

  const saveClip = (clip) => update((clips) => [clip, ...clips]);
  const recordView = (id) => update((clips) => clips.map((clip) => clip.id === id ? { ...clip, views: Math.max(0, Number(clip.views) || 0) + 1 } : clip));
  const removeClip = (id, ownerId) => update((clips) => clips.filter((clip) => clip.id !== id || clip.ownerId !== ownerId));
  const toggleLike = (id, ownerId, commentId) => update((clips) => clips.map((clip) => {
    if (clip.id !== id) return clip;
    const toggle = (likes = []) => likes.includes(ownerId) ? likes.filter((value) => value !== ownerId) : [...likes, ownerId];
    if (!commentId) return { ...clip, likes: toggle(clip.likes) };
    return { ...clip, comments: clip.comments.map((comment) => comment.id === commentId ? { ...comment, likes: toggle(comment.likes) } : comment) };
  }));
  const addComment = (id, text, owner, parentId = null) => {
    const value = text.trim();
    if (!value || value.length > 1000) throw new Error('댓글은 1~1000자로 작성해 주세요.');
    update((clips) => clips.map((clip) => clip.id !== id ? clip : {
      ...clip,
      comments: [...clip.comments, {
        id: crypto.randomUUID(), text: value, parentId,
        author: owner.name, ownerId: owner.id, avatar: owner.avatar,
        createdAt: new Date().toISOString(), likes: [],
      }],
    }));
  };

  return { ...library, saveClip, removeClip, toggleLike, addComment, recordView, reload: () => setLibrary(readLibrary()) };
};

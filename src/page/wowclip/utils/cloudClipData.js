import { clipEpisodeDetails } from './clipSource.js';

export const clipCloudError = (failure) => {
  if (failure?.code === 'permission-denied') return '클립 접근 권한이 없어요. 로그인 상태 또는 클립 공개 범위를 확인해 주세요.';
  if (['unavailable', 'deadline-exceeded'].includes(failure?.code)) return '클립 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  if (failure?.code === 'unauthenticated') return '로그인한 후 다시 시도해 주세요.';
  return failure?.message || '클립 요청을 처리하지 못했어요. 다시 시도해 주세요.';
};

const isoDate = (value) => value?.toDate?.()?.toISOString() || (typeof value === 'string' ? value : new Date().toISOString());

export const cloudClip = (id, data) => ({
  ...data, id, createdAt: isoDate(data.createdAt),
  likeCount: Math.max(0, Number(data.likeCount) || 0),
  commentCount: Math.max(0, Number(data.commentCount) || 0),
  views: Math.max(0, Number(data.views) || 0),
  likes: [], comments: [], liked: false,
});

export const cloudComment = (id, data) => ({
  ...data, id, createdAt: isoDate(data.createdAt), likes: [],
  likeCount: Math.max(0, Number(data.likeCount) || 0), liked: false,
});

export const newCloudClip = (clip, user, timestamp) => {
  if (!user?.uid) throw new Error('클립을 저장하려면 로그인해 주세요.');
  if (!clip?.id || !/^[\w-]{11}$/.test(clip.videoKey || '') || !clip.content?.id
    || !['tv', 'movie'].includes(clip.content.media_type)
    || !Number.isFinite(clip.start) || !Number.isFinite(clip.end) || clip.start < 0 || clip.end <= clip.start
    || !['public', 'link'].includes(clip.visibility)) throw new Error('원본 영상과 클립 구간을 다시 확인해 주세요.');
  const title = clip.title?.trim();
  if (!title || title.length > 80) throw new Error('클립 제목은 1~80자로 입력해 주세요.');
  const prefix = user.uid + ':';
  const profileId = clip.ownerId?.startsWith(prefix) ? clip.ownerId.slice(prefix.length) : 'default';
  const episode = clipEpisodeDetails(clip);
  return {
    content: {
      id: String(clip.content.id), media_type: clip.content.media_type,
      title: String(clip.content.title || clip.content.name || '작품').slice(0, 300),
      backdrop_path: clip.content.backdrop_path || null, poster_path: clip.content.poster_path || null,
      number_of_seasons: episode.numberOfSeasons,
    },
    videoKey: clip.videoKey, videoTitle: String(clip.videoTitle || '').slice(0, 300), title,
    start: clip.start, end: clip.end, visibility: clip.visibility, spoiler: !!clip.spoiler,
    layout: clip.layout === 'portrait' ? 'portrait' : 'landscape',
    cropX: Number.isFinite(clip.cropX) ? Math.max(0, Math.min(100, clip.cropX)) : 50,
    seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber,
    authorUid: user.uid, profileId, ownerId: prefix + profileId,
    author: String(clip.author || user.displayName || '사용자').slice(0, 100),
    avatar: typeof clip.avatar === 'string' ? clip.avatar : '/images/profile.svg',
    createdAt: timestamp, deleted: false, likeCount: 0, commentCount: 0, views: 0, lastCommentId: null,
  };
};

export const clipLikeCount = (clip) => clip.likeCount ?? clip.likes?.length ?? 0;
export const clipIsLiked = (clip, ownerId) => clip.liked ?? clip.likes?.includes(ownerId) ?? false;

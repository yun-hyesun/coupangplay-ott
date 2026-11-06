import { clipEpisodeDetails } from './clipSource.js';

export const formatTime = (seconds = 0) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
};

export const relativeTime = (date) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
};

export const contentImage = (content, size = 'w780') => {
  const path = content?.backdrop_path || content?.poster_path;
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
};

export const clipImage = (clip, protectedImage = false) =>
  protectedImage ? contentImage(clip.content) : `https://i.ytimg.com/vi/${encodeURIComponent(clip.videoKey)}/hqdefault.jpg`;

export const contentTitle = (content) => content?.title || content?.name || '작품';

export const makeClip = ({ content, video, title, start, end, visibility, spoiler, owner, seasonNumber, episodeNumber, layout = 'landscape', cropX = 50 }) => {
  const mediaType = content.media_type || (content.title ? 'movie' : 'tv');
  const episode = clipEpisodeDetails({ content: { ...content, media_type: mediaType }, seasonNumber, episodeNumber });
  return {
    id: crypto.randomUUID(),
    content: {
      id: content.id,
      media_type: mediaType,
      title: contentTitle(content),
      backdrop_path: content.backdrop_path || null,
      poster_path: content.poster_path || null,
      ...(mediaType === 'tv' ? { number_of_seasons: episode.numberOfSeasons } : {}),
    },
    ...(mediaType === 'tv' ? { seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber } : {}),
    videoKey: video.key,
    videoTitle: video.name,
    title: title.trim() || `${contentTitle(content)}에서 오린 장면`,
    start, end, visibility, spoiler,
    layout: layout === 'portrait' ? 'portrait' : 'landscape',
    cropX: Number.isFinite(cropX) ? Math.max(0, Math.min(100, cropX)) : 50,
    views: 0,
    ownerId: owner.id,
    author: owner.name,
    avatar: owner.avatar,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: [],
  };
};

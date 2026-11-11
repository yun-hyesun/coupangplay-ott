import { getYouTubeVideoId } from '../../data/youtubeVideoId.js';

export function resolveWatchMedia({ type, id, state, selectedVideo }) {
  const content = state?.content || {};
  return {
    youtubeKey: type === 'sports' ? getYouTubeVideoId({ id }) : state?.youtubeKey || selectedVideo?.key || '',
    videoSrc: typeof state?.videoSrc === 'string' ? state.videoSrc : '',
    title: (type === 'sports' && state?.title) || content.title || content.name || state?.title || (type === 'sports' ? '스포츠 영상' : '콘텐츠 제목'),
  };
}

export function getWatchReturnDestination(state) {
  let path = '/';
  if (typeof state?.returnTo === 'string' && state.returnTo.startsWith('/') && !state.returnTo.startsWith('//')) {
    try {
      const url = new URL(state.returnTo, 'https://player.invalid');
      if (url.origin === 'https://player.invalid' && (url.pathname === '/' || url.pathname === '/sports' || url.pathname.startsWith('/sports/'))) {
        path = url.pathname + url.search + url.hash;
      }
    } catch { /* Invalid return destinations fall back to the home page. */ }
  }
  const leagueTab = ['home', 'videos', 'schedule', 'standings'].includes(state?.returnTab) ? state.returnTab : 'home';
  const scheduleMatch = state?.returnScheduleMatch;
  return { path, leagueTab, ...(leagueTab === 'schedule' && scheduleMatch?.competitionCode
    && path.split(/[?#]/)[0] === `/sports/league/${scheduleMatch.competitionCode}` ? { scheduleMatch } : {}) };
}

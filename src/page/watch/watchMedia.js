import { getYouTubeVideoId } from '../../data/youtubeVideoId.js';

export function getWatchInviteSession(params) {
  const session = params.get('session');
  return session && /^[\w-]{1,128}$/.test(session) ? session : null;
}

export function getWatchInviteReturn(path) {
  if (typeof path !== 'string' || !/^\/watch\/(tv|movie)\/[\w-]+\?/.test(path)) return null;
  const url = new URL(path, 'https://player.invalid');
  return getWatchInviteSession(url.searchParams) ? url.pathname + url.search : null;
}

export function getInviteEpisode(params) {
  const parseNumber = (name, minimum) => {
    const value = params.get(name);
    if (!value || !/^\d+$/.test(value)) return undefined;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= minimum ? number : undefined;
  };
  return { seasonNumber: parseNumber('season', 0), episodeNumber: parseNumber('episode', 1) };
}

export function getClipRestriction({ type, youtubeKey, videoSrc, hasPlaybackError, videoLookupPending, activeFallback }) {
  if (videoLookupPending) return '영상을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.';
  const restricted = '이 영상은 클립 기능이 제한돼 있어요.';
  if (hasPlaybackError) return `${restricted} 원본 영상을 재생할 수 없어요.`;
  if (videoSrc) return `${restricted} 직접 연결된 영상 파일은 클립 편집을 지원하지 않아요.`;
  if (!/^[\w-]{11}$/.test(youtubeKey)) return `${restricted} 클립을 만들 수 있는 원본 영상이 없어요.`;
  if (!activeFallback) return '';
  const { videoType, scope } = activeFallback;
  if ((type === 'movie' && videoType === 'film') || (type === 'tv' && videoType === 'episode' && scope.type === 'episode')) return '';
  return `${restricted} 현재 재생 중인 대체 영상에서는 클립을 만들 수 없어요.`;
}

export function getSportsLiveWatchDestination(game, { leagueId = game.competitionCode || game.leagueId, returnTo = '/sports', returnTab = 'home' } = {}) {
  const params = new URLSearchParams(Object.entries({
    league: leagueId, match: game.gameId ?? game.id, home: game.home?.name,
    away: game.away?.name, kickoff: game.utcDate || game.startTime,
  }).filter(([, value]) => value != null && value !== ''));
  return {
    to: `/watch/sports/live?${params}`,
    state: {
      title: `${game.home?.name || '홈 팀'} vs ${game.away?.name || '원정 팀'}`,
      returnTo, returnTab,
      ...(returnTab === 'schedule' ? { returnScheduleMatch: { ...game, competitionCode: leagueId }, expandScheduleMatch: false } : {}),
    },
  };
}

export function getSportsLiveMatch(search) {
  const params = new URLSearchParams(search);
  const homeName = params.get('home') || '';
  const awayName = params.get('away') || '';
  return {
    competitionCode: params.get('league') || '', gameId: params.get('match') || '',
    utcDate: params.get('kickoff') || null,
    home: { name: homeName }, away: { name: awayName },
    title: `${homeName || '홈 팀'} vs ${awayName || '원정 팀'}`,
  };
}

export function resolveWatchMedia({ type, id, state, selectedVideo, liveVideo }) {
  const content = state?.content || {};
  return {
    youtubeKey: type === 'sports' ? getYouTubeVideoId(id === 'live' ? liveVideo || {} : { id }) : state?.youtubeKey || selectedVideo?.key || '',
    videoSrc: type === 'sports' && id === 'live' ? '' : typeof state?.videoSrc === 'string' ? state.videoSrc : '',
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
    && path.split(/[?#]/)[0] === `/sports/league/${scheduleMatch.competitionCode}` ? { scheduleMatch, ...(state?.expandScheduleMatch === false ? { expandScheduleMatch: false } : {}) } : {}) };
}

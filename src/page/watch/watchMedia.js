import { getYouTubeVideoId } from '../../data/youtubeVideoId.js';

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

const channelId = 'UCnBht7BrOx-A328KFXgysqQ';
const cacheMs = 20 * 60 * 1000;
let cachedRails;
let expiresAt = 0;
let pendingRequest;

async function youtube(endpoint, params, { includePage = false } = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

  const data = await response.json();

  if (!response.ok) {
    const reason = data.error?.errors?.[0]?.reason || 'unknown';
    const message = data.error?.message || 'YouTube 요청 실패';

    console.error(`[YouTube ${endpoint}]`, {
      status: response.status,
      reason,
      message,
    });

    throw new Error(`YouTube ${endpoint}: ${response.status} (${reason})`);
  }
  return includePage ? data : (data.items ?? []); 
}

function toCard(videoId, snippet, kind) {
  const { high, medium, default: small } = snippet.thumbnails ?? {};
  const thumbnail = (high ?? medium ?? small)?.url;
  if (!videoId || !thumbnail) return null;

  return {
    id: videoId,
    title: snippet.title,
    source: 'youtube',
    kind,
    thumbnail,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function loadUploads() {
  const channels = await youtube('channels', {
    part: 'contentDetails',
    id: channelId,
  });
  const uploadsId = channels[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error('채널 업로드 목록을 찾지 못했습니다.');

  const highlights = [];
  const replays = [];
  const seenVideos = new Set();
  let pageToken;

  for (let page = 0; page < 10; page += 1) {
    const { items = [], nextPageToken } = await youtube(
      'playlistItems',
      {
        part: 'snippet',
        playlistId: uploadsId,
        maxResults: 50,
        ...(pageToken ? { pageToken } : {}),
      },
      { includePage: true },
    );

    for (const { snippet } of items) {
      const title = snippet.title ?? '';
      const isHighlight = /하이라이트|highlights?/i.test(title);
      const isReplay = /풀\s*경기|풀\s*매치|full\s*match/i.test(title);

      if (!isHighlight && !isReplay) continue;

      const rail = isHighlight ? highlights : replays;
      if (rail.length >= 20) continue;

      const card = toCard(
        snippet.resourceId?.videoId,
        snippet,
        isHighlight ? 'highlight' : 'replay',
      );

      if (card && !seenVideos.has(card.id)) {
        rail.push(card);
        seenVideos.add(card.id);
      }
    }

    if (!nextPageToken || (highlights.length === 20 && replays.length === 20)) {
      break;
    }

    pageToken = nextPageToken;
  }

  return { highlights, replays };
}

async function loadLive(liveChannelId = channelId) {
  const live = await youtube('search', {
    part: 'snippet',
    channelId: liveChannelId,
    type: 'video',
    eventType: 'live',
    maxResults: 20,
  });

  return live
    .map(({ id, snippet }) => toCard(id.videoId, snippet, 'live'))
    .filter(Boolean);
}

async function loadNewsLive() {
  const newsChannels = [
    { handle: '@YTN', name: 'YTN' },
    { handle: '@yonhapnewstv23', name: '연합뉴스TV' },
  ];

  const results = await Promise.allSettled(
    newsChannels.map(async ({ handle, name }) => {
      // 1. 공식 채널의 업로드 목록 확인
      const channels = await youtube('channels', {
        part: 'contentDetails',
        forHandle: handle,
      });

      const playlistId =
        channels[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!playlistId) {
        throw new Error(`${name}: 채널 업로드 목록이 없습니다.`);
      }

      // 2. 최근 영상에서 현재 라이브 상태 확인
      const uploads = await youtube('playlistItems', {
        part: 'snippet',
        playlistId,
        maxResults: 50,
      });

      const ids = [
        ...new Set(
          uploads
            .map((item) => item.snippet?.resourceId?.videoId)
            .filter(Boolean),
        ),
      ];

      let liveVideos = [];

      if (ids.length > 0) {
        const videos = await youtube('videos', {
          part: 'snippet,status',
          id: ids.join(','),
        });

        liveVideos = videos
          .filter(
            (video) =>
              video.snippet?.liveBroadcastContent === 'live' &&
              video.status?.embeddable === true,
          )
          .map((video) => toCard(video.id, video.snippet, 'live'))
          .filter(Boolean);
      }

      // 업로드 목록에 진행 중인 방송이 없으면 라이브 검색
      if (liveVideos.length === 0) {
        const searchResults = await youtube('search', {
          part: 'snippet',
          channelId: channels[0].id,
          type: 'video',
          eventType: 'live',
          videoEmbeddable: 'true',
          maxResults: 5,
        });

        liveVideos = searchResults
          .map(({ id, snippet }) =>
            toCard(id.videoId, snippet, 'live'),
          )
          .filter(Boolean);
      }

      return liveVideos.map((item) => ({
        ...item,
        hideTitle: true,
        channelName: name,
      }));
    }),
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[뉴스 LIVE: ${newsChannels[index].name}]`,
        result.reason?.message,
      );
    }
  });

  return {
    items: results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    ),
    error: results.some((result) => result.status === 'rejected'),
  };
}

async function loadRails() {
  const [uploads, live, news] = await Promise.allSettled([
    loadUploads(),
    loadLive(),
    loadNewsLive(),
  ]);

  if (
    uploads.status === 'rejected' &&
    live.status === 'rejected' &&
    !news.value?.items.length
  ) {
    throw new Error('유튜브 영상 목록을 불러오지 못했습니다.');
  }

  return {
    highlights: uploads.value?.highlights ?? cachedRails?.highlights ?? [],
    replays: uploads.value?.replays ?? cachedRails?.replays ?? [],
    live: live.value ?? [],
    newsLive: news.value?.items ?? [],
    error: uploads.status === 'rejected' || live.status === 'rejected',
    newsLiveError: news.status === 'rejected' || news.value?.error === true,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'YOUTUBE_API_KEY is missing' });
  }

  try {
    if (Date.now() >= expiresAt) {
      pendingRequest ??= loadRails()
        .then((rails) => {
          cachedRails = rails;
          expiresAt = Date.now() + (rails.error ? 60_000 : cacheMs);
        })
        .finally(() => { pendingRequest = undefined; });
      await pendingRequest;
    }
    res.setHeader('Cache-Control', cachedRails.error
      ? 'no-store'
      : 'public, s-maxage=1200');
    return res.status(200).json(cachedRails);
  } catch (error) {
    console.error(error.message);
    return res.status(502).json({ error: 'YouTube request failed' });
  }
}


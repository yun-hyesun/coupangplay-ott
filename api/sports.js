const channelId = 'UCnBht7BrOx-A328KFXgysqQ';
const cacheMs = 20 * 60 * 1000;
let cachedRails;
let expiresAt = 0;
let pendingRequest;

async function youtube(endpoint, params, { includePage = false } = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!response.ok) throw new Error(`YouTube ${endpoint}: ${response.status}`);
  const data = await response.json();
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
  const results = await Promise.allSettled([
    loadLive('UChlgI3UHCOnwUGzWzbJ3H5w'), // YTN
    (async () => {
      const channels = await youtube('channels', {
        part: 'id',
        forHandle: '@yonhapnewstv23',
      });
      const yonhapId = channels[0]?.id;
      return yonhapId ? loadLive(yonhapId) : [];
    })(),
  ]);

  return {
    items: results
      .flatMap((result) =>
        result.status === 'fulfilled' ? result.value : [],
      )
      .map((item) => ({ ...item, hideTitle: true })),
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


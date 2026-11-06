import test from 'node:test';
import assert from 'node:assert/strict';
import { clipEpisodeDetails, clipEpisodeLabel, clipWatchState } from './clipSource.js';
import { makeClip } from './wowClipData.js';

const source = { content: { id: 12, media_type: 'tv', name: '검수 시리즈', number_of_seasons: 3 }, video: { key: 'apJOlU1WB94', name: '원본' }, title: '검수', start: 12, end: 17, visibility: 'public', spoiler: false, owner: { id: 'qa', name: '검수' } };

test('시즌과 회차를 저장해도 원본 복귀가 1시즌 1화로 바뀌지 않는다', () => {
  const clip = makeClip({ ...source, seasonNumber: 2, episodeNumber: 7 });
  const restored = JSON.parse(JSON.stringify(clip));
  assert.equal(clipEpisodeLabel(restored), '시즌 2 · 7화');
  assert.deepEqual(clipWatchState(restored), { content: restored.content, youtubeKey: source.video.key, resumeAt: 12, seasonNumber: 2, episodeNumber: 7 });
});

test('한 시즌인 드라마는 회차만 표시하고 여러 시즌의 첫 시즌은 시즌도 구분한다', () => {
  assert.equal(clipEpisodeLabel({ content: { media_type: 'tv', number_of_seasons: 1 }, seasonNumber: 1, episodeNumber: 4 }), '4화');
  assert.equal(clipEpisodeLabel({ content: { media_type: 'tv', number_of_seasons: 3 }, seasonNumber: 1, episodeNumber: 4 }), '시즌 1 · 4화');
});

test('회차 없는 기존 클립과 영화에는 확인되지 않은 시즌·회차를 추가하지 않는다', () => {
  const legacy = { content: { id: 12, media_type: 'tv' }, videoKey: 'apJOlU1WB94', start: 5 };
  assert.equal(clipEpisodeLabel(legacy), '');
  assert.equal('seasonNumber' in clipWatchState(legacy), false);
  assert.equal('episodeNumber' in clipWatchState(legacy), false);
  const movie = makeClip({ ...source, content: { id: 4, media_type: 'movie', title: '검수 영화' }, seasonNumber: 2, episodeNumber: 7 });
  assert.equal(clipEpisodeLabel(movie), '');
  assert.equal('seasonNumber' in movie, false);
  assert.equal('episodeNumber' in clipWatchState(movie), false);
});

test('숫자 문자열·스페셜 회차는 유지하고 잘못된 회차는 표시하지 않는다', () => {
  assert.equal(clipEpisodeLabel({ content: { media_type: 'tv' }, seasonNumber: '0', episodeNumber: '2' }), '스페셜 · 2화');
  assert.equal(clipEpisodeLabel({ content: { media_type: 'tv' }, seasonNumber: 1, episodeNumber: 0 }), '');
  assert.deepEqual(clipEpisodeDetails({ content: { media_type: 'tv' }, seasonNumber: false, episodeNumber: 2.5 }), { seasonNumber: null, episodeNumber: null, numberOfSeasons: null });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { captureClipPlayback } from './captureClipPlayback.js';
import { initialClipWindow } from './clipTimeline.js';

test('제거된 YouTube iframe의 정지 오류가 클립 편집 진입을 막지 않는다', () => {
  const playback = captureClipPlayback({ getCurrentTime: () => 12, getDuration: () => 43, pauseVideo() { throw new TypeError("Cannot read properties of null (reading 'src')"); } }, { currentTime: 10, duration: 43 });
  assert.deepEqual(playback, { currentTime: 12, duration: 43 });
  const range = initialClipWindow(playback.duration, playback.currentTime);
  assert.ok(range.start <= playback.currentTime && range.end >= playback.currentTime);
  assert.ok(range.end <= playback.duration);
});

test('플레이어 교체 중 시각을 읽지 못하면 마지막 표시값으로 유효한 편집 구간을 만든다', () => {
  const fail = () => { throw new Error('destroyed player'); };
  const playback = captureClipPlayback({ getCurrentTime: fail, getDuration: fail, pauseVideo: fail }, { currentTime: 40, duration: 43 });
  assert.deepEqual(playback, { currentTime: 40, duration: 43 });
  const range = initialClipWindow(playback.duration, playback.currentTime);
  assert.ok(range.start >= 0 && range.end <= 43 && range.end > range.start);
});

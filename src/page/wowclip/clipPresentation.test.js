import test from 'node:test';
import assert from 'node:assert/strict';
import { clipPresentation, PORTRAIT_CROP_WIDTH, cropLeftPercent, sourceLeftPercent, buildClipFeed } from './clipPresentation.js';
import { makeClip } from './wowClipData.js';

test('기존 클립은 가로형으로 열리고 잘못된 자르기 위치는 유효 범위로 제한한다', () => {
  assert.deepEqual(clipPresentation({}), { layout: 'landscape', cropX: 50 });
  assert.deepEqual(clipPresentation({ layout: 'portrait', cropX: -10 }), { layout: 'portrait', cropX: 0 });
  assert.deepEqual(clipPresentation({ layout: 'portrait', cropX: 150 }), { layout: 'portrait', cropX: 100 });
  assert.equal(clipPresentation({ cropX: NaN }).cropX, 50);
});
test('세로 선택창과 결과 영상은 양쪽 끝에서 원본 경계를 정확히 맞춘다', () => {
  assert.equal(cropLeftPercent(0), 0);
  assert.equal(cropLeftPercent(100) + PORTRAIT_CROP_WIDTH * 100, 100);
  assert.equal(sourceLeftPercent(0), -0);
  assert.ok(Math.abs(sourceLeftPercent(100) + (1 / PORTRAIT_CROP_WIDTH - 1) * 100) < 1e-8);
});
test('저장한 세로형과 위치는 원본 작품·구간과 함께 유지한다', () => {
  const clip = makeClip({ content: { id: 1, name: '검수 작품' }, video: { key: 'apJOlU1WB94', name: '원본' }, title: '검수', start: 2, end: 7, visibility: 'public', spoiler: true, owner: { id: 'qa', name: '검수' }, layout: 'portrait', cropX: 73 });
  assert.equal(clip.layout, 'portrait'); assert.equal(clip.cropX, 73); assert.equal(clip.start, 2); assert.equal(clip.end, 7); assert.equal(clip.views, 0); assert.equal(clip.spoiler, true);
});
test('선택한 클립은 피드에서 중복되지 않고 직접 연 링크 전용 클립도 감상할 수 있다', () => {
  const clips = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(buildClipFeed(clips, clips[1]).map((clip) => clip.id), ['a', 'b', 'c']);
  assert.deepEqual(buildClipFeed(clips, { id: 'private' }).map((clip) => clip.id), ['private', 'a', 'b', 'c']);
});

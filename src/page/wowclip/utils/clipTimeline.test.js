import test from 'node:test';
import assert from 'node:assert/strict';
import { initialClipWindow, moveClipRange } from './clipTimeline.js';

test('원본의 현재 시점을 포함한 구간은 시작·끝과 짧은 영상에서도 영상 범위를 넘지 않는다', () => {
  for (const duration of [0.5, 3, 8, 20, 90, 1476]) {
    for (const current of [0, duration / 2, duration, duration + 10]) {
      const window = initialClipWindow(duration, current);
      assert.ok(window.contextStart >= 0);
      assert.ok(window.contextStart <= window.start);
      assert.ok(window.start < window.end);
      assert.ok(window.end <= window.contextEnd);
      assert.ok(window.contextEnd <= duration);
    }
  }
  assert.equal(initialClipWindow(1476, 134).end, 134);
});

test('전체 구간을 양쪽 경계 밖으로 드래그해도 길이와 원본 시각 범위를 보존한다', () => {
  const range = { start: 129, end: 134 };
  for (const target of [-100, 120, 131.3, 200]) {
    const next = moveClipRange(range, 'move', target, 120, 140);
    assert.equal(next.end - next.start, 5);
    assert.ok(next.start >= 120 && next.end <= 140);
  }
});

test('시작·끝 핸들이 교차하지 않으며 1초 미만 원본도 유효한 구간을 유지한다', () => {
  assert.deepEqual(moveClipRange({ start: 129, end: 134 }, 'start', 140, 120, 140), { start: 133, end: 134 });
  assert.deepEqual(moveClipRange({ start: 129, end: 134 }, 'end', 0, 120, 140), { start: 129, end: 130 });
  assert.deepEqual(moveClipRange({ start: 0, end: 0.5 }, 'start', 1, 0, 0.5), { start: 0, end: 0.5 });
});

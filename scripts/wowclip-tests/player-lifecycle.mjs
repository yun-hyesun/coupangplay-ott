import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import renderer from 'react-test-renderer';
import { ClipPlayer } from '../../src/page/wowclip/components/ClipPlayer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = { setInterval, clearInterval };
const clip = { videoKey: 'apJOlU1WB94', start: 2, end: 7, title: '회귀 검수' };
const roots = [];
const player = () => {
  const frame = { isConnected: true };
  const calls = { play: 0, mute: 0 };
  const target = { getIframe: () => frame, getDuration: () => 20, getCurrentTime: () => 2,
    seekTo() {}, pauseVideo() {}, unMute() {}, mute() { calls.mute++; }, playVideo() { calls.play++; } };
  return { frame, calls, target };
};
const mount = async (props = {}) => {
  let root;
  await act(async () => { root = renderer.create(React.createElement(ClipPlayer, { clip, preview: true, ...props })); });
  roots.push(root); return root;
};
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); });

test('교체 중인 iframe은 음소거 효과에서 앱을 중단시키지 않고 새 ready를 기다린다', async () => {
  const first = player(), root = await mount({ muted: false });
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: first.target }));
  first.frame.isConnected = false;
  first.target.mute = () => { throw new TypeError("Cannot read properties of null (reading 'src')"); };
  await act(async () => root.update(React.createElement(ClipPlayer, { clip, preview: true, muted: true })));
  assert.equal(root.root.findAllByType('iframe').length, 1);
  assert.equal(root.root.findAllByProps({ role: 'alert' }).length, 0);
  const second = player();
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: second.target }));
  assert.equal(root.root.findAllByType('iframe').length, 1);
  assert.equal(root.root.findAllByProps({ role: 'alert' }).length, 0);
  assert.equal(second.calls.mute, 1);
});

test('연결된 플레이어의 API가 예외를 던져도 앱 대신 재시도 안내를 표시한다', async () => {
  const current = player(), root = await mount({ muted: false });
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: current.target }));
  current.target.mute = () => { throw new TypeError("Cannot read properties of null (reading 'src')"); };
  await act(async () => root.update(React.createElement(ClipPlayer, { clip, preview: true, muted: true })));
  assert.equal(root.root.findAllByType('iframe').length, 0);
  assert.match(root.root.findByProps({ role: 'alert' }).children[0], /재생을 다시/);
  await act(async () => root.root.findByProps({ 'aria-label': '선택 구간 미리보기' }).props.onClick());
  const retry = player();
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: retry.target }));
  assert.equal(retry.calls.play, 1);
  assert.equal(root.root.findAllByProps({ role: 'alert' }).length, 0);
});

test('이전 플레이어의 늦은 ready·재생 이벤트는 새 플레이어와 조회 집계를 바꾸지 않는다', async () => {
  const current = player(), old = player(); let firstPlays = 0;
  const root = await mount({ onFirstPlay: () => { firstPlays++; } });
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: current.target }));
  old.frame.isConnected = false;
  await act(async () => {
    globalThis.__wowPlayerProps.onReady({ target: old.target });
    globalThis.__wowPlayerProps.onStateChange({ target: old.target, data: 1 });
  });
  assert.equal(firstPlays, 0);
  await act(async () => root.root.findByProps({ 'aria-label': '선택 구간 미리보기' }).props.onClick());
  assert.equal(current.calls.play, 1); assert.equal(old.calls.play, 0);
});

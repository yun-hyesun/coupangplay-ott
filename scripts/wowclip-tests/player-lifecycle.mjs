import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import renderer from 'react-test-renderer';
import { ClipPlayer } from '../../src/page/wowclip/components/ClipPlayer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = { setInterval, clearInterval, setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args) };
const clip = { videoKey: 'apJOlU1WB94', start: 2, end: 7, title: '회귀 검수' };
const roots = [];
const player = () => {
  const frame = { isConnected: true };
  const calls = { play: 0, pause: 0, mute: 0 };
  const target = { getIframe: () => frame, getDuration: () => 20, getCurrentTime: () => 2,
    seekTo() {}, pauseVideo() { calls.pause++; }, unMute() {}, mute() { calls.mute++; }, playVideo() { calls.play++; } };
  return { frame, calls, target };
};
const mount = async (props = {}, strict = false) => {
  let root;
  const element = React.createElement(ClipPlayer, { clip, preview: true, ...props });
  await act(async () => { root = renderer.create(strict ? React.createElement(React.StrictMode, null, element) : element); });
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

test('StrictMode에서도 준비 전에 누른 미리보기 요청을 보관해 ready 이후 재생한다', async () => {
  const current = player(), root = await mount({}, true);
  assert.equal(root.root.findAllByProps({ role: 'status' }).length, 1);
  await act(async () => root.root.findByProps({ 'aria-label': '선택 구간 미리보기' }).props.onClick());
  assert.equal(current.calls.play, 0);
  await act(async () => globalThis.__wowPlayerProps.onReady({ target: current.target }));
  assert.equal(current.calls.play, 1);
  assert.equal(root.root.findAllByProps({ role: 'status' }).length, 0);
});

test('준비가 끝나지 않으면 재시도할 수 있고 이전 시도의 이벤트가 새 재생을 끊지 않는다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let firstPlays = 0;
  const root = await mount({ preview: false, autoPlay: true, compact: true, onFirstPlay: () => { firstPlays++; } });
  const abandoned = globalThis.__wowPlayerProps;
  assert.equal(root.root.findByType('input').props.disabled, true);
  assert.equal(root.root.findAllByProps({ className: 'wowclip-player-poster' }).length, 0);
  await act(async () => t.mock.timers.tick(15000));
  assert.equal(root.root.findAllByType('iframe').length, 0);
  assert.match(root.root.findByProps({ role: 'alert' }).children[0], /재생을 다시/);
  assert.equal(root.root.findAllByProps({ className: 'wowclip-player-poster' }).length, 1);
  await act(async () => root.root.findByProps({ 'aria-label': '클립 재생' }).props.onClick());
  assert.equal(root.root.findAllByProps({ className: 'wowclip-player-poster' }).length, 0);
  const retry = player(), old = player();
  await act(async () => {
    globalThis.__wowPlayerProps.onReady({ target: retry.target });
    globalThis.__wowPlayerProps.onStateChange({ target: retry.target, data: 1 });
  });
  assert.equal(retry.calls.play, 1);
  assert.equal(firstPlays, 1);
  assert.equal(root.root.findByType('input').props.disabled, false);
  await act(async () => {
    abandoned.onReady({ target: old.target });
    abandoned.onError({ target: old.target });
    abandoned.onStateChange({ target: old.target, data: 1 });
    t.mock.timers.tick(15000);
  });
  assert.equal(root.root.findAllByType('iframe').length, 1);
  assert.equal(root.root.findAllByProps({ role: 'alert' }).length, 0);
  assert.equal(root.root.findByProps({ 'data-playing': true }).props['data-position'], '2.00');
  assert.equal(firstPlays, 1);
  assert.equal(old.calls.play, 0);
});

test('준비 중 감상을 나가면 대기 타이머와 늦은 ready가 재생·콜백을 실행하지 않는다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let durations = 0;
  const current = player(), root = await mount({ onDuration: () => { durations++; } });
  const abandoned = globalThis.__wowPlayerProps;
  await act(async () => root.unmount());
  roots.splice(roots.indexOf(root), 1);
  await act(async () => {
    t.mock.timers.tick(15000);
    abandoned.onReady({ target: current.target });
    abandoned.onError({ target: current.target });
  });
  assert.equal(durations, 0);
  assert.equal(current.calls.play, 0);
});

test('감상 화면의 재생 토글과 소리 조작은 서로의 동작을 중복 실행하지 않는다', async () => {
  const current = player(), root = await mount({ preview: false, compact: true, autoPlay: true });
  await act(async () => {
    globalThis.__wowPlayerProps.onReady({ target: current.target });
    globalThis.__wowPlayerProps.onStateChange({ target: current.target, data: 1 });
  });
  await act(async () => root.root.findByProps({ 'aria-label': '일시정지' }).props.onClick());
  assert.equal(current.calls.pause, 1);
  await act(async () => globalThis.__wowPlayerProps.onStateChange({ target: current.target, data: 2 }));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 재생' }).props.onClick());
  assert.equal(current.calls.play, 2);
  await act(async () => root.root.findByProps({ 'aria-label': '소리 켜기' }).props.onClick());
  assert.equal(current.calls.pause, 1);
  assert.equal(current.calls.play, 2);
});

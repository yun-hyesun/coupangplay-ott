// 별도 검수 런타임의 ui-test-loader.mjs로 JSX·스타일을 처리합니다.
// 브라우저·영상 재생 검수가 아닌 실제 컴포넌트 상태/콜백 검수입니다.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import renderer from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const events = new EventTarget();
globalThis.window = { addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args), setTimeout, clearTimeout, scrollTo() {} };
globalThis.localStorage = { getItem: () => null };
globalThis.__wowUiService = { subscribe: (_options, onData) => { queueMicrotask(() => onData([])); return () => {}; }, saveClip: async () => {}, subscribeDetails: () => () => {} };
const { useAuthStore } = await import('../../src/store/useAuthStore.js');
const { FullVideoClipButton } = await import('../../src/page/wowclip/components/FullVideoClipButton.jsx');
const { ClipEditor } = await import('../../src/page/wowclip/components/ClipEditor.jsx');
const { ClipComments } = await import('../../src/page/wowclip/components/ClipComments.jsx');
const { useWowClipLibrary } = await import('../../src/page/wowclip/hooks/useWowClipLibrary.js');
const roots = [];
const mount = async (element) => { let root; await act(async () => { root = renderer.create(element); }); roots.push(root); return root; };
const h = React.createElement;
const owner = { id: 'alice:default', name: 'alice', avatar: '/images/profile.svg' };
const source = { fullVideo: true, content: { id: 78648, media_type: 'tv', name: '검수 작품' }, videoKey: 'apJOlU1WB94', duration: 20, currentTime: 6 };
const Path = () => h('output', { 'aria-label': '현재 경로' }, useLocation().pathname);
const withRoutes = (element) => h(MemoryRouter, { initialEntries: ['/watch/tv/78648'] }, h(Path), h(Routes, null,
  h(Route, { path: '/watch/tv/78648', element }), h(Route, { path: '/login', element: h('h1', null, '로그인') }), h(Route, { path: '/wowclip', element: h('h1', null, '감상') })));
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); });

test('비로그인 제작 클릭은 원본/편집을 열지 않고 로그인으로 이동한다', async () => {
  useAuthStore.setState({ user: null, loading: false });
  let reads = 0;
  const root = await mount(withRoutes(h(FullVideoClipButton, { getSource: () => { reads++; return source; } })));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  assert.equal(reads, 0);
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/login');
  const direct = await mount(h(ClipEditor, { owner, source, onClose() {}, onSave() {} }));
  assert.equal(direct.toJSON(), null);
});

test('인증 확인 중에는 제작 버튼을 잠그고 로그아웃하면 열린 편집도 닫힌다', async () => {
  useAuthStore.setState({ user: null, loading: true });
  const root = await mount(withRoutes(h(FullVideoClipButton, { getSource: () => source })));
  assert.equal(root.root.findByProps({ 'aria-label': '클립 만들기' }).props.disabled, true);
  await act(async () => useAuthStore.setState({ user: { uid: 'alice' }, loading: false }));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  assert.equal(root.root.findAllByProps({ 'aria-label': '클립 만들기' }).length >= 2, true);
  await act(async () => useAuthStore.setState({ user: null, loading: false }));
  assert.equal(root.root.findAllByType('section').length, 0);
});

test('클립 저장 실패는 감상으로 이동하지 않고 성공한 뒤에만 이동한다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  let rejectSave, resolveSave;
  globalThis.__wowUiService.saveClip = () => new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; });
  const root = await mount(withRoutes(h(FullVideoClipButton, { getSource: () => source })));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  let pending;
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/watch/tv/78648');
  await act(async () => { rejectSave(new Error('검수 저장 실패')); await pending; });
  assert.equal(root.root.findByProps({ role: 'alert' }).children[0], '검수 저장 실패');
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/watch/tv/78648');
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => { resolveSave(); await pending; });
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/wowclip');
});

test('댓글 중복 전송을 막고 실패하면 입력을 보존하며 답글 성공 후 일반 입력으로 복귀한다', async () => {
  const clip = { id: 'qa', comments: [{ id: 'root', text: '원댓글', author: 'bob', likes: [], createdAt: new Date().toISOString() }] };
  let requests = 0, resolveAdd, rejectAdd;
  const onAdd = () => { requests++; return new Promise((resolve, reject) => { resolveAdd = resolve; rejectAdd = reject; }); };
  const root = await mount(h(ClipComments, { clip, owner, onAdd, onLike() {}, notify() {}, panel: true }));
  await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: '실패해도 보존' } }));
  let pending;
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(requests, 1); assert.equal(root.root.findByType('textarea').props.readOnly, true);
  await act(async () => { rejectAdd(new Error('댓글 저장 실패')); await pending; });
  assert.equal(root.root.findByType('textarea').props.value, '실패해도 보존');
  await act(async () => root.root.findAllByType('button').find((button) => button.children[0] === '답글').props.onClick());
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => { resolveAdd(); await pending; });
  assert.equal(root.root.findByType('textarea').props.value, '');
  assert.equal(root.root.findByType('label').children[0], '댓글 남기기');
});

test('클립 이동 오류와 로그아웃 뒤 이전 댓글·계정 데이터가 다음 화면에 섞이지 않는다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  const lists = [], details = [];
  globalThis.__wowUiService.subscribe = (options, data, error) => { const item = { options, data, error, stopped: false }; lists.push(item); return () => { item.stopped = true; }; };
  globalThis.__wowUiService.subscribeDetails = (id, uid, data, error) => { const item = { id, uid, data, error }; details.push(item); return () => {}; };
  let library;
  const Harness = ({ id }) => { library = useWowClipLibrary({ selectedId: id }); return null; };
  const root = await mount(h(Harness, { id: 'a' }));
  await act(async () => lists.at(-1).data([{ id: 'a', comments: [], likes: [], authorUid: 'alice' }]));
  await act(async () => details.at(-1).data({ id: 'a', comments: [{ id: 'private-comment' }], liked: true }));
  assert.equal(library.clips[0].comments[0].id, 'private-comment');
  await act(async () => root.update(h(Harness, { id: 'b' })));
  await act(async () => lists.at(-1).data([{ id: 'b', comments: [], likes: [] }]));
  await act(async () => details.at(-1).error({ code: 'permission-denied' }));
  assert.equal(library.clips[0].id, 'b'); assert.deepEqual(library.clips[0].comments, []);
  const stale = lists.at(-1);
  await act(async () => useAuthStore.setState({ user: null, loading: false }));
  assert.equal(stale.stopped, true); assert.equal(library.loading, true); assert.deepEqual(library.clips, []);
  await act(async () => stale.data([{ id: 'alice-private', comments: [] }]));
  assert.deepEqual(library.clips, []);
});

// 별도 검수 런타임의 ui-test-loader.mjs로 JSX·스타일을 처리합니다.
// 브라우저·영상 재생 검수가 아닌 실제 컴포넌트 상태/콜백 검수입니다.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import renderer from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const events = new EventTarget();
globalThis.window = { addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args), setTimeout, clearTimeout, scrollTo() {} };
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.localStorage = { getItem: () => null };
globalThis.__wowUiService = { subscribe: (_options, onData) => { queueMicrotask(() => onData([])); return () => {}; }, saveClip: async () => {}, subscribeDetails: () => () => {} };
const { useAuthStore } = await import('../../src/store/useAuthStore.js');
const { useProfileStore } = await import('../../src/store/useProfileStore.js');
const { useWatchHistoryStore } = await import('../../src/store/useWatchHistoryStore.js');
const { WowClip } = await import('../../src/page/wowclip/WowClip.jsx');
const { MyWowClip } = await import('../../src/page/my/MyWowClip.jsx');
const { FullVideoClipButton } = await import('../../src/page/wowclip/components/FullVideoClipButton.jsx');
const { ClipEditor } = await import('../../src/page/wowclip/components/ClipEditor.jsx');
const { ClipComments } = await import('../../src/page/wowclip/components/ClipComments.jsx');
const { ClipFeed } = await import('../../src/page/wowclip/components/ClipFeed.jsx');
const { ClipPlayer } = await import('../../src/page/wowclip/components/ClipPlayer.jsx');
const { useWowClipLibrary } = await import('../../src/page/wowclip/hooks/useWowClipLibrary.js');
const roots = [];
const mount = async (element, options) => { let root; await act(async () => { root = renderer.create(element, options); }); roots.push(root); return root; };
const h = React.createElement;
const owner = { id: 'alice:default', name: 'alice', avatar: '/images/profile.svg' };
const source = { fullVideo: true, content: { id: 78648, media_type: 'tv', name: '검수 작품' }, videoKey: 'apJOlU1WB94', duration: 20, currentTime: 6 };
const Path = () => h('output', { 'aria-label': '현재 경로' }, useLocation().pathname);
const withRoutes = (element) => h(MemoryRouter, { initialEntries: ['/watch/tv/78648'] }, h(Path), h(Routes, null,
  h(Route, { path: '/watch/tv/78648', element }), h(Route, { path: '/login', element: h('h1', null, '로그인') }), h(Route, { path: '/wowclip', element: h('h1', null, '감상') })));
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); });

test('댓글 작성·수정에 300자 제한을 적용하고 작성자만 수정·삭제할 수 있다', async () => {
  const own = { id: 'mine', authorUid: 'alice', author: 'alice', text: `내 댓글 ${'한'.repeat(300)}`, likeCount: 1 };
  const reply = { id: 'reply', parentId: own.id, authorUid: 'bob', author: 'bob', text: '남겨진 답글' };
  let clip = { id: 'test', comments: [own, reply], commentCount: 2 };
  const calls = [];
  const view = () => h(ClipComments, {
    clip, owner, userUid: 'alice', panel: true,
    onAdd: async (_id, text) => { calls.push(['add', text]); },
    onEdit: async (id, commentId, text) => { calls.push(['edit', id, commentId, text]); },
    onRemove: async (id, commentId) => { calls.push(['remove', id, commentId]); },
  });
  const root = await mount(view());
  const button = (label) => root.root.findAllByType('button').find((node) => node.children[0] === label);
  const enter = { preventDefault() {} };
  const type = async (field, value) => act(async () => field.props.onChange({ target: { value } }));
  await type(root.root.findByType('textarea'), '한'.repeat(301));
  assert.equal(root.root.findByType('textarea').props['aria-invalid'], true);
  await act(async () => root.root.findByType('form').props.onSubmit(enter));
  assert.deepEqual(calls, []);
  const limit = '😀'.repeat(300);
  await type(root.root.findByType('textarea'), limit);
  await act(async () => root.root.findByType('form').props.onSubmit(enter));
  assert.deepEqual(calls, [['add', limit]]);

  await act(async () => root.root.findAllByType('button').find((node) => node.props.className === 'wowclip-replies-toggle').props.onClick());
  const ownMenu = () => {
    const trigger = root.root.findByProps({ 'aria-label': '댓글 더보기' });
    const menu = root.root.findByProps({ id: trigger.props.popoverTarget });
    assert.equal(menu.props.popover, 'auto');
    assert.equal(root.root.findAllByProps({ 'aria-label': '답글 더보기' }).length, 0);
    return menu;
  };
  const menuAction = (label) => ownMenu().findAllByType('button').find((node) => node.children[0] === label);
  await act(async () => menuAction('수정').props.onClick());
  const edit = root.root.findByProps({ className: 'wowclip-comment-form wowclip-comment-form--edit' });
  assert.equal(edit.findByType('textarea').props.value, own.text);
  assert.equal(edit.findByType('textarea').props['aria-invalid'], true);
  await type(edit.findByType('textarea'), '새 내용');
  await act(async () => edit.props.onSubmit(enter));
  assert.deepEqual(calls.at(-1), ['edit', clip.id, own.id, '새 내용']);

  await act(async () => menuAction('삭제').props.onClick());
  const modal = root.root.findByProps({ 'aria-label': '댓글을 삭제할까요?' });
  await act(async () => modal.findAllByType('button').find((node) => node.children[0] === '삭제').props.onClick());
  assert.deepEqual(calls.at(-1), ['remove', clip.id, own.id]);
  clip = { ...clip, comments: [{ ...own, text: '', deleted: true }, reply], commentCount: 1 };
  await act(async () => root.update(view()));
  const body = JSON.stringify(root.toJSON());
  assert.match(body, /삭제된 댓글이에요/);
  assert.match(body, /남겨진 답글/);
  assert.doesNotMatch(body, /내 댓글/);
  assert.equal(button('삭제'), undefined);
});

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

test('인증 확인 중에는 제작을 잠그고 로그아웃한 편집은 다시 로그인해도 자동으로 열리지 않는다', async () => {
  useAuthStore.setState({ user: null, loading: true });
  const root = await mount(withRoutes(h(FullVideoClipButton, { getSource: () => source })));
  assert.equal(root.root.findByProps({ 'aria-label': '클립 만들기' }).props.disabled, true);
  await act(async () => useAuthStore.setState({ user: { uid: 'alice' }, loading: false }));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  assert.equal(root.root.findAllByProps({ 'aria-label': '클립 만들기' }).length >= 2, true);
  await act(async () => useAuthStore.setState({ user: null, loading: false }));
  assert.equal(root.root.findAllByType('section').length, 0);
  await act(async () => useAuthStore.setState({ user: { uid: 'alice' }, loading: false }));
  assert.equal(root.root.findAllByType('section').length, 0);
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  assert.equal(root.root.findAllByType('section').length, 1);
  await act(async () => useAuthStore.setState({ user: { uid: 'bob' }, loading: false }));
  assert.equal(root.root.findAllByType('section').length, 0);
});

test('직접 조절한 세로 위치·공유 방식을 저장하고 실패 시 편집 값을 유지해 다시 저장한다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  let rejectSave, resolveSave;
  const savedClips = [];
  globalThis.__wowUiService.saveClip = (clip) => { savedClips.push(clip); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); };
  const root = await mount(withRoutes(h(FullVideoClipButton, { getSource: () => source })));
  await act(async () => root.root.findByProps({ 'aria-label': '클립 만들기' }).props.onClick());
  assert.equal(root.root.findByProps({ type: 'radio', value: 'public' }).props.checked, true);
  await act(async () => root.root.findByProps({ type: 'radio', value: 'portrait' }).props.onChange());
  await act(async () => root.root.findByProps({ 'aria-label': '세로 화면 위치' }).props.onKeyDown({ key: 'ArrowRight', shiftKey: true, preventDefault() {} }));
  await act(async () => root.root.findByProps({ type: 'radio', value: 'link' }).props.onChange());
  await act(async () => root.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } }));
  let pending;
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(savedClips[0].layout, 'portrait');
  assert.equal(savedClips[0].cropX, 60);
  assert.equal(savedClips[0].visibility, 'link');
  assert.equal(savedClips[0].spoiler, true);
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/watch/tv/78648');
  await act(async () => { rejectSave(new Error('검수 저장 실패')); await pending; });
  assert.equal(root.root.findByProps({ role: 'alert' }).children[0], '검수 저장 실패');
  assert.equal(root.root.findByProps({ 'aria-label': '현재 경로' }).children[0], '/watch/tv/78648');
  assert.equal(root.root.findByProps({ 'aria-label': '세로 화면 위치' }).props['aria-valuenow'], 60);
  await act(async () => root.root.findByProps({ 'aria-label': '세로 화면 위치' }).props.onKeyDown({ key: 'ArrowLeft', shiftKey: true, preventDefault() {} }));
  await act(async () => { pending = root.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => { resolveSave(); await pending; });
  assert.equal(savedClips[1].cropX, 50);
  assert.equal(savedClips[1].visibility, 'link');
  assert.equal(savedClips[1].spoiler, true);
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

test('댓글 공감 수는 서버 집계를 우선하고 예전 댓글은 공감 목록으로 표시한다', async () => {
  const clip = { id: 'qa', comments: [
    { id: 'cloud', text: '서버 댓글', author: 'bob', likeCount: 3, likes: [] },
    { id: 'legacy', text: '예전 댓글', author: 'bob', likes: ['alice', 'carol'] },
  ] };
  const root = await mount(h(ClipComments, { clip, owner, panel: true }));
  for (const count of [3, 2]) {
    const button = root.root.findByProps({ 'aria-label': `댓글 공감 ${count}` });
    assert.equal(button.findByProps({ className: 'wowclip-comment-like-count' }).children[0], String(count));
  }
});

test('감상 댓글 패널에 조회 상태를 전달하고 다시 불러올 수 있다', async () => {
  const clip = { id: 'qa', title: '검수 클립', content: source.content, comments: [], likes: [] };
  let refreshes = 0;
  const props = { clips: [clip], selectedId: clip.id, owner, isProtected: () => false, onRefresh: () => { refreshes++; } };
  const renderFeed = (state) => withRoutes(h(ClipFeed, { ...props, ...state }));
  const root = await mount(renderFeed({ commentsLoading: true }), { createNodeMock: () => ({ children: [] }) });

  await act(async () => root.root.findByProps({ 'aria-label': '댓글 0' }).props.onClick());
  assert.equal(root.root.findByProps({ role: 'status' }).children[0], '댓글을 불러오고 있어요.');

  const error = '댓글을 불러오지 못했어요.';
  await act(async () => root.update(renderFeed({ commentsError: error })));
  assert.equal(root.root.findByProps({ role: 'alert' }).children[0], error);
  assert.equal(root.root.findAllByProps({ className: 'wowclip-comments-empty' }).length, 0);
  await act(async () => root.root.findByProps({ 'aria-label': '댓글 새로고침' }).props.onClick());
  assert.equal(refreshes, 1);
});

const protectedFixture = {
  id: 'protected', title: '장면 결말', content: { ...source.content, backdrop_path: '/safe.jpg' },
  seasonNumber: 2, episodeNumber: 7, videoKey: source.videoKey, ownerId: owner.id,
  author: owner.name, authorUid: 'alice', spoiler: true, visibility: 'public', views: 0,
  start: 2, end: 7, createdAt: '2026-11-01T00:00:00Z', likes: [], comments: [],
};
const seedSpoilerLibrary = (clip) => {
  globalThis.__wowUiService.subscribe = (_options, data) => { queueMicrotask(() => data([clip])); return () => {}; };
  globalThis.__wowUiService.subscribeDetails = (id, _uid, data) => {
    queueMicrotask(() => data({ id, liked: false, comments: [{ id: 'secret', text: '댓글 결말', author: 'bob', likes: [] }] }));
    return () => {};
  };
};
const withClipRoute = () => h(MemoryRouter, { initialEntries: ['/wowclip?clip=protected'] }, h(WowClip));
const feedNodes = { createNodeMock: () => ({ children: [] }) };
const revealButton = (root) => root.root.findAllByType('button').find((button) => button.children[0] === '스포일러 열고 보기');
const fullVideoLinks = (root) => root.root.findAllByType('a').filter((link) => link.props.className === 'wowclip-feed-source');

test('와우 클립은 현재 프로필의 같은 회차 기록만 인정하고 보호 중 영상·제목·댓글·풀영상 링크를 가린다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  useProfileStore.setState({ currentProfile: { id: 'default' } });
  const priorHistory = useWatchHistoryStore.getState();
  const record = { id: String(source.content.id), media_type: 'tv', seasonNumber: 2, episodeNumber: 7, position: 3 };
  useWatchHistoryStore.setState({ ownerKey: 'alice_default', history: [{ ...record, episodeNumber: 6 }], loading: false, onLoadHistory: async () => [] });
  seedSpoilerLibrary(protectedFixture);
  try {
    const root = await mount(withClipRoute(), feedNodes);
    assert.ok(revealButton(root));
    assert.equal(root.root.findByType('h2').children[0], '검수 작품에서 오린 장면');
    assert.equal(root.root.findAllByType(ClipPlayer).length, 0);
    assert.equal(fullVideoLinks(root).length, 0);
    await act(async () => root.root.findByProps({ 'aria-label': '댓글 1' }).props.onClick());
    assert.equal(root.root.findAllByType(ClipComments).length, 0);

    await act(async () => useWatchHistoryStore.setState({ history: [record] }));
    assert.equal(revealButton(root), undefined);
    assert.equal(root.root.findAllByType(ClipPlayer).length, 1);
    assert.equal(fullVideoLinks(root).length, 1);
    assert.equal(root.root.findAllByType(ClipComments).length, 1);
    assert.ok(JSON.stringify(root.toJSON()).includes(protectedFixture.title));

    await act(async () => useProfileStore.setState({ currentProfile: { id: 'second' } }));
    assert.ok(revealButton(root));
    assert.equal(root.root.findAllByType(ClipPlayer).length, 0);
    await act(async () => revealButton(root).props.onClick());
    assert.equal(root.root.findAllByType(ClipPlayer).length, 1);
    await act(async () => useProfileStore.setState({ currentProfile: { id: 'third' } }));
    assert.ok(revealButton(root));
    assert.equal(root.root.findAllByType(ClipPlayer).length, 0);
  } finally { await act(async () => useWatchHistoryStore.setState(priorHistory)); }
});

test('클립 재생 기록은 현재 프로필에만 적용하고 이전 프로필의 늦은 재생·조회는 무시한다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  useProfileStore.setState({ currentProfile: { id: 'first' } });
  seedSpoilerLibrary({ ...protectedFixture, views: 3 });
  const subscriptions = [], plays = [];
  globalThis.__wowUiService.subscribeRecordedView = (id, uid, profileId, data) => {
    const item = { id, uid, profileId, data, stopped: false };
    subscriptions.push(item);
    return () => { item.stopped = true; };
  };
  globalThis.__wowUiService.recordView = async (...args) => { plays.push(args); };
  const root = await mount(withClipRoute(), feedNodes);
  assert.ok(revealButton(root));

  const first = subscriptions.at(-1);
  assert.deepEqual([first.id, first.uid, first.profileId], ['protected', 'alice', 'first']);
  await act(async () => first.data(true));
  assert.equal(revealButton(root), undefined);
  const firstPlay = root.root.findByType(ClipPlayer).props.onFirstPlay;
  await act(async () => firstPlay());
  assert.deepEqual(plays, [['protected', 'alice', 'first']]);

  await act(async () => useProfileStore.setState({ currentProfile: { id: 'second' } }));
  assert.ok(first.stopped);
  await act(async () => first.data(true));
  await act(async () => { assert.equal(await firstPlay(), false); });
  assert.equal(plays.length, 1);
  assert.ok(revealButton(root));
  assert.equal(root.root.findAllByType(ClipPlayer).length, 0);

  const second = subscriptions.at(-1);
  assert.deepEqual([second.id, second.uid, second.profileId], ['protected', 'alice', 'second']);
  await act(async () => second.data(true));
  assert.equal(revealButton(root), undefined);
  await act(async () => root.root.findByType(ClipPlayer).props.onFirstPlay());
  assert.deepEqual(plays.at(-1), ['protected', 'alice', 'second']);

  await act(async () => useAuthStore.setState({ user: { uid: 'bob' } }));
  await act(async () => second.data(true));
  assert.ok(revealButton(root));
  await act(async () => useAuthStore.setState({ user: null }));
  assert.ok(revealButton(root));
  assert.equal(root.root.findAllByType(ClipPlayer).length, 0);
  assert.ok(subscriptions.every((item) => item.stopped));
});

test('일시적으로 실패한 클립 기록 조회는 같은 화면에서 다시 열거나 연결이 돌아오면 재시도한다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  useProfileStore.setState({ currentProfile: { id: 'default' } });
  seedSpoilerLibrary({ ...protectedFixture, views: 3 });
  let requests = 0;
  let rejectRetry;
  let reconnected = false;
  globalThis.__wowUiService.subscribeRecordedView = (_id, _uid, _profileId, data, error) => {
    requests++;
    if (requests === 1) queueMicrotask(() => error(new Error('일시적 연결 실패')));
    else if (reconnected) queueMicrotask(() => data(true));
    else rejectRetry = error;
    return () => {};
  };

  const root = await mount(withClipRoute(), feedNodes);
  assert.equal(requests, 1);
  assert.ok(revealButton(root));
  await act(async () => root.root.findByProps({ className: 'wowclip-back' }).props.onClick());
  const beforeOpen = requests;
  await act(async () => root.root.findAllByType('button').find((button) =>
    button.props.className?.includes('wowclip-card--short')).props.onClick());
  assert.equal(requests, beforeOpen + 1);
  assert.ok(revealButton(root));

  const beforeReconnect = requests;
  reconnected = true;
  await act(async () => events.dispatchEvent(new Event('online')));
  await act(async () => rejectRetry(new Error('이전 요청의 늦은 실패')));
  assert.equal(requests, beforeReconnect + 1);
  assert.equal(revealButton(root), undefined);
  assert.equal(root.root.findAllByType(ClipPlayer).length, 1);
});

test('실패한 본편 기록은 같은 화면에서 클립을 다시 열거나 재연결하면 확인한다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  useProfileStore.setState({ currentProfile: { id: 'default' } });
  seedSpoilerLibrary(protectedFixture);
  const previous = useWatchHistoryStore.getState();
  const history = [{ ...source.content, seasonNumber: 2, episodeNumber: 7 }];
  let loads = 0;
  useWatchHistoryStore.setState({ ownerKey: null, history: [], error: null, onLoadHistory: async () => {
    if (++loads < 3) {
      useWatchHistoryStore.setState({ error: '연결 실패' });
      return [];
    }
    useWatchHistoryStore.setState({ ownerKey: 'alice_default', history, error: null });
    return history;
  } });

  try {
    const root = await mount(withClipRoute(), feedNodes);
    assert.equal(loads, 1);
    assert.ok(revealButton(root));
    await act(async () => root.root.findByProps({ className: 'wowclip-back' }).props.onClick());
    await act(async () => root.root.findAllByType('button').find((button) =>
      button.props.className?.includes('wowclip-card--short')).props.onClick());
    assert.equal(loads, 2);
    assert.ok(revealButton(root));
    await act(async () => events.dispatchEvent(new Event('online')));
    assert.equal(loads, 3);
    assert.equal(revealButton(root), undefined);
    assert.equal(root.root.findAllByType(ClipPlayer).length, 1);
  } finally { await act(async () => useWatchHistoryStore.setState(previous)); }
});

test('마이페이지는 보호된 실제 제목과 장면 이미지를 숨기고 자기 시청내역이 확인되면 보여준다', async () => {
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  useProfileStore.setState({ currentProfile: { id: 'default' } });
  const { seasonNumber, episodeNumber } = protectedFixture;
  const history = [{ ...protectedFixture.content, seasonNumber, episodeNumber }];
  useWatchHistoryStore.setState({ ownerKey: 'alice_other', history });
  seedSpoilerLibrary(protectedFixture);
  const root = await mount(h(MemoryRouter, null, h(MyWowClip)));
  const thumbnail = () => root.root.findByProps({ className: 'my-wowclip-thumbnail' }).findByType('img').props.src;
  assert.equal(root.root.findByType('h3').children[0], '검수 작품에서 오린 장면');
  assert.match(thumbnail(), /safe\.jpg$/);
  await act(async () => useWatchHistoryStore.setState({ ownerKey: 'alice_default' }));
  assert.equal(root.root.findByType('h3').children[0], protectedFixture.title);
  assert.match(thumbnail(), /i\.ytimg\.com/);
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

test('보존된 상세 화면도 클립·계정이 바뀌면 댓글·답글·스포일러 상태를 초기화하고 늦은 구독을 무시한다', async () => {
  const { WowClipDetail } = await import('../../src/page/wowclip/pages/WowClipDetail.jsx');
  useAuthStore.setState({ user: { uid: 'alice' }, loading: false });
  const subscriptions = [];
  globalThis.__wowLegacyComments = { subscribe: (id, data, error) => {
    const item = { id, data, error, stopped: false };
    subscriptions.push(item);
    return () => { item.stopped = true; };
  } };
  let navigate;
  const DetailRoute = () => { navigate = useNavigate(); return h(WowClipDetail); };
  const root = await mount(h(MemoryRouter, { initialEntries: ['/wowclip/sample-office'] },
    h(Routes, null, h(Route, { path: '/wowclip/:clipId', element: h(DetailRoute) }))));
  const first = subscriptions.at(-1);
  await act(async () => first.data([{ id: 'first-comment', body: '이전 클립 댓글', authorName: 'bob' }]));
  await act(async () => root.root.findAllByType('button').find(button => button.children[0] === '스포일러 보기').props.onClick());
  await act(async () => root.root.findAllByType('button').find(button => button.children[0] === '답글').props.onClick());
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__reply' }).length, 1);
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__spoiler' }).length, 0);
  await act(async () => navigate('/wowclip/sample-hidden'));
  assert.equal(first.stopped, true);
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__reply' }).length, 0);
  assert.equal(root.root.findByType('textarea').props.value, '');
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__spoiler' }).length, 1);
  await act(async () => { first.data([{ id: 'stale', body: '늦은 댓글' }]); first.error(new Error('늦은 오류')); });
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__comment' }).length, 0);
  assert.equal(root.root.findAllByProps({ role: 'alert' }).length, 0);
  const second = subscriptions.at(-1);
  await act(async () => second.data([{ id: 'second-comment', body: '새 댓글', authorName: 'bob' }]));
  await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: '다른 계정에 남기지 않기' } }));
  await act(async () => useAuthStore.setState({ user: { uid: 'bob' }, loading: false }));
  assert.equal(second.stopped, true);
  assert.equal(root.root.findByType('textarea').props.value, '');
  assert.equal(root.root.findAllByProps({ className: 'wowclip-detail__comment' }).length, 0);
});

// 실행: WOWCLIP_TEST_RUNTIME의 별도 Firebase 테스트 런타임과 에뮬레이터가 필요합니다.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { createWowClipRepository } from '../../src/page/wowclip/data/wowClipRepository.js';
import { createSeriesHistoryWriter } from '../../src/data/seriesHistoryWriter.js';
import { makeClip } from '../../src/page/wowclip/utils/wowClipData.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.WOWCLIP_TEST_RUNTIME) throw new Error('이 검수는 에뮬레이터에서만 실행할 수 있습니다.');
const runtimeRequire = createRequire(pathToFileURL(process.env.WOWCLIP_TEST_RUNTIME + '/package.json'));
const { initializeTestEnvironment, assertFails } = runtimeRequire('@firebase/rules-unit-testing');
const projectId = 'demo-wowclip-test', apps = [];
let environment;
const clients = new Map();
const client = (uid, rulesDisabled = false) => {
  const key = uid + (rulesDisabled ? '-admin' : '');
  if (clients.has(key)) return clients.get(key);
  const app = initializeApp({ projectId }, 'wow-' + (key || 'guest'));
  apps.push(app);
  const database = getFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(database, host, Number(port), rulesDisabled ? { mockUserToken: 'owner' } : uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
  const result = { database, repo: createWowClipRepository({ database, currentUser: () => uid ? { uid, displayName: uid } : null }) };
  clients.set(key, result); return result;
};
const newClip = (id, visibility = 'public') => ({ ...makeClip({ content: { id: 78648, name: '검수 작품', media_type: 'tv', number_of_seasons: 3 }, video: { key: 'apJOlU1WB94', name: '원본' }, title: '에뮬레이터 검수', start: 2, end: 7, visibility, spoiler: false, owner: { id: 'alice:default', name: 'alice', avatar: '/images/profile.svg' }, seasonNumber: 2, episodeNumber: 7 }), id });
const once = (subscribe, predicate) => new Promise((resolve, reject) => {
  let stop = () => {};
  const timer = setTimeout(() => { stop(); reject(new Error('실시간 구독 시간 초과')); }, 10000);
  stop = subscribe((data) => { if (predicate(data)) { clearTimeout(timer); stop(); resolve(data); } }, (failure) => { clearTimeout(timer); stop(); reject(failure); });
});
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: await readFile(new URL('../../src/firebase/wowclip.rules', import.meta.url), 'utf8') } });
  await environment.clearFirestore();
});
after(async () => { await Promise.all(apps.map(deleteApp)); await environment?.cleanup(); });

test('오프라인 시청 회차를 재전송해도 더 최근 이어보기를 덮어쓰지 않는다', { timeout: 10000 }, async (t) => {
  const { database } = client('history-viewer', true);
  const ref = doc(database, 'users', 'history-viewer', 'profiles', 'default', 'watchHistory', 'tv_123');
  const resumed = Promise.withResolvers();
  const options = {
    database,
    currentUid: () => 'history-viewer',
    onError: resumed.reject,
    onRetrySaved: resumed.resolve,
  };
  const older = createSeriesHistoryWriter(options);
  const newer = createSeriesHistoryWriter(options);
  const entry = { media_type: 'tv', id: '123', seasonNumber: 1 };
  await setDoc(ref, { ...entry, episodeNumber: 1, position: 10 });

  let online = false;
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
  t.after(() => { delete navigator.onLine; });
  assert.equal(await older.save(ref, { ...entry, episodeNumber: 2, position: 45 }, 'history-viewer', 'default'), false);
  assert.equal(await older.save(ref, { ...entry, episodeNumber: 3, position: 50 }, 'history-viewer', 'default'), false);

  await new Promise((resolve) => setTimeout(resolve, 10));
  online = true;
  assert.equal(await newer.save(ref, { ...entry, episodeNumber: 4, position: 5 }, 'history-viewer', 'default'), true);
  older.retry();
  await resumed.promise;
  const saved = (await getDoc(ref)).data();
  assert.equal(saved.episodeNumber, 4);
  assert.equal(saved.position, 5);
  assert.deepEqual(saved.watchedEpisodes.toSorted(), ['s1-e1', 's1-e2', 's1-e3', 's1-e4']);
});

test('비로그인은 저장·댓글·공감을 거부하고 로그인 사용자는 실제 메타데이터를 저장한다', async () => {
  const guest = client('').repo, alice = client('alice');
  await assert.rejects(guest.saveClip(newClip('forbidden')), /로그인/);
  await assert.rejects(guest.addComment('public', '댓글', { id: 'local:default' }), /로그인/);
  await assert.rejects(guest.toggleLike('public'), /로그인/);
  await alice.repo.saveClip({ ...newClip('public'), spoiler: true });
  const saved = (await getDoc(doc(alice.database, 'wowClips', 'public'))).data();
  assert.equal(saved.authorUid, 'alice'); assert.equal(saved.seasonNumber, 2); assert.equal(saved.episodeNumber, 7);
  assert.equal(saved.likeCount, 0); assert.equal(saved.commentCount, 0); assert.equal(saved.spoiler, true);
});

test('서버 규칙은 비로그인 직접 쓰기·작성자 위조·임의 집계 변경·타인 삭제를 막는다', async () => {
  const alice = client('alice'), bob = client('bob'), guest = client('');
  const original = (await getDoc(doc(alice.database, 'wowClips', 'public'))).data();
  await assertFails(setDoc(doc(guest.database, 'wowClips', 'guest-write'), { ...original, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(bob.database, 'wowClips', 'spoof'), { ...original, createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(bob.database, 'wowClips', 'public'), { likeCount: 1000 }));
  await assertFails(updateDoc(doc(bob.database, 'wowClips', 'public'), { deleted: true }));
  await assert.rejects(bob.repo.removeClip('public'), /본인이/);
});

test('엄격한 규칙 아래 여러 계정의 공감·해제가 자기 반응과 집계만 변경한다', async () => {
  for (const uid of ['alice','bob','carol']) await client(uid).repo.toggleLike('public');
  let saved = (await getDoc(doc(client('alice').database, 'wowClips', 'public'))).data();
  assert.equal(saved.likeCount, 3);
  await client('bob').repo.toggleLike('public');
  saved = (await getDoc(doc(client('alice').database, 'wowClips', 'public'))).data();
  assert.equal(saved.likeCount, 2);
  assert.equal((await getDoc(doc(client('bob').database, 'wowClips', 'public', 'likes', 'bob'))).exists(), false);
});

test('엄격한 규칙 아래 반복 답글·댓글 공감을 별도 문서와 정확한 집계로 보존한다', async () => {
  const root = await client('alice').repo.addComment('public', '원댓글', { id: 'alice:default', name: 'alice' });
  for (const uid of ['bob','carol']) await client(uid).repo.addComment('public', '답글 ' + uid, { id: uid + ':default', name: uid }, root);
  await client('bob').repo.addComment('public', '두 번째 답글', { id: 'bob:default', name: 'bob' }, root);
  for (const uid of ['bob','carol']) await client(uid).repo.toggleLike('public', root);
  await client('bob').repo.toggleLike('public', root);
  const saved = (await getDoc(doc(client('alice').database, 'wowClips', 'public'))).data();
  assert.equal(saved.commentCount, 4);
  const comments = await getDocs(collection(client('alice').database, 'wowClips', 'public', 'comments'));
  assert.equal(comments.size, 4);
  assert.equal(comments.docs.filter((item) => item.data().parentId === root).length, 3);
  assert.equal((await getDoc(doc(client('alice').database, 'wowClips', 'public', 'comments', root))).data().likeCount, 1);
  const detail = await once((data, error) => client('carol').repo.subscribeDetails('public', 'carol', data, error), (data) => data.comments.length === 4 && data.comments.some((item) => item.id === root && item.liked));
  assert.equal(detail.comments.find((item) => item.id === root).liked, true);
});

test('댓글과 답글은 300자까지 저장되며 다른 계정은 수정·삭제할 수 없다', async () => {
  const alice = client('alice'), bob = client('bob');
  const aliceOwner = { id: 'alice:default', name: 'alice' }, bobOwner = { id: 'bob:default', name: 'bob' };
  const clipId = 'comment-management';
  await alice.repo.saveClip(newClip(clipId));
  await assert.rejects(alice.repo.addComment(clipId, '한'.repeat(301), aliceOwner), /300자/);
  const root = await alice.repo.addComment(clipId, '한'.repeat(300), aliceOwner);
  const reply = await bob.repo.addComment(clipId, '답글', bobOwner, root);
  const aliceClip = doc(alice.database, 'wowClips', clipId);
  const aliceRoot = doc(aliceClip, 'comments', root);
  const bobClip = doc(bob.database, 'wowClips', clipId);
  const bobRoot = doc(bobClip, 'comments', root);

  await assert.rejects(bob.repo.editComment(clipId, root, '다른 사람 수정'), /내가 작성한/);
  await assert.rejects(bob.repo.removeComment(clipId, root), /내가 작성한/);
  await assertFails(updateDoc(bobRoot, { text: '권한 우회', editedAt: serverTimestamp() }));
  await assertFails(updateDoc(aliceRoot, { text: '한'.repeat(301), editedAt: serverTimestamp() }));
  await assertFails(updateDoc(aliceRoot, { text: ' \n\u00a0', editedAt: serverTimestamp() }));
  await assertFails(updateDoc(aliceRoot, { deleted: true, text: '' }));
  const forgedDeletion = writeBatch(bob.database);
  forgedDeletion.update(bobRoot, { deleted: true, text: '' });
  forgedDeletion.update(bobClip, { commentCount: 1, lastCommentId: root });
  await assertFails(forgedDeletion.commit());

  await alice.repo.editComment(clipId, root, '😀'.repeat(300));
  await assert.rejects(alice.repo.editComment(clipId, root, '😀'.repeat(301)), /300자/);
  const updated = (await getDoc(aliceRoot)).data();
  assert.equal(updated.text, '😀'.repeat(300));
  assert.equal(updated.authorUid, 'alice');
  assert.ok(updated.editedAt);
  await bob.repo.editComment(clipId, reply, '수정한 답글');
  await bob.repo.toggleLike(clipId, root);
  assert.equal((await getDoc(aliceRoot)).data().likeCount, 1);

  await alice.repo.removeComment(clipId, root);
  await alice.repo.removeComment(clipId, root);
  const deleted = (await getDoc(aliceRoot)).data();
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.text, '');
  assert.equal((await getDoc(doc(aliceClip, 'comments', reply))).data().text, '수정한 답글');
  assert.equal((await getDoc(aliceClip)).data().commentCount, 1);
  await assert.rejects(bob.repo.toggleLike(clipId, root), /댓글을 찾을 수 없어요/);
  await assert.rejects(bob.repo.addComment(clipId, '삭제된 댓글에 답글', bobOwner, root), /원댓글/);
  await bob.repo.removeComment(clipId, reply);
  assert.equal((await getDoc(aliceClip)).data().commentCount, 0);
});

test('링크 전용은 공개 목록에서 숨기고 직접 링크·본인 목록에서 읽힌다', async () => {
  await client('alice').repo.saveClip(newClip('link-only', 'link'));
  const publicDocs = await getDocs(query(collection(client('').database, 'wowClips'), where('visibility', '==', 'public'), where('deleted', '==', false)));
  assert.equal(publicDocs.docs.some((item) => item.id === 'link-only'), false);
  const linked = await once((data, error) => client('').repo.subscribe({ selectedId: 'link-only' }, data, error), (clips) => clips.some((clip) => clip.id === 'link-only'));
  assert.equal(linked.find((clip) => clip.id === 'link-only').visibility, 'link');
  const mine = await once((data, error) => client('alice').repo.subscribe({ uid: 'alice' }, data, error), (clips) => clips.some((clip) => clip.id === 'link-only'));
  assert.equal(mine.some((clip) => clip.id === 'link-only'), true);
});

test('재생 반복은 같은 계정 조회수를 중복 증가시키지 않고 삭제 후 반응·댓글 접근이 막힌다', async () => {
  assert.equal(await client('alice').repo.hasRecordedView('public', 'alice'), false);
  await client('alice').repo.recordView('public');
  await client('alice').repo.recordView('public');
  await client('bob').repo.recordView('public');
  assert.equal(await client('alice').repo.hasRecordedView('public', 'alice'), true);
  assert.equal(await client('bob').repo.hasRecordedView('public', 'bob'), true);
  assert.equal(await client('carol').repo.hasRecordedView('public', 'carol'), false);
  assert.equal(await client('carol').repo.hasRecordedView('public', 'alice'), false);
  assert.equal(await client('').repo.hasRecordedView('public', 'alice'), false);
  await assertFails(getDoc(doc(client('carol').database, 'wowClips', 'public', 'views', 'alice')));
  const watched = (await getDoc(doc(client('alice').database, 'wowClips', 'public'))).data();
  assert.equal(watched.views, 2);
  assert.equal(watched.spoiler, true);
  await client('alice').repo.saveClip(newClip('delete-me'));
  await client('alice').repo.removeClip('delete-me');
  const publicDocs = await getDocs(query(collection(client('').database, 'wowClips'), where('visibility', '==', 'public'), where('deleted', '==', false)));
  assert.equal(publicDocs.docs.some((item) => item.id === 'delete-me'), false);
  await assertFails(getDocs(query(collection(client('').database, 'wowClips'), where('visibility', '==', 'public'))));
  await assertFails(getDoc(doc(client('bob').database, 'wowClips', 'delete-me')));
  await assertFails(getDocs(collection(client('bob').database, 'wowClips', 'delete-me', 'comments')));
  await assert.rejects(client('bob').repo.toggleLike('delete-me'));
});

test('동시성 검수: 에뮬레이터 규칙 엔진 잠금 이슈와 분리해 실제 저장 트랜잭션의 재시도·집계를 검증한다', async () => {
  // firebase-tools#10518: 규칙의 부모 get()과 동시 쓰기에서 잘못된 permission-denied가 발생합니다.
  // 위 테스트에서 규칙은 엄격하게 검사하고, 이 테스트만 에뮬레이터 관리 토큰으로 동시성을 분리합니다.
  await client('alice', true).repo.saveClip(newClip('concurrent'));
  await Promise.all(['alice','bob','carol'].map((uid) => client(uid, true).repo.toggleLike('concurrent')));
  await Promise.all(['alice','bob','carol'].map((uid) => client(uid, true).repo.addComment('concurrent', '동시 댓글', { id: uid + ':default', name: uid })));
  await Promise.all([client('alice', true).repo.recordView('concurrent'), client('alice', true).repo.recordView('concurrent'), client('bob', true).repo.recordView('concurrent')]);
  const saved = (await getDoc(doc(client('alice', true).database, 'wowClips', 'concurrent'))).data();
  assert.equal(saved.likeCount, 3); assert.equal(saved.commentCount, 3); assert.equal(saved.views, 2);
});

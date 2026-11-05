
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { readClips, removeClip, saveClip } from '../../components/wowclip/clipStorage';
import { WowClipCard } from '../../components/wowclip/WowClipCard';
import '../wowclip/WowClipGallery.scss';
import './scss/MyReview.scss';

export const MyReview = () => {
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => params.get('tab') === 'wowclip' ? 'wowclip' : 'available');
  useEffect(() => { setActiveTab(params.get('tab') === 'wowclip' ? 'wowclip' : 'available'); }, [params]);
  const user = useAuthStore((state) => state.user);
  const [revision, setRevision] = useState(0);
  const clips = useMemo(() => readClips(user?.uid), [user?.uid, revision]);
  const chooseTab = (tab) => { setActiveTab(tab); setParams(tab === 'wowclip' ? { tab } : {}); };
  const deleteClip = (id) => {
    if (!window.confirm('이 클립의 저장 기록을 삭제할까요?')) return;
    removeClip(user?.uid, id);
    setRevision((n) => n + 1);
  };

  const emptyContent = {
    available: {
      title: '리뷰를 작성할 수 있는 콘텐츠가 없습니다.',
      description:
        '리뷰를 작성하려면 한 개 이상의 콘텐츠를 충분히 감상해주세요.',
    },
    written: {
      title: '작성한 리뷰가 없습니다.',
      description:
        '감상한 콘텐츠를 확인하고 리뷰를 작성해주세요.',
    },
  };

  const currentContent = emptyContent[activeTab] || emptyContent.available;

  return (
    <main className="my-review">
      <div className="my-review__inner">
        {/* 페이지 제목 */}
        <div className="my-review__header">
          <h2>리뷰 관리</h2>
        </div>

        {/* 리뷰 탭 */}
        <div
          className="my-review__tabs"
          role="tablist"
          aria-label="리뷰 관리"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'available'}
            className={activeTab === 'available' ? 'active' : ''}
            onClick={() => chooseTab('available')}
          >
            작성 가능한 리뷰
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'written'}
            className={activeTab === 'written' ? 'active' : ''}
            onClick={() => chooseTab('written')}
          >
            내가 작성한 리뷰
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'wowclip'} className={activeTab === 'wowclip' ? 'active' : ''} onClick={() => chooseTab('wowclip')}>와우 클립</button>
        </div>

        {/* 리뷰 목록 / 빈 화면 */}
        {activeTab === 'wowclip' ? (
          <section className="my-review__clips" role="tabpanel" aria-label="내 와우 클립">
            <p className="my-review__clips-notice">직접 만든 클립의 임시 저장과 게시 기록을 확인할 수 있습니다. 영상 파일은 저장되지 않으며 다른 사용자에게 공개되지 않습니다.</p>
            {clips.length ? <div className="wowclip-gallery__grid">{clips.map((clip) => <WowClipCard key={clip.id} clip={clip} actions={(item) => <>
              {item.status === 'draft' && <button type="button" onClick={() => { try { saveClip(user?.uid, { ...item, status: 'published' }); setRevision((n) => n + 1); } catch { window.alert('클립 상태를 변경하지 못했습니다.'); } }}>게시 기록으로 변경</button>}
              <button type="button" onClick={() => deleteClip(item.id)}>삭제</button>
            </>} />)}</div> : <div className="my-review__empty"><h3>저장한 와우 클립이 없습니다.</h3><p>영상 시청 페이지에서 AI로 클립 만들기를 눌러 제작해 보세요.</p></div>}
          </section>
        ) : <div className="my-review__empty" role="tabpanel">
          <h3>{currentContent.title}</h3>
          <p>{currentContent.description}</p>
        </div>}
      </div>
    </main>
  );
};

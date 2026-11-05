import { useState } from 'react';

import './scss/MyReview.scss';

export const MyReview = () => {
  const [activeTab, setActiveTab] = useState('available');

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
            onClick={() => setActiveTab('available')}
          >
            작성 가능한 리뷰
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'written'}
            className={activeTab === 'written' ? 'active' : ''}
            onClick={() => setActiveTab('written')}
          >
            내가 작성한 리뷰
          </button>
        </div>

        <div className="my-review__empty" role="tabpanel">
          <h3>{currentContent.title}</h3>
          <p>{currentContent.description}</p>
        </div>
      </div>
    </main>
  );
};

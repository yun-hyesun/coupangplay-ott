
import React, { useState } from 'react';
import { MySidebar } from './components/MySidebar';
import { Watchlist } from './components/MyWatchList';
import { WatchHistory } from './components/MyWatchHistory';
import { PurchaseList } from './components/MyPurchaseList';
import { LiveReminder } from './components/MyLiveReminder';
import { LanguageModal } from './components/MyLanguageModal';

import './scss/MyPage.scss';

export const MyPage = () => {
  // 언어 설정 모달 상태
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  return (
    <main className="mypage">
      <div className="mypage-inner">
        {/* 왼쪽 사이드바 */}
        <MySidebar
          onOpenLanguage={() => setIsLanguageModalOpen(true)}
        />

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="mypage-content">
          <WatchHistory />
          <Watchlist />
          <PurchaseList />
          <LiveReminder />
        </div>
      </div>

      {/* 언어 설정 모달 */}
      {isLanguageModalOpen && (
        <LanguageModal
          onClose={() => setIsLanguageModalOpen(false)}
        />
      )}
    </main>
  );
};

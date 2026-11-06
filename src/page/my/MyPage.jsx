
import React, { useState } from 'react';
import { MySidebar } from './components/MySidebar';
import { Watchlist } from './components/WahchList';
import { WatchHistory } from './components/WatchHistory';
import { PurchaseList } from './components/PurchaseList';
import { LiveReminder } from './components/LiveReminder';
import { LanguageModal } from './components/LanguageModal';

import './scss/MyPage.scss';
import { MyWowClip } from './MyWowClip';

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
          <MyWowClip />
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


import React, { useState } from 'react';
import { MySidebar } from './components/MySidebar';
import { WatchHistory } from './components/WatchHistory';
import { WatchList } from './components/WatchList';
import { PurchaseList } from './components/PurchaseList';
import { LiveReminder } from './components/LiveReminder';
import { LanguageModal } from './components/LanguageModal';
import { MyWowClip } from './MyWowClip';

import './scss/MyPage.scss';

export const MyPage = () => {
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const openLanguageModal = () => setIsLanguageModalOpen(true);

  return (
    <main className="mypage">
      <div className="mypage-inner">

        {/* PC / 태블릿 사이드바 */}
        <div className="mypage-desktop-sidebar">
          <MySidebar onOpenLanguage={openLanguageModal} />
        </div>

        {/* 모바일 프로필 */}
        <div className="mypage-mobile-profile">
          <MySidebar
            mode="profile"
            onOpenLanguage={openLanguageModal}
          />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="mypage-content">
          <WatchHistory />
          <WatchList/>
          <PurchaseList />
          <MyWowClip />
          <LiveReminder />
        </div>

        {/* 모바일 하단 메뉴 */}
        <div className="mypage-mobile-menu">
          <MySidebar
            mode="menu"
            onOpenLanguage={openLanguageModal}
          />
        </div>
      </div>

      {isLanguageModalOpen && (
        <LanguageModal
          onClose={() => setIsLanguageModalOpen(false)}
        />
      )}
    </main>
  );
};

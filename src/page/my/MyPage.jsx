import React from 'react'
import { MySidebar } from './components/MySidebar'
import "./scss/MyPage.scss"
import { Watchlist } from './components/WahchList'
import { WatchHistory } from './components/WatchHistory'
import { PurchaseList } from './components/PurchaseList'
import { LiveReminder } from './components/LiveReminder'

export const MyPage = () => {
  return (
    <main className='mypage'>
      <div className="mypage-inner">
        <MySidebar />

        <div className="mypage-content">
          {/* 오른쪽 콘텐츠 영역 */}
          <WatchHistory />
          <Watchlist />
          <PurchaseList />
          <LiveReminder />
        </div>
      </div>
    </main>
  )
}

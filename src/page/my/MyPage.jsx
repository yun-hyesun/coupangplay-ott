import React from 'react'
import { MySidebar } from './components/MySidebar'

export const MyPage = () => {
  return (
    <main>
      <div className="mypage-inner">
        <MySidebar />

        <div className="mypage-content">
          {/* 오른쪽 콘텐츠 영역 */}
        </div>
      </div>
    </main>
  )
}

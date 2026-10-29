import React from 'react'
import { MySidebar } from './components/MySidebar'
import "./scss/MyPage.scss"

export const MyPage = () => {
  return (
    <main className='mypage'>
      <div className="mypage-inner">
        <MySidebar />

        <div className="mypage-content">
          {/* 오른쪽 콘텐츠 영역 */}
        </div>
      </div>
    </main>
  )
}

import React from 'react'
import '../scss/WatchHistory.scss'
import { Link } from 'react-router-dom'

// 화면 구성 확인용 임시 데이터
const historyData = [
  {
    id: 1,
    title: '너 말고 다른 연애',
    info: '시즌 1 3화 · 24분 남음',
    progress: 60
  },
  {
    id: 2,
    title: '직장인들',
    info: '9화 · 18분 남음',
    progress: 40
  },
  {
    id: 3,
    title: '히든페이스',
    info: '영화 · 42분 남음',
    progress: 48
  },
  {
    id: 4,
    title: '만약에 우리',
    info: '영화 · 35분 남음',
    progress: 68
  },
  {
    id: 5,
    title: '봉주르빵집',
    info: '시즌 1 5화 · 21분 남음',
    progress: 0
  }
];

export const WatchHistory = () => {

  return (
    <section className="watch-history">
      <div className="watch-history-header">
        <Link to="/my/history" className="watch-history-heading">
          <h2>시청내역</h2>
          <img className="watch-history-arrow" src="/images/mypage/icon-arrow_right.png" alt="화살표 아이콘" />
        </Link>

        <Link
          to="/my/history"
          className="watch-history-more"
          aria-label="전체 시청내역 보기"
        >
          •••
        </Link>
      </div>

      <div className="watch-history-grid">
        {historyData.slice(0, 5).map((item) => (
          <div className="watch-history-item" key={item.id}>
            <div className="watch-history-thumbnail">
              <div
                className="watch-history-progress"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            <h3>{item.title}</h3>
            <p>{item.info}</p>
          </div>
        ))}
      </div>
    </section>
  )

}


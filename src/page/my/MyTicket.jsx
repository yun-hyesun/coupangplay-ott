
import React from 'react';
import './scss/MyTicket.scss';
// [추가] 공통 페이지 헤더
import { MyPageHeader } from './components/MyPageHeader';

export const MyTicket = () => {
  return (
    <main className="my-ticket">
      <div className="my-ticket__inner">
        <div className="my-ticket__header">
          <MyPageHeader title="내 티켓" />
        </div>

        <div className="my-ticket__empty">
          <h3>아직 구매한 티켓이 없습니다.</h3>
          <p>구매한 티켓이 여기에 표시됩니다.</p>
        </div>
      </div>
    </main>
  );
};

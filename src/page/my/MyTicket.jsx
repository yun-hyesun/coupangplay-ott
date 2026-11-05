
import React from 'react';
import './scss/MyTicket.scss';

export const MyTicket = () => {
  return (
    <main className="my-ticket">
      <div className="my-ticket__inner">
        <div className="my-ticket__header">
          <h2>내 티켓</h2>
        </div>

        <div className="my-ticket__empty">
          <h3>아직 구매한 티켓이 없습니다.</h3>
          <p>구매한 티켓이 여기에 표시됩니다.</p>
        </div>
      </div>
    </main>
  );
};

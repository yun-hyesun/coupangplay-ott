
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './scss/MySubscription.scss';

// 시연용 결제 데이터
const samplePayments = [
    {
        id: 1,
        date: '2026/10/08',
        status: '결제 성공',
        price: '13,900원',
        description: '와우 회원 전용 특가'
    }
];

export const MyPaymentHistory = () => {
    const navigate = useNavigate();

    return (
        <main className="my-subscription">
            <div className="my-subscription-inner">
                <div className="subscription-header">
                    <h2>결제 내역</h2>

                    <button
                        type="button"
                        className="voucher-open-btn"
                        onClick={() => navigate('/my/subscription')}
                    >
                        구독내역으로 돌아가기
                    </button>
                </div>

                <div className="subscription-list">
                    <div className="subscription-card">
                        <div className="subscription-thumbnail">
                            <span className="sports-play">▶</span>
                            <strong>SPORTS</strong>
                        </div>

                        <div className="subscription-info">
                            <h3>스포츠 패스</h3>
                            <p>1개월마다 결제</p>
                        </div>
                    </div>

                    <table className="payment-history-table">
                        <thead>
                            <tr>
                                <th>결제 날짜</th>
                                <th>결제 상태</th>
                                <th>가격</th>
                            </tr>
                        </thead>

                        <tbody>
                            {samplePayments.map((payment) => (
                                <tr key={payment.id}>
                                    <td>{payment.date}</td>
                                    <td>{payment.status}</td>
                                    <td>
                                        {payment.price}
                                        <span> ({payment.description})</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

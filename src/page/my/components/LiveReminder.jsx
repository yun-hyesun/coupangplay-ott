import React from 'react'
import { Link } from 'react-router-dom'
import '../scss/LiveReminder.scss'

export const LiveReminder = () => {
    // 추후 라이브 예약 데이터 연결 예정
    const liveReminders = [];

    return (
        <section className="live-reminder">
            <div className="live-reminder-header">
                <Link
                    to="/my/live"
                    className="live-reminder-heading"
                >
                    <h2>라이브 예약 알림</h2>
                    <img
                        src="/images/mypage/icon-arrow_right.png"
                        alt=""
                        className="live-reminder-arrow"
                    />
                </Link>

                <Link
                    to="/my/live"
                    className="live-reminder-more"
                    aria-label="전체 라이브 예약 알림 보기"
                >
                    •••
                </Link>
            </div>

            {liveReminders.length === 0 ? (
                <p className="live-reminder-message">
                    예약한 라이브 알림이 없습니다.
                </p>
            ) : (
                <div className="live-reminder-grid">
                    {liveReminders.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className="live-reminder-item"
                        >
                            <div className="live-reminder-thumbnail">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                    />
                                ) : (
                                    <span>이미지 없음</span>
                                )}
                            </div>

                            <p className="live-reminder-title">
                                {item.title}
                            </p>
                            <p className="live-reminder-date">
                                {item.date}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

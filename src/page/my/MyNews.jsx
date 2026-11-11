
import React, { useState } from 'react'
import { MyPageHeader } from './components/MyPageHeader';
import './scss/MyNews.scss'

// 공지사항 및 이벤트 샘플 데이터
const newsList = [
    {
        id: 1,
        category: '공지사항',
        title: '프로필 관리 기능 이용 안내',
        date: '2026.11.05',
        content: '프로필 관리 화면에서 프로필 이름과 이미지를 변경할 수 있습니다. 여러 프로필을 생성하고 각각의 시청 기록과 찜 목록을 관리해 보세요.'
    },
    {
        id: 2,
        category: '공지사항',
        title: '시청 기록 및 찜 목록 이용 안내',
        date: '2026.11.03',
        content: '마이페이지에서 시청 기록과 찜한 콘텐츠를 확인할 수 있습니다. 관심 있는 콘텐츠를 찜 목록에 추가하고 편리하게 관리해 보세요.'
    },
    {
        id: 3,
        category: '이벤트·혜택',
        title: '신규 콘텐츠 공개 기념 이벤트',
        date: '2026.11.01',
        content: '새로운 콘텐츠 공개를 기념하여 준비한 이벤트입니다. 본 내용은 리디자인 프로젝트를 위한 예시이며 실제 진행 중인 이벤트가 아닙니다.'
    },
    {
        id: 4,
        category: '공지사항',
        title: '이용권 등록 기능 안내',
        date: '2026.10.29',
        content: '마이페이지의 구독 내역에서 이용권 등록 기능을 이용할 수 있습니다. 이용권 등록 버튼을 선택하고 안내에 따라 코드를 입력해 주세요.'
    },
    {
        id: 5,
        category: '이벤트·혜택',
        title: '콘텐츠 추천 이벤트 안내',
        date: '2026.10.25',
        content: '다양한 장르의 콘텐츠를 발견해 보세요. 본 이벤트는 리디자인 프로젝트의 화면 구성을 위한 샘플 콘텐츠입니다.'
    }
];

const categories = ['전체', '공지사항', '이벤트·혜택'];

export const MyNews = () => {
    const [category, setCategory] = useState('전체');
    const [selectedNews, setSelectedNews] = useState(null);

    // 카테고리 필터링
    const filteredNews = newsList.filter((news) =>
        category === '전체' || news.category === category
    );

    // 공지사항 열기 / 닫기
    const handleNewsClick = (id) => {
        setSelectedNews((prev) => prev === id ? null : id);
    };

    return (
        <main className="my-news">
            <div className="my-news-inner">

                {/* 공통 페이지 헤더 */}
                <div className="news-header">
                    <MyPageHeader title="소식 및 혜택" />
                </div>

                {/* <p className="my-news-description">
                    쿠팡플레이의 새로운 소식과 다양한 혜택을 확인하세요.
                </p> */}

                {/* 카테고리 */}
                <div className="news-categories">
                    {categories.map((item) => (
                        <button
                            type="button"
                            key={item}
                            className={category === item ? 'active' : ''}
                            onClick={() => {
                                setCategory(item);
                                setSelectedNews(null);
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {/* 공지사항 및 이벤트 목록 */}
                <section className="news-list">
                    {filteredNews.map((news) => {
                        const isOpen = selectedNews === news.id;

                        return (
                            <div
                                className={`news-list-row ${isOpen ? 'active' : ''}`}
                                key={news.id}
                            >
                                {/* 공지사항 제목 */}
                                <button
                                    type="button"
                                    className="news-item"
                                    aria-expanded={isOpen}
                                    aria-controls={`news-answer-${news.id}`}
                                    onClick={() => handleNewsClick(news.id)}
                                >
                                    <span className="news-item-info">
                                        <span className="news-item-category">
                                            {news.category}
                                        </span>

                                        <strong>{news.title}</strong>

                                        <span className="news-item-date">
                                            {news.date}
                                        </span>
                                    </span>

                                    {/* 디자인 시스템 화살표 */}
                                    <span
                                        className="news-item-arrow"
                                        aria-hidden="true"
                                    >
                                        <img
                                            src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                                            alt=""
                                        />
                                    </span>
                                </button>

                                {/* 상세 내용 아코디언 */}
                                <div
                                    id={`news-answer-${news.id}`}
                                    className={`news-answer-wrap ${isOpen ? 'open' : ''}`}
                                    aria-hidden={!isOpen}
                                >
                                    <div className="news-answer-inner">
                                        <div className="news-answer">
                                            <p>{news.content}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        </main>
    );
};

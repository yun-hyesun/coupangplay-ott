
import React, { useState } from 'react'
// [추가] 공통 페이지 헤더
import { MyPageHeader } from './components/MyPageHeader';
import './scss/MySupport.scss'

// 자주 묻는 질문 데이터
const faqList = [
    {
        id: 1,
        category: '계정·프로필',
        question: '프로필은 어떻게 변경하나요?',
        answer: '오른쪽 상단의 프로필 이미지를 클릭한 뒤 프로필 전환을 선택하면 다른 프로필로 변경할 수 있습니다.'
    },
    {
        id: 2,
        category: '계정·프로필',
        question: '프로필 정보는 어디에서 수정하나요?',
        answer: '프로필 관리 화면에서 프로필 이름과 이미지를 수정할 수 있습니다.'
    },
    {
        id: 3,
        category: '이용권·결제',
        question: '이용권은 어디에서 등록하나요?',
        answer: '마이페이지의 구독 내역에서 이용권 등록 버튼을 선택한 뒤 이용권 코드를 입력해 주세요.'
    },
    {
        id: 4,
        category: '이용권·결제',
        question: '구독 내역은 어디에서 확인하나요?',
        answer: '오른쪽 상단 프로필 메뉴에서 구독 내역을 선택하면 등록된 이용권 정보를 확인할 수 있습니다.'
    },
    {
        id: 5,
        category: '재생·시청',
        question: '시청 기록은 어떻게 확인하나요?',
        answer: '마이페이지의 시청 기록 영역에서 이전에 시청한 콘텐츠를 확인할 수 있습니다.'
    },
    {
        id: 6,
        category: '재생·시청',
        question: '찜한 콘텐츠는 어디에서 확인하나요?',
        answer: '콘텐츠 상세 페이지에서 찜한 작품은 마이페이지의 찜한 콘텐츠 영역에서 확인할 수 있습니다.'
    },
    {
        id: 7,
        category: '재생·시청',
        question: '영상이 정상적으로 재생되지 않아요.',
        answer: '인터넷 연결 상태를 확인하고 페이지를 새로고침해 주세요. 문제가 계속되면 사용 중인 브라우저를 확인해 주세요.'
    },
    {
        id: 8,
        category: '기타',
        question: '서비스에 대한 의견은 어디에 남기나요?',
        answer: '마이페이지의 피드백 남기기 메뉴를 통해 서비스에 대한 의견을 작성할 수 있습니다.'
    }
];

const categories = ['전체', '계정·프로필', '이용권·결제', '재생·시청', '기타'];

export const MySupport = () => {
    const [search, setSearch] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [category, setCategory] = useState('전체');
    const [openId, setOpenId] = useState(null);

    // 검색 및 카테고리 필터링
    const filteredFaq = faqList.filter((faq) => {
        const matchCategory = category === '전체' || faq.category === category;
        const keyword = searchKeyword.trim().toLowerCase();
        const matchSearch =
            faq.question.toLowerCase().includes(keyword) ||
            faq.answer.toLowerCase().includes(keyword);

        return matchCategory && matchSearch;
    });

    // 검색 실행
    const handleSearch = (e) => {
        e.preventDefault();
        setSearchKeyword(search);
        setOpenId(null);
    };

    return (
        <main className="my-support">
            <div className="my-support-inner">
                <div className="support-header">
                    <MyPageHeader title="고객센터" />
                </div>

                <p className="my-support-description">
                    쿠팡플레이 이용 중 궁금한 점을 확인해 보세요.
                </p>

                {/* FAQ 검색 */}
                <form className="support-search" onSubmit={handleSearch}>
                    <input
                        type="search"
                        placeholder="궁금한 내용을 검색해 보세요."
                        aria-label="자주 묻는 질문 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" aria-label="검색">
                        <img src="/images/icon/DesignSystem_Icon01/icon-search.svg" alt="" />
                    </button>
                </form>

                {/* 카테고리 */}
                <div className="support-categories">
                    {categories.map((item) => (
                        <button
                            type="button"
                            key={item}
                            className={category === item ? 'active' : ''}
                            onClick={() => {
                                setCategory(item);
                                setOpenId(null);
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {/* 자주 묻는 질문 */}
                <section className="support-faq">
                    <h3>자주 묻는 질문</h3>

                    {filteredFaq.length > 0 ? (
                        <ul>
                            {filteredFaq.map((faq) => (
                                <li key={faq.id} className={openId === faq.id ? 'active' : ''}>
                                    <button
                                        type="button"
                                        className="support-question"
                                        aria-expanded={openId === faq.id}
                                        onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                                    >
                                        <span>{faq.question}</span>
                                        <span className="support-arrow" aria-hidden="true"> <img
                                            src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                                            alt=""
                                        /></span>
                                    </button>

                                    <div className={`support-answer-wrap ${openId === faq.id ? 'open' : ''}`}>
                                        <div className="support-answer-inner">
                                            <div className="support-answer">
                                                {faq.answer}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="support-empty">
                            검색 결과가 없습니다.
                        </div>
                    )}
                </section>

                {/* 고객센터 안내 */}
                <div className="support-contact">
                    <h3>추가 도움이 필요하신가요?</h3>
                    <p>서비스 이용 관련 문의는 고객센터로 연락해 주세요.</p>
                    <p className="support-phone">1600-9800</p>
                </div>
            </div>
        </main>
    )
}

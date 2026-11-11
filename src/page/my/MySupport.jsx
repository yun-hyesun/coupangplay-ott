
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom';
// [추가] 공통 페이지 헤더
import { MyPageHeader } from './components/MyPageHeader';
import './scss/MySupport.scss'

import { supportCategories as categories, supportFaqList as faqList } from './MySupportData';

const PAGE_SIZE = 5;

export const MySupport = () => {
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [category, setCategory] = useState(() => {
        const requested = new URLSearchParams(location.search).get('category');
        return categories.includes(requested) ? requested : categories[0];
    });
    const [openId, setOpenId] = useState(null);
    const [page, setPage] = useState(1);

    // 푸터 및 직접 URL 접근 시 해당 탭을 열고 목록 상태를 초기화합니다.
    useEffect(() => {
        const requested = new URLSearchParams(location.search).get('category');
        setCategory(categories.includes(requested) ? requested : categories[0]);
        setSearch('');
        setSearchKeyword('');
        setPage(1);
        setOpenId(null);
    }, [location.key, location.search]);

    // 검색 및 카테고리 필터링
    const filteredFaq = faqList.filter((faq) => {
        const matchCategory = faq.category === category;
        const keyword = searchKeyword.trim().toLowerCase();
        const matchSearch =
            faq.question.toLowerCase().includes(keyword) ||
            faq.answer.toLowerCase().includes(keyword);

        return matchCategory && matchSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredFaq.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleFaq = filteredFaq.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const changePage = (nextPage) => {
        setPage(Math.max(1, Math.min(nextPage, totalPages)));
        setOpenId(null);
    };

    // 검색 실행
    const handleSearch = (e) => {
        e.preventDefault();
        setSearchKeyword(search);
        setPage(1);
        setOpenId(null);
    };

    return (
        <main className="my-support">
            <div className="my-support-inner">
                <div className="support-header">
                    <MyPageHeader title="고객센터" />
                </div>

                {/* <p className="my-support-description">
                    쿠팡플레이 이용 중 궁금한 점을 확인해 보세요.
                </p> */}

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
                            aria-pressed={category === item}
                            onClick={() => {
                                setCategory(item);
                                setPage(1);
                                setOpenId(null);
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {/* 자주 묻는 질문 */}
                <section className="support-faq">
                    {/* <h3>자주 묻는 질문</h3> */}

                    {filteredFaq.length > 0 ? (
                        <ul>
                            {visibleFaq.map((faq) => (
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

                {filteredFaq.length > PAGE_SIZE && (
                    <nav className="support-pagination" aria-label="고객센터 목록 페이지">
                        <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="이전 페이지">이전</button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                            <button
                                type="button"
                                key={number}
                                aria-label={`${number}페이지`}
                                aria-current={currentPage === number ? 'page' : undefined}
                                onClick={() => changePage(number)}
                            >
                                {number}
                            </button>
                        ))}
                        <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="다음 페이지">다음</button>
                    </nav>
                )}

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

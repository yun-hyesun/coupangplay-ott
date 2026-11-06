
import { useState } from 'react';
import { MyPageHeader } from './components/MyPageHeader';
import './scss/MyFeedback.scss';

const feedbackTopics = [
    '재생/시청/기능',
    '티켓 예매',
    '콘텐츠 결제/환불',
    '쿠팡플레이 오리지널 콘텐츠',
    '콘텐츠',
    '제휴/쿠폰클럽/경품 이벤트',
    '계정/멤버십',
    '기타',
];

export const MyFeedback = () => {
    const [topic, setTopic] = useState('재생/시청/기능');
    const [content, setContent] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    const isValid = topic !== '' && content.trim() !== '';

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isValid) return;

        // 시연용 제출 완료 모달 열기
        setShowCompleteModal(true);

        // 입력값 초기화
        setTopic('재생/시청/기능');
        setContent('');
        setIsOpen(false);
    };

    return (
        <main className="my-feedback">

            {/* [수정] 내 티켓과 동일한 공통 헤더 영역 */}
            <div className="my-feedback__container">
                <div className="my-feedback__header">
                    <MyPageHeader title="피드백 남기기" />
                </div>
            </div>

            {/* [수정] 기존 피드백 폼은 별도 중앙 정렬 영역으로 유지 */}
            <div className="my-feedback__inner">

                <p className="my-feedback__description">
                    남겨주신 피드백은 서비스 개선에 활용됩니다.
                    <br />
                    개별 문의는 고객센터 (1600-9800) 또는
                    <br />
                    playerpresent@coupang.com으로 연락 부탁드립니다.
                </p>

                <form
                    className="my-feedback__form"
                    onSubmit={handleSubmit}
                >
                    <div className="my-feedback__field">
                        <label id="feedback-topic-label">
                            주제를 선택해 주세요.
                        </label>

                        <div className="my-feedback__select">
                            <button
                                type="button"
                                className="my-feedback__select-button"
                                aria-labelledby="feedback-topic-label"
                                aria-expanded={isOpen}
                                aria-controls="feedback-topic-list"
                                onClick={() => setIsOpen(!isOpen)}
                            >
                                <span>{topic}</span>
                                <span
                                    className={`my-feedback__arrow ${isOpen ? 'open' : ''}`}
                                />
                            </button>

                            {isOpen && (
                                <ul
                                    id="feedback-topic-list"
                                    className="my-feedback__options"
                                >
                                    {feedbackTopics.map((item) => (
                                        <li key={item}>
                                            <button
                                                type="button"
                                                className={topic === item ? 'selected' : ''}
                                                onClick={() => {
                                                    setTopic(item);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                {item}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="my-feedback__field">
                        <label htmlFor="feedback-content">
                            내용을 자세히 입력해주세요.
                        </label>

                        <textarea
                            id="feedback-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={1000}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="my-feedback__submit"
                        disabled={!isValid}
                    >
                        피드백 남기기
                    </button>
                </form>
            </div>

            {/* 기존 피드백 제출 완료 모달 유지 */}
            {showCompleteModal && (
                <div
                    className="feedback-modal-overlay"
                    onClick={() => setShowCompleteModal(false)}
                >
                    <div
                        className="feedback-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="feedback-complete-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="feedback-complete-title">
                            피드백이 제출되었습니다.
                        </h3>

                        <p>
                            소중한 의견 감사합니다.
                            <br />
                            보내주신 피드백은 서비스 개선에 활용됩니다.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowCompleteModal(false)}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

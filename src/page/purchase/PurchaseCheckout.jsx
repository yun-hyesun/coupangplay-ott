import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { saveMockPurchase } from '../../service/purchaseService';
import './scss/PurchaseCheckout.scss';

// 모의 구매용 상품 가격
const purchaseProducts = {};

export const PurchaseCheckout = () => {
    const navigate = useNavigate();
    const { type, id } = useParams();

    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    const product = purchaseProducts[`${type}-${id}`] ?? {
        price: 5500,
        rentalPeriod: '시연용 구매 상품'
    };
    const price = product.price;

    // TMDB에서 콘텐츠 기본 정보 조회
    useEffect(() => {
        if (!['movie', 'tv'].includes(type) || !id) {
            setError('올바르지 않은 콘텐츠 주소입니다.');
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const fetchContent = async () => {
            setLoading(true);
            setError('');
            setContent(null);

            try {
                const apiKey = import.meta.env.VITE_TMDB_API_KEY;

                if (!apiKey) {
                    throw new Error('TMDB API 키가 설정되지 않았습니다.');
                }

                const response = await fetch(
                    `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=ko-KR`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error('콘텐츠 정보를 불러오지 못했습니다.');
                }

                const data = await response.json();
                setContent(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchContent();

        return () => controller.abort();
    }, [type, id]);

    // 작품이 바뀌면 약관 동의 초기화
    useEffect(() => {
        setAgreed(false);
        setBusy(false);
    }, [type, id]);

    const title = content?.title || content?.name || '';
    const poster = content?.poster_path
        ? `https://image.tmdb.org/t/p/w342${content.poster_path}`
        : null;

    const formatPrice = (value) =>
        `${Number(value).toLocaleString('ko-KR')}원`;


    const handlePurchase = async () => {
        if (busy || loading || authLoading || !agreed || !content || !product) {
            return;
        }

        if (!user?.uid) {
            navigate('/login', {
                state: {
                    from: `/purchase/checkout/${type}/${id}`
                }
            });
            return;
        }

        setBusy(true);
        setError('');

        try {
            await saveMockPurchase(user.uid, {
                contentId: id,
                mediaType: type,
                title: content.title || content.name,
                image: content.poster_path
                    ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                    : '',
                genre: type === 'movie' ? '영화' : '스토어',
                price,
                info: type === 'movie'
                    ? '영화 · 개별 구매'
                    : '시리즈 · 개별 구매'
            });

            // Firebase 저장 성공 시 완료 모달 표시
            setShowCompleteModal(true);

        } catch (err) {
            console.error('모의 구매 저장 오류:', err);
            setError(err.message || '구매내역 저장에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };


    if (loading || authLoading) {
        return (
            <main className="purchase-checkout">
                <div className="purchase-checkout__inner">
                    <p className="purchase-checkout__message">
                        결제 정보를 불러오는 중입니다.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="purchase-checkout">
            <div className="purchase-checkout__inner">

                {/* 페이지 제목 */}
                <header className="purchase-checkout__header">
                    <button
                        type="button"
                        className="purchase-checkout__back"
                        onClick={() => navigate(-1)}
                        aria-label="이전 페이지로 돌아가기"
                    >
                        <img
                            src="/images/icon/icon-arrow_back_gray.svg"
                            alt=""
                        />
                    </button>
                    <h1>개별 콘텐츠 구매</h1>
                </header>

                {/* 상품 정보 */}
                <section className="purchase-checkout__section">
                    <h2>구매 콘텐츠</h2>

                    {content ? (
                        <div className="purchase-checkout__product">
                            <div className="purchase-checkout__poster">
                                {poster ? (
                                    <img src={poster} alt={`${title} 포스터`} />
                                ) : (
                                    <span>이미지 없음</span>
                                )}
                            </div>

                            <div className="purchase-checkout__product-info">
                                <h3>{title}</h3>
                                <p>{type === 'movie' ? '영화' : '시리즈'}</p>

                                {content.release_date || content.first_air_date ? (
                                    <p>
                                        {(
                                            content.release_date ||
                                            content.first_air_date
                                        ).slice(0, 4)}년
                                    </p>
                                ) : null}

                                <strong>
                                    {typeof price === 'number'
                                        ? formatPrice(price)
                                        : '가격 확인 필요'}
                                </strong>
                            </div>
                        </div>
                    ) : (
                        <p className="purchase-checkout__message">
                            콘텐츠 정보를 확인할 수 없습니다.
                        </p>
                    )}
                </section>

                {/* 결제 정보 */}
                <section className="purchase-checkout__section">
                    <h2>결제 정보</h2>

                    <div className="purchase-checkout__info">
                        <div className="purchase-checkout__info-row">
                            <span>상품 유형</span>
                            <strong>개별 콘텐츠 구매</strong>
                        </div>

                        <div className="purchase-checkout__info-row">
                            <span>이용 조건</span>
                            <strong>
                                {product?.rentalPeriod || '이용 조건 확인 필요'}
                            </strong>
                        </div>

                        <div className="purchase-checkout__info-row">
                            <span>상품 금액</span>
                            <strong>
                                {typeof price === 'number'
                                    ? formatPrice(price)
                                    : '가격 확인 필요'}
                            </strong>
                        </div>
                    </div>
                </section>

                {/* 결제 수단 */}
                <section className="purchase-checkout__section">
                    <h2>결제 수단</h2>

                    <div className="purchase-checkout__payment">
                        <span className="purchase-checkout__payment-check">
                            <span />
                        </span>
                        <span>쿠페이</span>
                    </div>

                    <p className="purchase-checkout__caption">
                        결제 수단 연동은 추후 진행됩니다.
                    </p>
                </section>

                {/* 약관 동의 */}
                <section className="purchase-checkout__section">
                    <h2>구매 동의</h2>


                    <label className="purchase-checkout__agreement">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />

                        <span
                            className={`purchase-checkout__agreement-check ${agreed ? 'active' : ''
                                }`}
                            aria-hidden="true"
                        >
                            {agreed && <span />}
                        </span>

                        <span className="purchase-checkout__agreement-text">
                            상품 이용 조건 및 유료서비스 이용약관을
                            확인하고 동의합니다.
                        </span>
                    </label>


                    <p className="purchase-checkout__caption">
                        구매 후 이용 가능 기간과 환불 조건은
                        상품별 안내를 확인해 주세요.
                    </p>
                </section>

                {/* 최종 결제 */}
                <section className="purchase-checkout__total">
                    <div className="purchase-checkout__total-row">
                        <span>최종 결제 금액</span>
                        <strong>
                            {typeof price === 'number'
                                ? formatPrice(price)
                                : '가격 확인 필요'}
                        </strong>
                    </div>
                </section>

                {error && (
                    <p className="purchase-checkout__error" role="alert">
                        {error}
                    </p>
                )}

                {/* 결제 버튼 */}
                <div className="purchase-checkout__actions">
                    <button
                        type="button"
                        className="purchase-checkout__button purchase-checkout__button--secondary"
                        onClick={() => navigate(-1)}
                    >
                        취소
                    </button>

                    <button
                        type="button"
                        className="purchase-checkout__button"
                        disabled={busy || !agreed || !content}
                        onClick={handlePurchase}
                    >
                        {busy
                            ? '구매 처리 중...'
                            : !user
                                ? '로그인 후 결제하기'
                                : `${formatPrice(price)} 결제하기`}
                    </button>
                </div>

                <p className="purchase-checkout__notice">
                    본 페이지는 포트폴리오 시연용으로 실제 결제가 발생하지 않습니다.
                </p>
            </div>


            {showCompleteModal && (
                <div className="purchase-complete-modal">
                    <div
                        className="purchase-complete-modal__content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="purchase-complete-title"
                    >
                        <div className="purchase-complete-modal__icon">
                            <span>✓</span>
                        </div>

                        <h2 id="purchase-complete-title">
                            구매가 완료되었습니다
                        </h2>

                        <p>
                            구매하신 콘텐츠는 마이페이지의
                            <br />
                            개별 구매내역에서 확인할 수 있습니다.
                        </p>

                        <div className="purchase-complete-modal__actions">
                            <button
                                type="button"
                                className="purchase-checkout__button purchase-checkout__button--secondary"
                                onClick={() => navigate('/my/purchases', { replace: true })}
                            >
                                구매내역 확인하기
                            </button>

                            <button
                                type="button"
                                className="purchase-checkout__button"
                                onClick={() =>
                                    navigate(`/watch/${type}/${id}`, {
                                        replace: true,
                                        state: {
                                            content,
                                            title: content?.title || content?.name,
                                        },
                                    })
                                }
                            >
                                재생하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
};

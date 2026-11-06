
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../../store/useProfileStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';
import '../scss/MySidebar.scss';

const MyMenus = [
    { id: 1, title: "내 티켓", path: "/my/ticket" },
    { id: 2, title: "내 리뷰 관리", path: "/my/review" },
    { id: 3, title: "할인 쿠폰", path: "/my/coupon" },
    { id: 4, title: "피드백 남기기", path: "/my/feedback" },
    { id: 5, title: "언어 설정", path: "/my/language" },
    { id: 6, title: "고객센터", path: "/my/support" },
    { id: 7, title: "소식 및 혜택", path: "/my/news" },
];

// 이용권별 SVG 아이콘
const passIcons = {
    'sports-pass': '/images/mypage/pass/sports-logo.svg',
    'moa-pass': '/images/mypage/pass/moa-logo.svg',
    'jplus-pass': '/images/mypage/pass/jplus-logo.svg',
    'ebs-pass': '/images/mypage/pass/ebs-logo.svg',
    'kids-pass': '/images/mypage/pass/kids-logo.svg',
    'paramount-pass': '/images/mypage/pass/paramount-logo.svg',
    'sony-pass': '/images/mypage/pass/sony-logo.svg',
};

export const MySidebar = ({ onOpenLanguage, mode = "all" }) => {
    const navigate = useNavigate();

    // 현재 선택된 프로필 정보
    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    // 현재 로그인 계정
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    // 등록된 이용권 정보
    const subscriptions = useSubscriptionStore(
        (state) => state.subscriptions
    );
    const onLoadSubscriptions = useSubscriptionStore(
        (state) => state.onLoadSubscriptions
    );

    // 로그인 계정이 변경되면 구독내역 다시 불러오기
    useEffect(() => {
        if (mode === "menu") return;
        if (authLoading) return;

        if (!user) {
            useSubscriptionStore.getState().onResetSubscriptions();
            return;
        }

        onLoadSubscriptions();
    }, [user?.uid, authLoading, onLoadSubscriptions, mode]);

    // 등록된 이용권 ID
    const registeredPassIds = subscriptions
        .filter((subscription) => subscription.status === 'active')
        .map((subscription) => subscription.id)
        .filter((passId) => passIcons[passId]);

    // 프로필 전환
    const handleProfileChange = () => {
        navigate("/profiles");
    };

    return (
        <div className="my-sidebar">

            {/* 프로필 영역: 전체 또는 프로필 모드 */}
            {mode !== "menu" && (
                <div className="my-profile">
                    <div className="my-profile-info">

                        <div className="my-avatar">
                            <img
                                src={
                                    currentProfile?.avatar ||
                                    "/images/profile/profile-img/profile.svg"
                                }
                                alt=""
                            />
                        </div>

                        <span className="my-username">
                            {currentProfile?.name || "프로필 선택"}
                        </span>

                        <button
                            type="button"
                            className="profile-change"
                            onClick={handleProfileChange}
                        >
                            프로필 전환
                        </button>
                    </div>

                    <button
                        type="button"
                        className="my-premium"
                        onClick={() => navigate('/my/subscription')}
                    >
                        {registeredPassIds.length > 0 ? (
                            <div className="my-pass-icons">
                                {registeredPassIds.map((passId) => (
                                    <img
                                        key={passId}
                                        src={passIcons[passId]}
                                        alt={`${passId} 패스`}
                                        className="my-pass-icon"
                                    />
                                ))}
                            </div>
                        ) : (
                            <span className="my-pass-guide">
                                원하는 패스를 구독해 보세요.
                            </span>
                        )}

                        <img
                            src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                            alt=""
                        />
                    </button>
                </div>
            )}

            {/* 사이드 메뉴: 전체 또는 메뉴 모드 */}
            {mode !== "profile" && (
                <nav className="my-menu" aria-label="마이페이지 메뉴">
                    <ul>
                        {MyMenus.map((menu) => (
                            <li key={menu.id}>
                                {menu.title === "언어 설정" ? (
                                    <button
                                        type="button"
                                        className="my-menu-button"
                                        onClick={onOpenLanguage}
                                    >
                                        {menu.title}
                                    </button>
                                ) : (
                                    <Link to={menu.path}>
                                        {menu.title}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </div>
    );
};

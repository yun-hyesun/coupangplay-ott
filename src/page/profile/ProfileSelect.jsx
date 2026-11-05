import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useProfileStore } from '../../store/useProfileStore'
import { ProfileCard } from './components/ProfileCard'
import './scss/Profile.scss'
import './scss/ProfilePinModal.scss';

export const ProfileSelect = () => {
    const navigate = useNavigate();
    const [lockedProfile, setLockedProfile] = useState(null);
    const [unlockPin, setUnlockPin] = useState('');
    const [pinError, setPinError] = useState('');

    // 로그인 상태
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    // 프로필 상태 및 메서드
    const { profiles, loading, error, onLoadProfiles, onSelectProfile } = useProfileStore();

    // 프로필 수정 모드
    const [isEditMode, setIsEditMode] = useState(false);

    // 로그인 상태 확인 및 프로필 불러오기
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate('/login', { replace: true });
            return;
        }

        onLoadProfiles();
    }, [user, authLoading, navigate, onLoadProfiles]);

    // 프로필 클릭
    const handleProfileClick = async (profileId) => {
        if (isEditMode) {
            navigate(`/profiles/edit/${profileId}`);
            return;
        }

        const profile = profiles.find((item) => item.id === profileId);

        if (profile?.isLocked) {
            setLockedProfile(profile);
            setUnlockPin('');
            setPinError('');
            return;
        }

        const selected = await onSelectProfile(profileId);

        if (selected) {
            navigate('/');
        }
    };

    if (authLoading) {
        return (
            <main className="profile-page">
                <p className="profile-message">로그인 정보를 확인하고 있어요.</p>
            </main>
        );
    }

    if (!user) return null;

    return (
        <main className="profile-page">
            {/* 로고 */}
            <header className="profile-header">
                <Link to="/" aria-label="쿠팡플레이 홈">
                    <img
                        src="/images/header_footer/logo.svg"
                        alt="쿠팡플레이"
                    />
                </Link>
            </header>

            <div className="profile-select-inner">
                <h2>
                    {isEditMode
                        ? '수정할 프로필을 선택하세요'
                        : '프로필을 선택하세요'}
                </h2>

                {loading ? (
                    <p className="profile-message">
                        프로필을 불러오는 중...
                    </p>
                ) : (
                    <>
                        <div className="profile-list">
                            {/* 저장된 프로필 목록 */}
                            {profiles.map((profile) => (
                                <ProfileCard
                                    key={profile.id}
                                    profile={profile}
                                    isEditMode={isEditMode}
                                    onClick={() => handleProfileClick(profile.id)}
                                />
                            ))}

                            {/* 프로필 추가 */}
                            {!isEditMode && (
                                <Link
                                    to="/profiles/create"
                                    className="profile-add"
                                    aria-label="새 프로필 추가"
                                >
                                    <span className="profile-add-icon">+</span>
                                    <span className="profile-add-text">프로필 추가</span>
                                </Link>
                            )}
                        </div>

                        {profiles.length === 0 && (
                            <p className="profile-message">
                                아직 생성된 프로필이 없습니다.
                                새 프로필을 만들어 주세요.
                            </p>
                        )}

                        {error && (
                            <p className="profile-error" role="alert">
                                {error}
                            </p>
                        )}

                        {/* 수정 모드 전환 */}
                        {profiles.length > 0 && (
                            <button
                                type="button"
                                className="profile-edit-btn"
                                onClick={() => setIsEditMode(!isEditMode)}
                            >
                                {isEditMode ? '완료' : '프로필 수정'}
                            </button>
                        )}
                    </>
                )}
            </div>


            {lockedProfile && (
                <div className="profile-pin-overlay">
                    <div
                        className="profile-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-unlock-title"
                    >
                        <h3 id="profile-unlock-title">프로필 잠금 해제</h3>

                        <p>{lockedProfile.name} 프로필의 PIN 번호를 입력해 주세요.</p>

                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={unlockPin}
                            onChange={(e) => {
                                setUnlockPin(e.target.value.replace(/\D/g, ''));
                                setPinError('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget
                                        .closest('.profile-pin-modal')
                                        .querySelector('.profile-pin-buttons button:last-child')
                                        ?.click();
                                }
                            }}
                            placeholder="PIN 4자리"
                            autoFocus
                        />

                        {pinError && (
                            <p className="profile-form-error" role="alert">
                                {pinError}
                            </p>
                        )}

                        <div className="profile-pin-buttons">
                            <button
                                type="button"
                                onClick={() => setLockedProfile(null)}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    const selected = await onSelectProfile(
                                        lockedProfile.id,
                                        unlockPin
                                    );

                                    if (selected) {
                                        setLockedProfile(null);
                                        navigate('/');
                                    } else {
                                        setPinError('PIN 번호가 일치하지 않습니다.');
                                    }
                                }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    )
}

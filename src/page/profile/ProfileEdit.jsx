
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ProfileForm } from './components/ProfileForm';
import './scss/Profile.scss';
import './scss/ProfilePinModal.scss';

export const ProfileEdit = () => {
    const navigate = useNavigate();
    const { profileId } = useParams();

    const { user, loading: authLoading } = useAuthStore();

    const {
        profiles,
        loading,
        error,
        onLoadProfiles,
        onUpdateProfile,
        onUpdateProfileLock,
        onDeleteProfile,
        onVerifyProfilePin
    } = useProfileStore();

    const [message, setMessage] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // 프로필 삭제 모달 상태
    const [deleteModal, setDeleteModal] = useState(false);
    const [deletePinModal, setDeletePinModal] = useState(false);
    const [deletePin, setDeletePin] = useState('');
    const [deleteError, setDeleteError] = useState('');

    // 로그인 상태 확인 후 프로필 목록 불러오기
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate('/login', { replace: true });
            return;
        }

        onLoadProfiles();
    }, [authLoading, user, navigate, onLoadProfiles]);

    // URL에 있는 프로필 ID로 수정할 프로필 찾기
    const profile = profiles.find(
        (item) => item.id === profileId
    );

    // 프로필 수정
    const handleUpdate = async ({ name, avatar, rating, isLocked, pin }) => {
        setMessage('');

        try {
            const result = await onUpdateProfile(profileId, {
                name,
                avatar,
                rating
            });

            if (!result) {
                setMessage('프로필 수정에 실패했습니다.');
                return;
            }

            if (isLocked !== profile.isLocked) {
                const lockResult = await onUpdateProfileLock(
                    profileId,
                    isLocked,
                    pin
                );

                if (!lockResult) {
                    setMessage('프로필 잠금 설정에 실패했습니다.');
                    return;
                }
            }

            navigate('/profiles');
        } catch (error) {
            console.error('프로필 수정 오류:', error);
            setMessage('프로필 수정 중 오류가 발생했습니다.');
        }
    };

    // 프로필 삭제 버튼 클릭
    const handleDeleteClick = () => {
        setDeleteError('');
        setDeletePin('');
        setDeleteModal(true);
    };

    // 실제 프로필 삭제
    const handleDeleteProfile = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        setMessage('');
        setDeleteError('');

        try {
            const result = await onDeleteProfile(profileId);

            if (result) {
                setDeleteModal(false);
                setDeletePinModal(false);
                navigate('/profiles');
            } else {
                setDeleteError('프로필 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('프로필 삭제 오류:', error);
            setDeleteError('프로필 삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    // 삭제 확인 모달에서 삭제 버튼 클릭
    const handleDeleteConfirm = async () => {
        if (isDeleting) return;

        // 잠금 설정된 프로필은 PIN 인증 필요
        if (profile.isLocked) {
            setDeleteModal(false);
            setDeletePinModal(true);
            setDeletePin('');
            setDeleteError('');
            return;
        }

        // 잠금 설정이 없는 프로필은 바로 삭제
        await handleDeleteProfile();
    };

    // PIN 확인 후 프로필 삭제
    const handleDeleteWithPin = async () => {
        if (isDeleting) return;

        if (deletePin.length !== 4) {
            setDeleteError('PIN 번호 4자리를 입력해 주세요.');
            return;
        }

        try {
            const verified = await onVerifyProfilePin(profileId, deletePin);

            if (!verified) {
                setDeleteError('PIN 번호가 일치하지 않습니다.');
                return;
            }

            await handleDeleteProfile();
        } catch (error) {
            console.error('PIN 인증 오류:', error);
            setDeleteError('PIN 번호 확인 중 오류가 발생했습니다.');
        }
    };

    // 삭제 모달 닫기
    const handleCloseDeleteModal = () => {
        if (isDeleting) return;

        setDeleteModal(false);
        setDeletePinModal(false);
        setDeletePin('');
        setDeleteError('');
    };

    if (authLoading || loading) {
        return (
            <main className="profile-page">
                <p>프로필 정보를 불러오는 중...</p>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="profile-page">
                <p>{error || '프로필을 찾을 수 없습니다.'}</p>
                <button onClick={() => navigate('/profiles')}>
                    프로필 선택으로 돌아가기
                </button>
            </main>
        );
    }

    return (
        <main className="profile-page">
            <div className="profile-edit">
                <h2>프로필 수정</h2>
                <p>프로필 정보를 수정할 수 있습니다.</p>

                <ProfileForm
                    key={profile.id}
                    profileId={profileId}
                    initialName={profile.name}
                    initialAvatar={profile.avatar}
                    initialLocked={profile.isLocked}
                    initialRating={profile.rating || 'ALL'}
                    initialAdultVerified={profile.isAdultVerified || false}
                    onSubmit={handleUpdate}
                    onCancel={() => navigate('/profiles')}
                    submitText="완료"
                    loading={loading || isDeleting}
                />

                {message && (
                    <p className="profile-form-error" role="alert">
                        {message}
                    </p>
                )}

                {/* 프로필 삭제 버튼 */}
                <button
                    type="button"
                    className="profile-delete-button"
                    onClick={handleDeleteClick}
                    disabled={loading || isDeleting}
                >
                    프로필 삭제
                </button>
            </div>

            {/* 프로필 삭제 확인 모달 */}
            {deleteModal && (
                <div className="profile-pin-overlay">
                    <div
                        className="profile-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-delete-title"
                    >
                        <h3 id="profile-delete-title">
                            프로필 삭제
                        </h3>

                        <p>
                            정말 이 프로필을 삭제하시겠습니까?
                            <br />
                            삭제한 프로필은 복구할 수 없습니다.
                        </p>

                        {deleteError && (
                            <p className="profile-form-error" role="alert">
                                {deleteError}
                            </p>
                        )}

                        <div className="profile-pin-buttons">
                            <button
                                type="button"
                                onClick={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 잠금 설정된 프로필 삭제 시 PIN 인증 모달 */}
            {deletePinModal && (
                <div className="profile-pin-overlay">
                    <div
                        className="profile-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-delete-pin-title"
                    >
                        <h3 id="profile-delete-pin-title">
                            PIN 번호 확인
                        </h3>

                        <p>
                            프로필 삭제를 위해 기존 PIN 번호를 입력해 주세요.
                        </p>

                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={deletePin}
                            onChange={(e) => {
                                setDeletePin(
                                    e.target.value.replace(/\D/g, '')
                                );
                                setDeleteError('');
                            }}
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter' &&
                                    !e.nativeEvent.isComposing
                                ) {
                                    e.preventDefault();
                                    handleDeleteWithPin();
                                }
                            }}
                            placeholder="PIN 4자리"
                            autoFocus
                            disabled={isDeleting}
                        />

                        {deleteError && (
                            <p className="profile-form-error" role="alert">
                                {deleteError}
                            </p>
                        )}

                        <div className="profile-pin-buttons">
                            <button
                                type="button"
                                onClick={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleDeleteWithPin}
                                disabled={isDeleting}
                            >
                                {isDeleting ? '삭제 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

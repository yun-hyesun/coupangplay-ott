import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ProfileForm } from './components/ProfileForm';
import './scss/Profile.scss';

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
        onDeleteProfile
    } = useProfileStore();

    const [message, setMessage] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

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
    const handleUpdate = async ({ name, avatar, rating }) => {
        setMessage('');

        const result = await onUpdateProfile(profileId, {
            name,
            avatar,
            rating
        });

        if (result) {
            navigate('/profiles');
        } else {
            setMessage('프로필 수정에 실패했습니다.');
        }
    };

    // 프로필 삭제
    const handleDelete = async () => {
        const confirmed = window.confirm(
            '정말 이 프로필을 삭제하시겠습니까?'
        );

        if (!confirmed) return;

        setIsDeleting(true);
        setMessage('');

        try {
            const result = await onDeleteProfile(profileId);

            if (result) {
                navigate('/profiles');
            } else {
                setMessage('프로필 삭제에 실패했습니다.');
            }
        } finally {
            setIsDeleting(false);
        }
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
                    initialName={profile.name}
                    initialAvatar={profile.avatar}
                    initialLocked={profile.isLocked}
                    initialRating={profile.rating || 'ALL'}
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

                <button
                    type="button"
                    className="profile-delete-button"
                    onClick={handleDelete}
                    disabled={loading || isDeleting}
                >
                    프로필 삭제
                </button>
            </div>
        </main>
    );
};

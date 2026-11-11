
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../store/useProfileStore';
import { ProfileForm } from './components/ProfileForm';
import { GenreSelect } from './components/GenreSelect';
import { ContentSelect } from './components/ContentSelect';
import './scss/Profile.scss';

export const ProfileCreate = () => {
    const navigate = useNavigate();

    const { onAddProfile, onUpdateProfile, loading, error } = useProfileStore();

    const [step, setStep] = useState(1);

    const [profileData, setProfileData] = useState({
        name: '',
        avatar: '/images/profile.svg',
        isLocked: false,
        rating: 'ALL'
    });

    const [selectedGenres, setSelectedGenres] = useState([]);
    const [selectedContents, setSelectedContents] = useState([]);

    // 1단계: 기본 프로필 정보
    const handleProfileNext = (data) => {
        if (data.isLocked) {
            alert('프로필 잠금 기능은 추후 구현할 예정입니다.');
            return;
        }

        setProfileData(data);
        setStep(2);
    };

    // 2단계: 장르 선택
    const handleGenreNext = () => {
        if (selectedGenres.length === 0) return;
        setStep(3);
    };

    // 3단계: 콘텐츠 선택 후 Firebase 저장
    const handleContentNext = async () => {
        if (selectedContents.length === 0) return;

        const profileId = await onAddProfile(
            profileData.name,
            profileData.avatar
        );

        if (!profileId) return;

        const result = await onUpdateProfile(profileId, {
            rating: profileData.rating,
            favoriteGenres: selectedGenres,
            favoriteContents: selectedContents.map(item => ({
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: item.title,
                posterPath: item.posterPath
            }))
        });

        if (result) {
            navigate('/profiles');
        }
    };

    return (
        <main className="profile-page">
            <header className="profile-header">
                <Link to="/" aria-label="쿠팡플레이 홈">
                    <img
                        src="/images/header_footer/logo.svg"
                        alt="쿠팡플레이"
                    />
                </Link>
            </header>

            {step === 1 && (
                <div className="profile-create-inner">
                    <h2>프로필 만들기</h2>
                    <ProfileForm
                        initialName={profileData.name}
                        initialAvatar={profileData.avatar}
                        initialLocked={profileData.isLocked}
                        initialRating={profileData.rating}
                        onSubmit={handleProfileNext}
                        onCancel={() => navigate('/profiles')}
                        submitText="다음"
                        loading={loading}
                    />
                </div>
            )}

            {step === 2 && (
                <div className="profile-create-inner">
                    <GenreSelect
                        selectedGenres={selectedGenres}
                        onChange={setSelectedGenres}
                        onNext={handleGenreNext}
                        onPrev={() => setStep(1)}
                    />
                </div>
            )}

            {step === 3 && (
                <div className="profile-create-inner">
                    <ContentSelect
                        selectedContents={selectedContents}
                        onChange={setSelectedContents}
                        onNext={handleContentNext}
                        onPrev={() => setStep(2)}
                    />
                </div>
            )}

            {error && (
                <p className="profile-error" role="alert">
                    {error}
                </p>
            )}
        </main>
    );
};

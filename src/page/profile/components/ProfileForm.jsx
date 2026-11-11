
import React, { useState } from 'react'
import { ProfileModal } from './ProfileModal'
import { ProfileAvatarModal } from './ProfileAvatarModal';
import '../scss/ProfileForm.scss'
import '../scss/ProfilePinModal.scss';
import { useProfileStore } from '../../../store/useProfileStore';

export const ProfileForm = ({
    profileId,
    initialName = '',
    initialAvatar = '/images/profile/profile-img/profile.svg',
    initialLocked = false,
    initialRating = 'ALL',
    initialAdultVerified = false,
    initialPin = '',
    onSubmit,
    onCancel,
    submitText = '다음',
    loading = false
}) => {
    const [name, setName] = useState(initialName);
    const [avatar, setAvatar] = useState(initialAvatar);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(initialLocked);
    const [rating, setRating] = useState(initialRating);
    const [message, setMessage] = useState('');

    // 프로필 PIN 설정
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pin, setPin] = useState(initialPin);
    const [pinConfirm, setPinConfirm] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    const onVerifyProfilePin = useProfileStore(
        (state) => state.onVerifyProfilePin
    );

    // 성인 인증
    const [isAdultVerified, setIsAdultVerified] = useState(initialAdultVerified);
    const [isAdultModalOpen, setIsAdultModalOpen] = useState(false);
    const [birthdate, setBirthdate] = useState('');
    const [adultError, setAdultError] = useState('');
    const [adultLoading, setAdultLoading] = useState(false);

    const onVerifyAdult = useProfileStore(
        (state) => state.onVerifyAdult
    );

    // 시청 등급 모달 열림/닫힘 상태
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

    // 시청 등급 표시용 텍스트
    const ratingLabels = {
        'ALL': '전체 관람가',
        '7': '7세 이상',
        '12': '12세 이상',
        '15': '15세 이상',
        '19': '19세 이상'
    };

    // 프로필 정보 저장
    const handleSubmit = (e) => {
        e.preventDefault();
        setMessage('');

        const trimmedName = name.trim();

        if (trimmedName.length < 2 || trimmedName.length > 10) {
            setMessage('프로필 이름은 2~10자로 입력해 주세요.');
            return;
        }

        // 새 프로필 잠금 설정 시 PIN 확인
        if (!profileId && isLocked && !/^\d{4}$/.test(pin)) {
            setMessage('프로필 잠금 PIN 번호를 설정해 주세요.');
            return;
        }

        onSubmit({
            name: trimmedName,
            avatar,
            isLocked,
            rating,
            pin,
            isAdultVerified
        });
    };

    // PIN 모달 열기
    const handleOpenPinModal = () => {
        setPinError('');
        setPinConfirm('');

        // 기존 프로필 잠금 해제 시에는 기존 PIN을 새로 입력
        if (profileId || !isLocked) {
            setPin('');
        }

        setIsPinModalOpen(true);
    };

    // PIN 모달 닫기
    const handleClosePinModal = () => {
        if (pinLoading) return;

        setIsPinModalOpen(false);
        setPinError('');
        setPinConfirm('');

        // 생성 단계에서는 기존 설정 PIN 유지
        if (profileId || !isLocked) {
            setPin('');
        }
    };

    // PIN 설정 및 해제
    const handleConfirmPin = async () => {
        if (pinLoading) return;

        setPinError('');

        // 새 프로필에서 이미 설정한 잠금을 해제하는 경우
        if (!profileId && isLocked) {
            setIsLocked(false);
            setPin('');
            setPinConfirm('');
            setIsPinModalOpen(false);
            return;
        }

        if (!/^\d{4}$/.test(pin)) {
            setPinError('PIN 번호 4자리를 입력해 주세요.');
            return;
        }

        // 잠금 설정 시 PIN 재확인
        if (!isLocked && pin !== pinConfirm) {
            setPinError('PIN 번호가 일치하지 않습니다.');
            return;
        }

        // 기존 프로필 잠금 해제 시 PIN 검증
        if (profileId && isLocked) {
            if (!onVerifyProfilePin) {
                setPinError('PIN 확인 기능을 사용할 수 없습니다.');
                return;
            }

            setPinLoading(true);

            try {
                const verified = await onVerifyProfilePin(profileId, pin);

                if (!verified) {
                    setPinError('기존 PIN 번호가 일치하지 않습니다.');
                    return;
                }
            } catch (error) {
                console.error('PIN 확인 오류:', error);
                setPinError('PIN 확인 중 오류가 발생했습니다.');
                return;
            } finally {
                setPinLoading(false);
            }
        }

        setIsLocked(!isLocked);
        setIsPinModalOpen(false);
        setPinConfirm('');

        // 기존 프로필은 변경값만 유지하고 PIN 입력값 초기화
        // 새 프로필은 생성 시 저장해야 하므로 PIN 유지
        if (profileId) {
            // 잠금 설정 시 새 PIN은 저장 버튼에서 사용
            // 잠금 해제 시에도 기존 ProfileEdit 흐름에서 PIN 전달
        }
    };

    // PIN 입력창에서 Enter를 누르면 확인 버튼 실행
    const handlePinEnter = (e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleConfirmPin();
        }
    };

    // 성인 인증 모달 닫기
    const handleCloseAdultModal = () => {
        if (adultLoading) return;

        setIsAdultModalOpen(false);
        setBirthdate('');
        setAdultError('');
    };

    // 생년월일 검증 및 만 나이 계산
    const getAgeFromBirthdate = (value) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        if (year < 1900) return null;

        const birth = new Date(year, month - 1, day);
        const today = new Date();

        if (
            birth.getFullYear() !== year ||
            birth.getMonth() !== month - 1 ||
            birth.getDate() !== day ||
            birth > today
        ) {
            return null;
        }

        let age = today.getFullYear() - year;

        if (
            today.getMonth() + 1 < month ||
            (
                today.getMonth() + 1 === month &&
                today.getDate() < day
            )
        ) {
            age--;
        }

        return age;
    };

    // 성인 인증하기
    const handleVerifyAdult = async () => {
        if (adultLoading) return;

        setAdultError('');

        const age = getAgeFromBirthdate(birthdate);

        if (age === null) {
            setAdultError('올바른 생년월일을 입력해 주세요.');
            return;
        }

        if (age < 19) {
            setAdultError('만 19세 이상만 인증할 수 있습니다.');
            return;
        }

        // 프로필 생성 단계에서는 인증 결과만 임시 저장
        if (!profileId) {
            setIsAdultVerified(true);
            setIsAdultModalOpen(false);
            setBirthdate('');
            return;
        }

        // 프로필 수정 단계에서는 Firebase에 즉시 저장
        setAdultLoading(true);

        try {
            const result = await onVerifyAdult(profileId, birthdate);

            if (result) {
                setIsAdultVerified(true);
                setIsAdultModalOpen(false);
                setBirthdate('');
                setAdultError('');
            } else {
                const storeError = useProfileStore.getState().error;

                setAdultError(
                    storeError || '성인 인증에 실패했습니다.'
                );
            }
        } catch (error) {
            console.error('성인 인증 오류:', error);
            setAdultError('성인 인증 중 오류가 발생했습니다.');
        } finally {
            setAdultLoading(false);
        }
    };

    // 생년월일 입력값 변경
    const handleBirthdateChange = (part, value) => {
        const numericValue = value.replace(/\D/g, '');

        const [year = '', month = '', day = ''] = birthdate.split('-');

        const nextValues = {
            year,
            month,
            day,
            [part]: numericValue
        };

        setBirthdate(
            `${nextValues.year}-${nextValues.month}-${nextValues.day}`
        );
        setAdultError('');
    };

    const [birthYear = '', birthMonth = '', birthDay = ''] =
        birthdate.split('-');

    return (
        <form className="profile-form" onSubmit={handleSubmit}>

            {/* 프로필 이미지 */}
            <button
                type="button"
                className="profile-form-avatar"
                onClick={() => setIsAvatarModalOpen(true)}
                disabled={loading}
                aria-label="프로필 이미지 변경"
                aria-haspopup="dialog"
            >
                <img src={avatar} alt="현재 프로필 이미지" />
                <span className="profile-avatar-edit" aria-hidden="true">
                    <span>✎</span>
                </span>
            </button>

            {/* 프로필 이름 */}
            <div className="profile-form-field">
                <label htmlFor="profile-name" className="sr-only">
                    프로필 이름
                </label>

                <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="프로필 이름을 입력해 주세요."
                    maxLength={10}
                    required
                />

                <p>
                    2자 이상 10자 이내의 한글, 영문, 숫자 입력이 가능합니다.
                </p>
            </div>

            {/* 프로필 설정 카드 */}
            <div className="profile-form-settings">

                {/* 프로필 잠금 설정 */}
                <div className="profile-setting-row">
                    <span>프로필 잠금 설정</span>

                    <button
                        type="button"
                        className={`profile-lock-toggle ${isLocked ? 'active' : ''}`}
                        role="switch"
                        aria-checked={isLocked}
                        aria-label="프로필 잠금 설정"
                        onClick={handleOpenPinModal}
                        disabled={loading}
                    >
                        <span />
                    </button>
                </div>

                {/* 성인 인증 */}
                <div className="profile-setting-row">
                    <span>성인 인증</span>

                    <button
                        type="button"
                        className="profile-rating-btn"
                        onClick={() => {
                            setAdultError('');
                            setBirthdate('');
                            setIsAdultModalOpen(true);
                        }}
                        disabled={loading || isAdultVerified}
                        aria-haspopup="dialog"
                    >
                        <span>
                            {isAdultVerified ? '인증 완료' : '인증 전'}
                        </span>

                        {!isAdultVerified && (
                            <span
                                className="profile-rating-arrow"
                                aria-hidden="true"
                            >
                                ›
                            </span>
                        )}
                    </button>
                </div>

                {/* 시청등급 설정 */}
                <div className="profile-setting-row">
                    <span>프로필 시청등급 설정</span>

                    <button
                        type="button"
                        className="profile-rating-btn"
                        onClick={() => setIsRatingModalOpen(true)}
                        disabled={loading}
                        aria-haspopup="dialog"
                    >
                        <span>
                            {ratingLabels[rating] || '전체 관람가'}
                        </span>
                        <span
                            className="profile-rating-arrow"
                            aria-hidden="true"
                        >
                            ›
                        </span>
                    </button>
                </div>

            </div>

            {/* 오류 메시지 */}
            {message && (
                <p className="profile-form-error" role="alert">
                    {message}
                </p>
            )}

            {/* 완료 / 취소 버튼 */}
            <div className="profile-form-buttons">
                <button type="submit" disabled={loading}>
                    {loading ? '저장 중...' : submitText}
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                >
                    취소
                </button>
            </div>

            {/* 시청 등급 선택 모달 */}
            {isRatingModalOpen && (
                <ProfileModal
                    rating={rating}
                    isOpen={isRatingModalOpen}
                    onConfirm={(selectedRating) => {
                        setRating(selectedRating);
                        setIsRatingModalOpen(false);
                    }}
                    onClose={() => setIsRatingModalOpen(false)}
                />
            )}

            {/* 프로필 이미지 선택 모달 */}
            <ProfileAvatarModal
                isOpen={isAvatarModalOpen}
                selectedAvatar={avatar}
                onSelect={setAvatar}
                onClose={() => setIsAvatarModalOpen(false)}
            />

            {/* 프로필 PIN 설정 및 해제 모달 */}
            {isPinModalOpen && (
                <div className="profile-pin-overlay">
                    <div
                        className="profile-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-pin-title"
                    >
                        <h3 id="profile-pin-title">
                            {isLocked ? '프로필 잠금 해제' : '프로필 잠금 설정'}
                        </h3>

                        <p>
                            {isLocked
                                ? profileId
                                    ? '기존 PIN 번호를 입력해 주세요.'
                                    : '설정한 프로필 잠금을 해제하시겠습니까?'
                                : '사용할 PIN 번호 4자리를 설정해 주세요.'}
                        </p>

                        {/* 새 프로필 잠금 해제는 PIN 재입력 불필요 */}
                        {(!isLocked || profileId) && (
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value.replace(/\D/g, ''));
                                    setPinError('');
                                }}
                                onKeyDown={handlePinEnter}
                                placeholder="PIN 4자리"
                                autoFocus
                            />
                        )}

                        {!isLocked && (
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pinConfirm}
                                onChange={(e) => {
                                    setPinConfirm(
                                        e.target.value.replace(/\D/g, '')
                                    );
                                    setPinError('');
                                }}
                                onKeyDown={handlePinEnter}
                                placeholder="PIN 번호 확인"
                            />
                        )}

                        {pinError && (
                            <p className="profile-form-error" role="alert">
                                {pinError}
                            </p>
                        )}

                        <div className="profile-pin-buttons">
                            <button
                                type="button"
                                onClick={handleClosePinModal}
                                disabled={pinLoading}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmPin}
                                disabled={pinLoading}
                            >
                                {pinLoading ? '확인 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 성인 인증 모달 */}
            {isAdultModalOpen && (
                <div className="profile-pin-overlay">
                    <div
                        className="profile-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-adult-title"
                    >
                        <h3 id="profile-adult-title">
                            성인 인증
                        </h3>

                        <p>
                            생년월일을 입력해 주세요.
                            {' '}
                            만 19세 이상만 인증할 수 있습니다.
                            {' '}
                            (포트폴리오 시연용)
                        </p>

                        {/* 생년월일 입력창 */}
                        <div className="profile-birth-inputs">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="YYYY"
                                value={birthYear}
                                onChange={(e) =>
                                    handleBirthdateChange(
                                        'year',
                                        e.target.value
                                    )
                                }
                                aria-label="출생 연도"
                                autoFocus
                                disabled={adultLoading}
                            />

                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                placeholder="MM"
                                value={birthMonth}
                                onChange={(e) =>
                                    handleBirthdateChange(
                                        'month',
                                        e.target.value
                                    )
                                }
                                aria-label="출생 월"
                                disabled={adultLoading}
                            />

                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                placeholder="DD"
                                value={birthDay}
                                onChange={(e) =>
                                    handleBirthdateChange(
                                        'day',
                                        e.target.value
                                    )
                                }
                                aria-label="출생 일"
                                disabled={adultLoading}
                            />
                        </div>

                        {adultError && (
                            <p
                                className="profile-form-error"
                                role="alert"
                            >
                                {adultError}
                            </p>
                        )}

                        <div className="profile-pin-buttons">
                            <button
                                type="button"
                                onClick={handleCloseAdultModal}
                                disabled={adultLoading}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleVerifyAdult}
                                disabled={adultLoading}
                            >
                                {adultLoading ? '인증 중...' : '인증하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </form>
    );
};

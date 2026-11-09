import { Link } from 'react-router-dom';

import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import { useSpoilerAccess } from '../wowclip/hooks/useSpoilerAccess';
import { useWowClipLibrary } from '../wowclip/hooks/useWowClipLibrary';
import { clipPreview } from '../wowclip/utils/wowClipData';

import './scss/MyWowClip.scss';

export const MyWowClip = () => {
    // 현재 로그인 계정
    const user = useAuthStore((state) => state.user);

    // 현재 선택된 프로필
    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    // 팀원이 구현한 와우 클립 데이터
    const { clips, error } = useWowClipLibrary();

    // WowClip.jsx와 동일한 작성자 ID
    const ownerId =
        `${user?.uid || 'local'}:${currentProfile?.id || 'default'}`;
    const historyOwner = user?.uid && currentProfile?.id
        ? `${user.uid}_${currentProfile.id}`
        : null;
    const history = useWatchHistoryStore((state) =>
        historyOwner && state.ownerKey === historyOwner ? state.history : undefined
    );

    // 현재 프로필이 제작한 클립만 표시
    const myClips = clips
        .filter((clip) => clip.ownerId === ownerId)
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
        .slice(0, 5);
    const { isProtected } = useSpoilerAccess(myClips, history);

    return (
        <section className="my-wowclip">
            <div className="my-wowclip-header">
                <Link
                    to="/wowclip?view=mine"
                    className="my-wowclip-heading"
                >
                    <h2>내 와우 클립</h2>
                    <img
                        className="my-wowclip-arrow"
                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                        alt=""
                    />
                </Link>

                <Link
                    to="/wowclip?view=mine"
                    className="my-wowclip-more"
                    aria-label="내 와우 클립 전체 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>


            {!user || !currentProfile ? (
                <p className="my-wowclip-message">프로필을 먼저 선택해 주세요.</p>
            ) : error ? (
                <p className="my-wowclip-message">{error}</p>
            ) : myClips.length === 0 ? (
                <p className="my-wowclip-message">아직 만든 와우 클립이 없습니다.</p>
            ) : (
                <div className="my-wowclip-grid">
                    {myClips.map((clip) => {
                        const protectedClip = isProtected(clip);
                        const { image, title } = clipPreview(clip, protectedClip);
                        return (
                            <Link
                                key={clip.id}
                                to={`/wowclip?view=mine&clip=${encodeURIComponent(clip.id)}`}
                                className="my-wowclip-item"
                                aria-label={protectedClip ? `스포일러 포함, ${title} 클립 보기` : undefined}
                            >
                                <div className="my-wowclip-thumbnail">
                                    {image ? <img src={image} alt="" /> : <span>{protectedClip ? '스포일러가 있어요' : 'WOW CLIP'}</span>}
                                </div>

                                <h3>{title}</h3>
                                <p>조회수 {clip.views || 0}회</p>
                            </Link>
                        );
                    })}
                </div>
            )}

        </section>
    );
};

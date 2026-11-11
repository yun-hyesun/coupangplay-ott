import { Link } from 'react-router-dom';
import { ChannelBanner } from './components/ChannelBanner';
import { ContentRail } from '../../components/content/ContentRail';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';

import './scss/ChannelPage.scss';
import './scss/Adult.scss';

export const Adult = () => {
  const user = useAuthStore((state) => state.user);

  const profile = useProfileStore(
    (state) => state.currentProfile
  );

  const isLocked =
    !user || profile?.isAdultVerified !== true;

  return (
    <main className="channel-page adult-page">
      <div
        className={`adult-page__content${
          isLocked ? ' is-locked' : ''
        }`}
        inert={isLocked ? true : undefined}
        aria-hidden={isLocked ? true : undefined}
      >
        <ChannelBanner
          railKey="adult-banner"
          logo="/images/channal04.svg"
          name="Adult"
          buttonImg="/images/channal04.svg"
          description="성인 전용 콘텐츠를 만나보세요."
        />

        {/* 랭킹 */}
        <ContentRail
          railKey="adult-ranking"
          layout="vertical"
          showMore={false}
          title={
            <span className="channel-rail-title">
              <img src="/images/channal04.svg" alt="adult" />
              <span>TOP 20</span>
            </span>
          }
        />

        {/* 일반 레일 7개 */}
        <ContentRail railKey="adult-latest" />
        <ContentRail railKey="adult-korean" />
        <ContentRail railKey="adult-overseas" />
        <ContentRail railKey="adult-action-crime" />
        <ContentRail railKey="adult-thriller-mystery" />
        <ContentRail railKey="adult-horror" />
        <ContentRail railKey="adult-classics" />
      </div>

      {isLocked && (
        <div className="adult-page__lock">
          <section
            className="adult-page__notice"
            aria-labelledby="adult-lock-title"
          >
            <span
              className="adult-page__age"
              aria-hidden="true"
            >
              19
            </span>

            <h2 id="adult-lock-title">
              성인 인증이 필요한 채널입니다
            </h2>

            <p>
              {user
                ? '성인 인증을 완료한 프로필로 이용해 주세요.'
                : '로그인 후 성인 인증을 완료해 주세요.'}
            </p>

            <Link
              to={user ? '/profiles' : '/login'}
              className="channel-sign"
            >
              {user ? '프로필 선택하기' : '로그인하기'}
            </Link>

            <Link
              to="/"
              className="adult-page__back"
            >
              홈으로 돌아가기
            </Link>
          </section>
        </div>
      )}
    </main>
  );
};
import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Sony = () => (
  <main className="channel-page sony-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal09_title.svg"
      name="SONY PICTURES"
      buttonImg="/images/channal09_title.svg"
      description="스크린을 채우는 다양한 영화"
    />

    <ContentRail
      railKey="sony-popular"
      layout="vertical"
      showMore={false}
      title={
        <span className="channel-rail-title">
          <img src="/images/channal09_title.svg" alt="sony" />
          <span>TOP 20</span>
        </span>
      }
    />
    <ContentRail railKey="sony-latest" />
    <ContentRail railKey="sony-action" />
    <ContentRail railKey="sony-thriller" />
    <ContentRail railKey="sony-family" />
  </main>
);

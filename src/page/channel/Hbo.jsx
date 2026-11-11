import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Hbo = () => (
  <main className="channel-page hbo-page">
    <ChannelBanner
      contentId={1399}
      logo="/images/channal12.svg"
      name="HBO"
      buttonImg="/images/channal12_bk.svg"
      description="깊이 있는 이야기, 몰입하는 시리즈"
    />

    <ContentRail
      railKey="hbo-popular"
      layout="vertical"
      showMore={false}
      title={
        <span className="channel-rail-title">
          <img src="/images/channal12.svg" alt="hbo" />
          <span>TOP 20</span>
        </span>
      }
    />
    <ContentRail railKey="hbo-latest" />
    <ContentRail railKey="hbo-crime" />
    <ContentRail railKey="hbo-fantasy" />
    <ContentRail railKey="hbo-completed" />
  </main>
);

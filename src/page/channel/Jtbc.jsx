import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Jtbc = () => (
  <main className="channel-page jtbc-page">
    <ChannelBanner
      railKey="jtbc-banner"
      logo="/images/channal07.svg"
      name="JTBC"
      buttonImg="/images/channal07.svg"
      description="드라마부터 예능까지, 함께 보는 즐거움"
    />

    <ContentRail
      railKey="jtbc-popular"
      layout="vertical"
      showMore={false}
      title={
        <span className="channel-rail-title">
          <img src="/images/channal07.svg" alt="JTBC" />
          <span>TOP 20</span>
        </span>
      }
    />
    <ContentRail railKey="jtbc-latest" />
    <ContentRail railKey="jtbc-drama" />
    <ContentRail railKey="jtbc-variety" />
    <ContentRail railKey="jtbc-completed" />
  </main>
);

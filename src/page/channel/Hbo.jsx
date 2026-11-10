import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Hbo = () => (
  <main className="channel-page hbo-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal12.svg"
      name="HBO"
      description="깊이 있는 이야기, 몰입하는 시리즈"
    />

    <ContentRail railKey="hbo-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="hbo-latest" />
    <ContentRail railKey="hbo-crime" />
    <ContentRail railKey="hbo-fantasy" />
    <ContentRail railKey="hbo-completed" />
  </main>
);

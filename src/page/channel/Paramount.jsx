import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Paramount = () => (
  <main className="channel-page paramount-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal08.svg"
      name="Paramount+"
      description="다양한 이야기로 만나는 미국 시리즈"
    />

    <ContentRail railKey="paramount-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="paramount-latest" />
    <ContentRail railKey="paramount-crime" />
    <ContentRail railKey="paramount-action" />
    <ContentRail railKey="paramount-completed" />
  </main>
);

import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Jplus = () => (
  <main className="channel-page jplus-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal11.svg"
      name="JPlus"
      description="다양한 이야기로 만나는 일본 드라마"
    />

    <ContentRail railKey="jplus-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="jplus-latest" />
    <ContentRail railKey="jplus-crime" />
    <ContentRail railKey="jplus-comedy" />
    <ContentRail railKey="jplus-completed" />
  </main>
);

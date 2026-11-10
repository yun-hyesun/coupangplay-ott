import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Sony = () => (
  <main className="channel-page sony-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal09.svg"
      name="SONY PICTURES"
      description="스크린을 채우는 다양한 영화"
    />

    <ContentRail railKey="sony-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="sony-latest" />
    <ContentRail railKey="sony-action" />
    <ContentRail railKey="sony-thriller" />
    <ContentRail railKey="sony-family" />
  </main>
);

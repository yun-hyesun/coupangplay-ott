import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Moa = () => (
  <main className="channel-page moa-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal10.svg"
      name="M.OA"
      description="중국 드라마에서 만나는 다양한 이야기"
    />

    <ContentRail railKey="moa-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="moa-latest" />
    <ContentRail railKey="moa-romance" />
    <ContentRail railKey="moa-historical" />
    <ContentRail railKey="moa-completed" />
  </main>
);

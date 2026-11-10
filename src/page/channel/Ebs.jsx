import { ChannelBanner } from './components/ChannelBanner';
import { Channel } from '../home/components/Channel';
import { ContentRail } from '../../components/content/ContentRail';
import './scss/ChannelPage.scss';

export const Ebs = () => (
  <main className="channel-page ebs-page">
    <ChannelBanner
      railKey="sony-banner"
      logo="/images/channal01.svg"
      name="EBS ON"
      description="교육과 교양, 새로운 배움의 시작"
    />
    
    <ContentRail railKey="ebs-popular" layout="vertical" showMore={false}/>
    <ContentRail railKey="ebs-latest" />
    <ContentRail railKey="ebs-documentary" />
    <ContentRail railKey="ebs-kids" />
  </main>
);

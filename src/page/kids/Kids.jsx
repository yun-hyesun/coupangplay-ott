import { ContentRail } from '../../components/content/ContentRail';
import { MainBanner } from '../../components/content/MainBanner';
import { KidsCategoryMenu } from './components/KidsCategoryMenu';

export const Kids = () => {
  return (
    <main className="kids-page">
      <MainBanner type="kids" />

      <KidsCategoryMenu />

      <ContentRail railKey="kids-ranking" showMore={false}/>

      <ContentRail railKey="kids-korean-animation" />

      <ContentRail railKey="kids-family" />

      <ContentRail railKey="kids-animation" />

      <ContentRail railKey="kids-latest" />

      <ContentRail railKey="kids-fantasy-adventure" />
    </main>
  );
};
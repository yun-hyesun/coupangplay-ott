import { StoreMarvelSection } from './components/StoreMarvelSection';
import { StoreChannelPasses } from '../category/components/StoreChannelPasses';
import './scss/Store.scss';
import { CategoryMenu } from '../../components/content/CategoryMenu';
import { MainBanner } from '../../components/content/MainBanner';
import { ContentRail } from '../../components/content/ContentRail';

export const Store = () => {
  return (
    <main className="store-page">
      
      <MainBanner type="purchase" />
      <CategoryMenu section="store" />

      <ContentRail railKey="store-ranking" showMore={false}/>

      <ContentRail railKey="store-latest" />

      <ContentRail railKey="store-action-adventure" />

      <StoreChannelPasses />

      <StoreMarvelSection />

      <ContentRail railKey="store-family-animation" />
    </main>
  );
};

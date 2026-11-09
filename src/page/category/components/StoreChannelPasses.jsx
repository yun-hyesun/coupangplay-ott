import { Link } from 'react-router-dom';
import { storeChannelPasses } from '../storePassConfig';
import '../scss/StoreChannelPasses.scss';

// 로고는 Figma 원본을 로컬 자산으로 보존합니다. CSS 마스크/클리핑도 원본과 동일합니다.
export const StoreChannelPasses = () => (
 <section className="store-channel-passes" aria-labelledby="store-channel-passes-title">
  <h2 id="store-channel-passes-title">채널 패스로 골라보기</h2>
  <div className="store-channel-passes__grid">
   {storeChannelPasses.map(pass => (
    <Link key={pass.id} className="store-channel-passes__card"
     to={`/my/subscription/checkout?plan=${pass.id}`} aria-label={`${pass.name} 패스 안내 및 구독`}>
     <span className="store-channel-passes__logo" aria-hidden="true"><span className={`store-channel-passes__brand store-channel-passes__brand--${pass.brand}`} /></span>
     <span className="store-channel-passes__description">{pass.description}</span>
    </Link>
   ))}
  </div>
 </section>
);

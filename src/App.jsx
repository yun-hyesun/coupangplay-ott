
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

// 공통 레이아웃
import { MainLayout } from './components/layout/MainLayout';

// 메인 메뉴
import { Home } from './page/home/Home';
import { Sports } from './page/sports/Sports';
import { LeagueDetail } from './page/sports/LeagueDetail';
import { Entertainment } from './page/entertainment/Entertainment';
import { Movie } from './page/movie/Movie';
import { Store } from './page/store/Store';
import { Drama } from './page/drama/Drama';
import { Kids } from './page/kids/Kids';

// 약관 및 정책
import { Policy } from './page/policy/Policy';
import { Partnership } from './page/partnership/Partnership';

// 상세페이지
import { Detail } from './page/detail/Detail';
import { Watch } from './page/watch/Watch';

// 개별 결제창
import { PurchaseCheckout } from './page/purchase/PurchaseCheckout';

// 로그인, 회원가입
import { Signup } from './page/login/SignUp';
import { Login } from './page/login/Login';

// 프로필
import { ProfileSelect } from '././page/profile/ProfileSelect';
import { ProfileCreate } from './page/profile/ProfileCreate';
import { ProfileEdit } from '././page/profile/ProfileEdit';

// 마이페이지
import { MyPage } from './page/my/MyPage';
import { MyHistory } from './page/my/MyHistory';
import { MyWatchlist } from './page/my/MyWatchlist';
import { MyPurchases } from './page/my/MyPurchases';
import { MyLive } from './page/my/MyLive';
import { MyPassGuide } from './page/my/MyPassGuide';
import { MySubscriptionCheckout } from './page/my/MySubscriptionCheckout';
import { MyMembership } from './page/my/MyMembership';
import { MySubscription } from './page/my/MySubscription';
import { MyPaymentHistory } from './page/my/MyPaymentHistory';
import { MyTicket } from './page/my/MyTicket';
import { MyCoupon } from './page/my/MyCoupon';
import { MyReview } from './page/my/MyReview';
import { MyFeedback } from './page/my/MyFeedback';
import { MySupport } from './page/my/MySupport';
import { MyNews } from './page/my/MyNews';

import { ChannelSubscriptionGate } from './page/channel/components/ChannelSubscriptionGate';

// 더보기
import { More } from './page/more/More';
// 검색
import { Search } from './page/search/Search';
// 카테고리
import { Category } from './page/category/Category';

// Firebase 인증
import { useAuthStore } from './store/useAuthStore';

import { WowClip } from './page/wowclip/WowClip';

// 채널
import { Ebs } from './page/channel/Ebs';
import { Paramount } from './page/channel/Paramount';
import { Moa } from './page/channel/Moa';
import { Jtbc } from './page/channel/Jtbc';
import { Sony } from './page/channel/Sony';
import { Jplus } from './page/channel/Jplus';
import { Hbo } from './page/channel/Hbo';
import { Adult } from './page/channel/Adult';

function App() {
  const onAuthCheck = useAuthStore((state) => state.onAuthCheck);

  useEffect(() => {
    const unsubscribe = onAuthCheck();

    return () => unsubscribe();
  }, [onAuthCheck]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* 메인 */}
        <Route path="/" element={<Home />} />

        {/* 메뉴 페이지 */}
        <Route path="/sports" element={<Sports />} />
        <Route path="/sports/league/:leagueId" element={<LeagueDetail />} />
        <Route path="/drama" element={<Drama />} />
        <Route path="/entertainment" element={<Entertainment />} />
        <Route path="/movie" element={<Movie />} />
        <Route path="/store" element={<Store />} />
        <Route path="/kids" element={<Kids />} />

        {/* 제휴 문의: 푸터의 /partnership 링크 연결 */}
        <Route path="/partnership" element={<Partnership />} />

        {/* 약관 및 정책 */}
        <Route path="/privacy" element={<Policy />} />
        <Route path="/terms" element={<Policy />} />
        <Route path="/wow-terms" element={<Policy />} />
        <Route path="/play-standard" element={<Policy />} />
        <Route path="/paid-terms" element={<Policy />} />

        {/* 상세페이지 */}
        <Route path="/detail/:type/:id" element={<Detail />} />
        <Route path="/watch/:type/:id" element={<Watch />} />

        {/* 개별 결제창 */}
        <Route path="/purchase/checkout/:type/:id" element={<PurchaseCheckout />} />

        {/* 로그인, 회원가입 */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 마이페이지 */}
        <Route path="/my" element={<MyPage />} />
        <Route path="/my/history" element={<MyHistory />} />
        <Route path="/my/watchlist" element={<MyWatchlist />} />
        <Route path="/my/purchases" element={<MyPurchases />} />
        <Route path="/my/live" element={<MyLive />} />
        <Route path="/my/ticket" element={<MyTicket />} />
        <Route path="/my/coupon" element={<MyCoupon />} />
        <Route path="/my/review" element={<MyReview />} />
        <Route path="/my/feedback" element={<MyFeedback />} />
        <Route path="/my/support" element={<MySupport />} />
        <Route path="/my/news" element={<MyNews />} />

        {/* 구독내역 */}
        <Route path="/my/subscription/passes" element={<MyPassGuide />} />
        <Route path="/my/subscription/checkout" element={<MySubscriptionCheckout />} />
        <Route path="/my/subscription/membership" element={<MyMembership />} />
        <Route path="/my/subscription" element={<MySubscription />} />
        <Route path="/my/subscription/payment" element={<MyPaymentHistory />} />

        {/* 더보기 */}
        <Route path="/more" element={<More />} />
        <Route path="/wowclip" element={<WowClip />} />
        {/* 검색 */}
        <Route path="/search" element={<Search />} />
        {/* 카테고리 */}
        <Route path="/category/:section/:categoryId" element={<Category />} />


        {/* 체널 */}
        {/* 구독 패스가 있는 채널 */}
        <Route
          path="/channel/ebs"
          element={
            <ChannelSubscriptionGate planId="ebs-pass">
              <Ebs />
            </ChannelSubscriptionGate>
          }
        />

        <Route
          path="/channel/sony"
          element={
            <ChannelSubscriptionGate planId="sony-pass">
              <Sony />
            </ChannelSubscriptionGate>
          }
        />

        <Route
          path="/channel/paramount"
          element={
            <ChannelSubscriptionGate planId="paramount-pass">
              <Paramount />
            </ChannelSubscriptionGate>
          }
        />

        <Route
          path="/channel/moa"
          element={
            <ChannelSubscriptionGate planId="moa-pass">
              <Moa />
            </ChannelSubscriptionGate>
          }
        />

        <Route
          path="/channel/jplus"
          element={
            <ChannelSubscriptionGate planId="jplus-pass">
              <Jplus />
            </ChannelSubscriptionGate>
          }
        />

        {/* 별도 구독 상품이 없는 채널 */}
        <Route path="/channel/jtbc" element={<Jtbc />} />
        <Route path="/channel/hbo" element={<Hbo />} />
        <Route path="/channel/adult" element={<Adult />} />

      </Route>

      {/* 프로필 관련 페이지 */}
      <Route path="/profiles" element={<ProfileSelect />} />
      <Route path="/profiles/create" element={<ProfileCreate />} />
      <Route path="/profiles/edit/:profileId" element={<ProfileEdit />} />
    </Routes>
  );
}

export default App;

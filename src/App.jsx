
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

// 공통 레이아웃
import { MainLayout } from './components/layout/MainLayout';

// 메인 메뉴
import { Home } from './page/home/Home';
import { Sports } from './page/sports/Sports';
import { Entertainment } from './page/entertainment/Entertainment';
import { Movie } from './page/movie/Movie';
import { Store } from './page/store/Store';
import { Drama } from './page/drama/Drama';
import { Kids } from './page/kids/Kids';

// 로그인, 회원가입
import { Signup } from './page/login/SignUp';
import { Login } from './page/login/Login';

// 프로필
import { ProfileSelect } from './page/profile/ProfileSelect';
import { ProfileCreate } from './page/profile/ProfileCreate';
import { ProfileEdit } from './page/profile/ProfileEdit';

// 마이페이지
import { MyPage } from './page/my/MyPage';
import { MyHistory } from './page/my/MyHistory';
import { MyWatchlist } from './page/my/MyWatchlist';
import { MyPurchases } from './page/my/MyPurchases';
import { MyLive } from './page/my/MyLive';

// 더보기
import { More } from './page/more/More';

// Firebase 인증
import { useAuthStore } from './store/useAuthStore';

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
        <Route path="/drama" element={<Drama />} />
        <Route path="/entertainment" element={<Entertainment />} />
        <Route path="/movie" element={<Movie />} />
        <Route path="/store" element={<Store />} />
        <Route path="/kids" element={<Kids />} />

        {/* 로그인, 회원가입 */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 마이페이지 */}
        <Route path="/my" element={<MyPage />} />
        <Route path="/my/history" element={<MyHistory />} />
        <Route path="/my/watchlist" element={<MyWatchlist />} />
        <Route path="/my/purchases" element={<MyPurchases />} />
        <Route path="/my/live" element={<MyLive />} />

        {/* 더보기 */}
        <Route path="/more" element={<More />} />
      </Route>

      {/* 프로필 관련 페이지 */}
      <Route path="/profiles" element={<ProfileSelect />} />
      <Route path="/profiles/create" element={<ProfileCreate />} />
      <Route path="/profiles/edit/:profileId" element={<ProfileEdit />} />
    </Routes>
  );
}

export default App;

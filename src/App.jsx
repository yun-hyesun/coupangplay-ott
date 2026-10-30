import { useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { Route, Routes } from 'react-router-dom'
import { Home } from './page/home/Home'
import { Sports } from './page/sports/Sports'
import { Entertainment } from './page/entertainment/Entertainment'
import { Movie } from './page/movie/Movie'
import { Store } from './page/store/Store'
import { Drama } from './page/drama/Drama'
import { Kids } from './page/kids/Kids'
import { MyPage } from './page/my/MyPage'
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Signup } from './page/login/SignUp'
import { Login } from './page/login/Login'
import { ProfileSelect } from './page/profile/ProfileSelect'
import { ProfileCreate } from './page/profile/ProfileCreate'
import { ProfileEdit } from './page/profile/ProfileEdit'

function App() {
  const onAuthCheck = useAuthStore((state) => state.onAuthCheck);

  useEffect(() => {
    const unsubscribe = onAuthCheck();

    return () => unsubscribe();
  }, [onAuthCheck]);

  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path='/' element={<Home />} />

          {/* 메뉴페이지 */}
          <Route path='/sports' element={<Sports />} />
          <Route path='/drama' element={<Drama />} />
          <Route path='/entertainment' element={<Entertainment />} />
          <Route path='/movie' element={<Movie />} />
          <Route path='/store' element={<Store />} />
          <Route path='/kids' element={<Kids />} />

          {/* 로그인, 회원가입 */}
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />

          {/* 마이페이지 */}
          <Route path='/my' element={<MyPage />} />
        </Route>

        {/* 프로필 관련 페이지 */}
        <Route path="/profiles" element={<ProfileSelect />} />
        <Route path="/profiles/create" element={<ProfileCreate />} />
        <Route path="/profiles/edit/:profileId" element={<ProfileEdit />} />
      </Routes>
    </>
  )
}

export default App

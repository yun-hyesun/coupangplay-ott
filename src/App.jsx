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

function App() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path='/' element={<Home/>}/>

          {/* 메뉴페이지 */}
          <Route path='/sports' element={<Sports />}/>
          <Route path='/drama' element={<Drama />}/>
          <Route path='/entertainment' element={<Entertainment />}/>
          <Route path='/movie' element={<Movie />}/>
          <Route path='/store' element={<Store />}/>
          <Route path='/kids' element={<Kids />}/>
        </Route>
      </Routes>
    </>
  )
}

export default App

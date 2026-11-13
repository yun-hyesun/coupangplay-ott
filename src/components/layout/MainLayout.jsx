import React from 'react'
import { Header } from './Header'
import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { ScrollTopButton } from '../common/ScrollTopButton';

export const MainLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <ScrollTopButton />
    </>
  )
}

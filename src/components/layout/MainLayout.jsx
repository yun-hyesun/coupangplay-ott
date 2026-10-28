import React from 'react'
import { Header } from './Header'
import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'

export const MainLayout = () => {
  return (
    <>
      <Header />
      <main className='main'>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

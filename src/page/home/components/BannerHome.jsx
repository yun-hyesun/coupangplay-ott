import React from 'react'
import { BannerList } from '../../../components/content/BannerList'
import { ContentTitle } from '../../../components/content/ContentTitle'


export const BannerHome = () => {
  const dramaPath = '/detail/movie/1325734';

  const bannerList = [
    {img: "/images/banner/home1.png", path: dramaPath},
    {img: "/images/banner/home2.png", path: dramaPath},
    {img: "/images/banner/home3.png", path: dramaPath},
    {img: "/images/banner/home4.png", path: dramaPath},
    {img: "/images/banner/home5.png", path: dramaPath},
    {img: "/images/banner/home6.png", path: dramaPath},
  ]
  return (
    <section className='contentRail'>
      <ContentTitle title="결혼식 전날, 모든 게 달라졌다"/>
      <BannerList bannerList={bannerList}/>
    </section>
  )
}

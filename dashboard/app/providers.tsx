'use client'

import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { ToastContainer } from '@/components/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out-quad',
      once: true,
      offset: 50,
      disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
  }, [])

  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}

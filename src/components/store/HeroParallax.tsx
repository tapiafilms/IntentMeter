'use client'
import { useEffect, useRef } from 'react'

export default function HeroParallax() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let raf: number
    const handleScroll = () => {
      raf = requestAnimationFrame(() => {
        if (!videoRef.current) return
        const y = window.scrollY * 0.4
        videoRef.current.style.transform = `translateY(${y}px)`
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      className="w-full object-cover animate-video-fade"
      style={{
        opacity: 0.30,
        position: 'absolute',
        top: '-15%',
        left: 0,
        width: '100%',
        height: '130%',
        willChange: 'transform',
      }}
    >
      <source src="/video-fondo-tienda.mp4" type="video/mp4" />
    </video>
  )
}
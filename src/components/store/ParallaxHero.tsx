'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const parallaxStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .parallax-video-container {
    will-change: transform;
    transform: translateZ(0);
  }

  .hero-content {
    animation: fadeUp 0.5s ease forwards;
  }
`

interface ParallaxHeroProps {
  children?: React.ReactNode
}

export default function ParallaxHero({ children }: ParallaxHeroProps) {
  const [scrollY, setScrollY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Aplicar el efecto parallax al video: se mueve más lentamente que el scroll
  // Factor de 0.5 significa que se mueve al 50% de la velocidad del scroll
  const parallaxOffset = scrollY * 0.5

  return (
    <>
      <style>{parallaxStyles}</style>
      <section
        ref={containerRef}
        className="relative h-[66vh] overflow-hidden flex items-center"
        style={{ backgroundColor: 'var(--color-brand)' }}
      >
        {/* Video Background con Efecto Parallax */}
        <div
          ref={videoContainerRef}
          className="absolute inset-0 z-0 parallax-video-container"
          style={{
            transform: `translateY(${parallaxOffset}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-10 animate-video-fade"
          >
            <source src="/video-fondo-tienda.mp4" type="video/mp4" />
          </video>
          {/* Overlay suave para integrar mejor el video con el fondo azul */}
          <div
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(26,26,46,0.5) 0%, transparent 100%)',
            }}
          />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl hero-content">
            <p
              className="text-sm font-medium tracking-widest mb-6"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.2em' }}
            >
              NUEVA COLECCIÓN
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Piezas que<br />
              <span style={{ color: 'var(--color-accent)' }}>duran.</span>
            </h1>
            <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.95)' }}>
              Cada prenda seleccionada con cuidado. Diseño atemporal para el día a día.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-sm transition-all hover:scale-105"
                style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
              >
                Ver colección
                <span>→</span>
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-sm border transition-all"
                style={{
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                Explorar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {children}
    </>
  )
}

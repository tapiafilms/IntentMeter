'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/supabase/types'

interface Category {
  name: string
  image: string
  href: string
}

function buildCategories(products: Product[]): Category[] {
  const map = new Map<string, string>()
  for (const p of products) {
    const cat = p.category ?? 'General'
    if (!map.has(cat) && p.images?.[0]) {
      map.set(cat, p.images[0])
    }
  }
  return Array.from(map.entries()).map(([name, image]) => ({
    name,
    image,
    href: `/productos?categoria=${encodeURIComponent(name)}`,
  }))
}

const INTERVAL = 5000

export default function HeroCarousel({ products }: { products: Product[] }) {
  const categories = buildCategories(products)
  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((index: number) => {
    if (animating || index === active) return
    setPrev(active)
    setActive(index)
    setAnimating(true)
    setTimeout(() => {
      setPrev(null)
      setAnimating(false)
    }, 900)
  }, [active, animating])

  const next = useCallback(() => goTo((active + 1) % categories.length), [active, categories.length, goTo])
  const prev_ = useCallback(() => goTo((active - 1 + categories.length) % categories.length), [active, categories.length, goTo])

  useEffect(() => {
    timerRef.current = setTimeout(next, INTERVAL)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, next])

  if (categories.length === 0) return null

  // Las cards que se muestran a la derecha: las categorías que NO son la activa, max 4
  const sideCards = categories
    .map((c, i) => ({ ...c, i }))
    .filter(c => c.i !== active)
    .slice(0, 4)

  const current = categories[active]
  const slideNum = String(active + 1).padStart(2, '0')

  return (
    <section className="relative w-full overflow-hidden" style={{ height: '88vh', minHeight: 520 }}>

      {/* ── Fondos ────────────────────────────────────────────── */}
      {categories.map((cat, i) => (
        <div
          key={cat.name}
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: i === active ? 1 : i === prev ? 0 : 0,
            transition: 'opacity 0.9s ease',
            zIndex: i === active ? 1 : i === prev ? 2 : 0,
          }}
        >
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover"
              style={{
                transform: i === active ? (animating ? 'scale(1.08)' : 'scale(1.0)') : 'scale(1.08)',
                transition: 'transform 5s ease',
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <div className="w-full h-full" style={{ background: 'var(--color-brand)' }} />
          )}
        </div>
      ))}

      {/* ── Overlays ──────────────────────────────────────────── */}
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3, opacity: 0.45 }}>
        <defs>
          <pattern id="hc-dots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="black" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hc-dots)" />
      </svg>
      {/* Gradiente izquierda para legibilidad del texto */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.05) 100%)',
        }}
      />
      {/* Gradiente inferior */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
        }}
      />

      {/* ── Contenido ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center" style={{ zIndex: 5 }}>
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between gap-8">

          {/* Texto izquierda */}
          <div className="flex-1 max-w-xl">
            <p
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.25em' }}
            >
              {current.name.toUpperCase()}
            </p>
            <h1
              className="font-display font-bold text-white leading-tight mb-6"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              {current.name}
            </h1>
            <div className="flex gap-3 flex-wrap">
              <Link
                href={current.href}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:scale-105"
                style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
              >
                Ver colección →
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm border transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)' }}
              >
                Todo el catálogo
              </Link>
            </div>
          </div>

          {/* Cards derecha */}
          {sideCards.length > 0 && (
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {sideCards.map((cat, pos) => {
                const isNext = pos === 0
                return (
                  <button
                    key={cat.name}
                    onClick={() => goTo(cat.i)}
                    className="relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 group"
                    style={{
                      width: isNext ? 160 : 110,
                      height: isNext ? 220 : 150,
                      transition: 'all 0.5s ease',
                      opacity: isNext ? 1 : 0.65,
                    }}
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'var(--color-surface-2)' }} />
                    )}
                    {/* overlay */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }}
                    />
                    <span
                      className="absolute bottom-3 left-3 right-3 text-white font-semibold text-xs leading-tight"
                      style={{ fontSize: isNext ? '0.8rem' : '0.7rem' }}
                    >
                      {cat.name.toUpperCase()}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Controles inferiores ───────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 md:px-10 pb-8"
        style={{ zIndex: 6 }}
      >
        {/* Flechas */}
        <div className="flex gap-3">
          <button
            onClick={prev_}
            className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:bg-white/20"
            style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'white' }}
            aria-label="Anterior"
          >
            ←
          </button>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:bg-white/20"
            style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'white' }}
            aria-label="Siguiente"
          >
            →
          </button>
        </div>

        {/* Barra de progreso + counter */}
        <div className="flex items-center gap-4">
          {/* Dots */}
          <div className="flex gap-1.5">
            {categories.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === active ? 24 : 6,
                  height: 6,
                  background: i === active ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                }}
                aria-label={`Ir a ${categories[i].name}`}
              />
            ))}
          </div>
          {/* Número */}
          <span
            className="font-display font-bold tabular-nums"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', letterSpacing: '0.1em' }}
          >
            {slideNum}
          </span>
        </div>
      </div>

    </section>
  )
}

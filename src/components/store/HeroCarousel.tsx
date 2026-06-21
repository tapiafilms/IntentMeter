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
const CARD_W = 150
const CARD_H = 210
const CARD_GAP = 12
const CARDS_VISIBLE = 4
const ANIM_MS = 720

type Phase = 'idle' | 'start' | 'expand'

export default function HeroCarousel({ products }: { products: Product[] }) {
  const categories = buildCategories(products)
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [clipPath, setClipPath] = useState<string>('inset(0 0 0 0 round 0px)')

  const sectionRef = useRef<HTMLElement>(null)
  const firstCardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expandingImageRef = useRef<string>('')  // imagen fija durante toda la animación

  const advance = useCallback(() => {
    if (phase !== 'idle') return

    // Fijar la imagen que se va a expandir antes de que active cambie
    expandingImageRef.current = categories[(active + 1) % categories.length].image

    // 1. Calcular clip-path inicial desde la posición de la card
    if (firstCardRef.current && sectionRef.current) {
      const card = firstCardRef.current.getBoundingClientRect()
      const sec  = sectionRef.current.getBoundingClientRect()
      const t = card.top  - sec.top
      const l = card.left - sec.left
      const r = sec.width  - l - card.width
      const b = sec.height - t - card.height
      // Clip recortado al tamaño de la card (sin transición aún)
      setClipPath(`inset(${t}px ${r}px ${b}px ${l}px round 16px)`)
    }

    // 2. Frame siguiente: animar clip-path hasta fullscreen
    setPhase('start')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setClipPath('inset(0px 0px 0px 0px round 0px)')
        setPhase('expand')
        setTimeout(() => {
          // El overlay ya es fullscreen — cambia active e idle simultáneamente.
          // El fondo pasa a mostrar la misma imagen que el overlay → sin salto.
          setActive(a => (a + 1) % categories.length)
          setPhase('idle')
        }, ANIM_MS)
      })
    })
  }, [phase, categories.length])

  useEffect(() => {
    timerRef.current = setTimeout(advance, INTERVAL)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, advance])

  if (categories.length === 0) return null

  const isAnimating = phase === 'start' || phase === 'expand'
  const current = categories[active]
  const nextIdx = (active + 1) % categories.length
  const nextCat = categories[nextIdx]
  const slideNum = String(active + 1).padStart(2, '0')

  // Cola: active+1, active+2 ... + 1 extra que entra desde la derecha durante el slide
  const queueCount = Math.min(CARDS_VISIBLE + 1, categories.length - 1)
  const queueCards = Array.from({ length: queueCount }, (_, i) => {
    const idx = (active + 1 + i) % categories.length
    return { ...categories[idx], idx }
  })

  return (
    <>
    <style>{`
      @keyframes card-enter {
        0%   { opacity: 0; transform: scale(0.88) translateY(12px); filter: blur(4px); }
        60%  { opacity: 1; filter: blur(0px); }
        100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
      }
      @keyframes arrow-enter {
        from { opacity: 0; transform: scale(0.6); }
        to   { opacity: 1; transform: scale(1); }
      }
    `}</style>
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: '88vh', minHeight: 520 }}
    >
      {/* ── Fondo: imagen actual siempre visible (sin scale para que calce con el overlay) */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {current.image
          ? <img src={current.image} alt={current.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: 'var(--color-brand)' }} />
        }
      </div>

      {/* ── Overlay: se expande desde el tamaño de la card hasta fullscreen.
          Sin fadeout — cuando llega al tope ES idéntico al fondo (misma imagen,
          mismo estilo), así que se puede remover sin salto. */}
      {phase !== 'idle' && expandingImageRef.current && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 8,
            clipPath: clipPath,
            transition: phase === 'expand'
              ? `clip-path ${ANIM_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`
              : 'none',
          }}
        >
          <img src={expandingImageRef.current} className="w-full h-full object-cover" alt="" />
        </div>
      )}

      {/* ── Dot grid ──────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9, opacity: 0.42 }}>
        <defs>
          <pattern id="hc-dots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="black" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hc-dots)" />
      </svg>

      {/* ── Gradiente izquierda — siempre visible ─────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 52%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 40%)' }}
      />

      {/* ── Contenido ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center" style={{ zIndex: 11 }}>
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between gap-8">

          {/* Texto — se desvanece al animar */}
          <div
            className="flex-1 max-w-xl"
            style={{
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating ? 'translateX(-28px)' : 'translateX(0)',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
              pointerEvents: isAnimating ? 'none' : 'auto',
            }}
          >
            <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-accent)', letterSpacing: '0.25em' }}>
              {current.name.toUpperCase()}
            </p>
            <h1 className="font-display font-bold text-white leading-tight mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
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

          {/* ── Cards — se deslizan a la izquierda al animar ────── */}
          {queueCards.length > 0 && (
            <div
              className="hidden md:flex flex-col flex-shrink-0"
              style={{ gap: 10, zIndex: 12 }}
            >
            {/* Cards con overflow hidden para el slide */}
            <div
              style={{
                width: CARDS_VISIBLE * CARD_W + (CARDS_VISIBLE - 1) * CARD_GAP,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                className="flex items-center"
                style={{
                  gap: CARD_GAP,
                  transform: isAnimating ? `translateX(-${CARD_W + CARD_GAP}px)` : 'translateX(0)',
                  transition: isAnimating ? `transform ${ANIM_MS}ms cubic-bezier(0.76, 0, 0.24, 1)` : 'none',
                }}
              >
                {queueCards.map((cat, pos) => {
                  const isFirst = pos === 0
                  return (
                    <div
                      key={`${cat.name}-${pos}`}
                      ref={isFirst ? firstCardRef : undefined}
                      onClick={isFirst ? advance : undefined}
                      className={['relative rounded-2xl overflow-hidden flex-shrink-0', isFirst ? 'cursor-pointer group' : ''].join(' ')}
                      style={{
                        width: CARD_W,
                        height: CARD_H,
                        // La card extra que entra desde la derecha aparece con fade+slide
                        animation: pos === CARDS_VISIBLE && isAnimating
                          ? `card-enter 600ms cubic-bezier(0.34, 1.2, 0.64, 1) ${Math.round(ANIM_MS * 0.3)}ms both`
                          : undefined,
                      }}
                    >
                      {/* La primera card se oculta cuando la voladora ya está en su lugar */}
                      <div
                        className="w-full h-full"
                        style={{ opacity: isFirst && phase === 'expand' ? 0 : 1, transition: 'opacity 0.1s' }}
                      >
                        {cat.image
                          ? <img src={cat.image} alt={cat.name} className={['w-full h-full object-cover', isFirst ? 'group-hover:scale-105 transition-transform duration-500' : ''].join(' ')} />
                          : <div className="w-full h-full" style={{ background: 'var(--color-surface-2)' }} />
                        }
                      </div>
                      {isFirst && (
                        <div
                          key={active}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: 'var(--color-accent)',
                            color: 'var(--color-brand)',
                            animation: 'arrow-enter 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
                          }}
                        >
                          →
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Labels debajo, fuera del overflow hidden */}
            <div
              style={{
                width: CARDS_VISIBLE * CARD_W + (CARDS_VISIBLE - 1) * CARD_GAP,
                overflow: 'hidden',
              }}
            >
              <div
                className="flex"
                style={{
                  gap: CARD_GAP,
                  transform: isAnimating ? `translateX(-${CARD_W + CARD_GAP}px)` : 'translateX(0)',
                  transition: isAnimating ? `transform ${ANIM_MS}ms cubic-bezier(0.76, 0, 0.24, 1)` : 'none',
                }}
              >
                {queueCards.map((cat, pos) => (
                  <span
                    key={`label-${cat.name}-${pos}`}
                    className="text-center text-white font-semibold text-xs tracking-widest flex-shrink-0"
                    style={{ width: CARD_W, letterSpacing: '0.12em', display: 'block' }}
                  >
                    {cat.name.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Controles ─────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 md:px-10 pb-8"
        style={{ zIndex: 13 }}
      >
        <button
          onClick={advance}
          className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:bg-white/20"
          style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'white' }}
          aria-label="Siguiente"
        >
          →
        </button>
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            {categories.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === active ? 24 : 6,
                  height: 6,
                  background: i === active ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
          <span className="font-display font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
            {slideNum}
          </span>
        </div>
      </div>
    </section>
    </>
  )
}

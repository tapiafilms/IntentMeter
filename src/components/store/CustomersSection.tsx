'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export type CustomerPhoto = {
  image: string
  name: string
  bg: string
  quote?: string
}

const DEFAULT_PHOTOS: CustomerPhoto[] = [
  { image: '', name: 'María G.',     bg: '#e8d5f5', quote: 'Me encanta esta tienda, siempre encuentro lo que busco y la calidad es increíble.' },
  { image: '', name: 'Carlos R.',    bg: '#d5e8f5', quote: 'El envío fue rapidísimo y el producto llegó perfecto. 100% recomendado.' },
  { image: '', name: 'Sofía M.',     bg: '#f5e6d5', quote: 'Compro aquí cada temporada. El estilo es único y los precios son justos.' },
  { image: '', name: 'Diego P.',     bg: '#d5f5e8', quote: 'La atención al cliente es excelente. Se nota que se preocupan por uno.' },
  { image: '', name: 'Valentina L.', bg: '#f5d5ea', quote: 'Mis favoritas son las carteras. Ya van tres que compro y todas perfectas.' },
  { image: '', name: 'Andrés C.',    bg: '#e8f5d5', quote: 'Gran variedad y siempre hay novedades. No me canso de volver.' },
  { image: '', name: 'Camila F.',    bg: '#f0f0d5', quote: 'La mejor tienda online que he encontrado. Súper recomendada.' },
  { image: '', name: 'Matías H.',    bg: '#d5d5f5', quote: 'Todo llegó en perfectas condiciones y antes de lo esperado.' },
]

type Props = {
  title?: string
  description?: string
  cta_text?: string
  cta_href?: string
  photos?: CustomerPhoto[]
}

function PhotoCard({
  photo,
  cardKey,
  hoveredKey,
  onHover,
}: {
  photo: CustomerPhoto
  cardKey: string
  hoveredKey: string | null
  onHover: (key: string | null) => void
}) {
  const initials = photo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isHovered = hoveredKey === cardKey

  return (
    <div
      onMouseEnter={() => onHover(cardKey)}
      onMouseLeave={() => onHover(null)}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: photo.bg || '#e8d5f5',
        aspectRatio: '3/4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      {/* Blob decorativo */}
      <div style={{
        position: 'absolute',
        width: '75%',
        height: '75%',
        borderRadius: '60% 40% 50% 70% / 50% 60% 40% 60%',
        background: 'rgba(255,255,255,0.35)',
        top: '10%',
        left: '10%',
        pointerEvents: 'none',
      }} />

      {photo.image ? (
        <img
          src={photo.image}
          alt={photo.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <span style={{
          position: 'relative',
          zIndex: 1,
          fontSize: 28,
          fontWeight: 700,
          color: 'rgba(0,0,0,0.35)',
          letterSpacing: '-0.02em',
        }}>
          {initials}
        </span>
      )}

      {/* Quote card en hover */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          background: 'white',
          borderRadius: 14,
          padding: '10px 12px',
          zIndex: 20,
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          animation: 'quote-in 0.18s ease',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', marginBottom: 4, letterSpacing: '0.04em' }}>
            {photo.name}
          </div>
          <p style={{ fontSize: 11, color: '#555', lineHeight: 1.5, margin: 0 }}>
            "{photo.quote || 'Me encanta esta tienda porque tiene todo lo que necesito.'}"
          </p>
        </div>
      )}
    </div>
  )
}

const BASE_SPEED = 0.45 // px por frame a 60fps

function ScrollColumn({
  photos,
  direction,
  hoveredKey,
  onHover,
  colId,
  paused,
}: {
  photos: CustomerPhoto[]
  direction: 'up' | 'down'
  hoveredKey: string | null
  onHover: (key: string | null) => void
  colId: string
  paused: boolean
}) {
  const doubled = [...photos, ...photos]
  const trackRef = useRef<HTMLDivElement>(null)
  const state = useRef({ pos: 0, vel: BASE_SPEED })
  const pausedRef = useRef(paused)

  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    let raf: number
    const loop = () => {
      const targetVel = pausedRef.current ? 0 : BASE_SPEED
      // Lerp velocidad → desaceleración/aceleración suave
      state.current.vel += (targetVel - state.current.vel) * 0.055

      state.current.pos += state.current.vel

      const el = trackRef.current
      if (el) {
        const half = el.scrollHeight / 2
        if (state.current.pos >= half) state.current.pos -= half

        const translate = direction === 'up'
          ? -state.current.pos
          : -(half - state.current.pos)

        el.style.transform = `translateY(${translate}px)`
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [direction])

  return (
    <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
      <div ref={trackRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, willChange: 'transform' }}>
        {doubled.map((photo, i) => (
          <PhotoCard
            key={i}
            photo={photo}
            cardKey={`${colId}-${i}`}
            hoveredKey={hoveredKey}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  )
}

export default function CustomersSection({
  title = 'Nuestros clientes',
  description = 'Miles de personas ya confían en nosotros para encontrar su estilo. Cada compra es el inicio de una experiencia única.',
  cta_text = 'Ver toda la colección',
  cta_href = '/productos',
  photos,
}: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const list = photos && photos.length >= 2 ? photos : DEFAULT_PHOTOS
  const col1 = list.filter((_, i) => i % 2 === 0)
  const col2 = list.filter((_, i) => i % 2 !== 0)
  const paused = hoveredKey !== null

  return (
    <>
      <style>{`
        @keyframes quote-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .customers-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .customers-left { padding: 36px 28px; }
        .customers-right { height: 460px; }
        @media (max-width: 639px) {
          .customers-grid { grid-template-columns: 1fr; }
          .customers-left { padding: 32px 24px; }
          .customers-right { height: 300px; }
        }
      `}</style>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="customers-grid" style={{
          borderRadius: 28,
          overflow: 'hidden',
          backgroundImage: 'url(/bg-clients.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>

          {/* Panel izquierdo */}
          <div className="customers-left" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 20,
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: 'var(--color-accent, #e2b96f)',
              textTransform: 'uppercase',
            }}>
              ✦ CLIENTES FELICES
            </p>

            <h2 style={{
              fontSize: 38,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}>
              {title}
            </h2>

            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.7,
              maxWidth: 360,
            }}>
              {description}
            </p>

            {cta_href && cta_text && (
              <Link href={cta_href} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 999,
                background: 'white',
                color: '#1e2030',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
                width: 'fit-content',
                marginTop: 8,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {cta_text} <span>›</span>
              </Link>
            )}
          </div>

          {/* Panel derecho: columnas de fotos */}
          <div className="customers-right" style={{
            padding: '0px 20px',
            display: 'flex',
            gap: 10,
            overflow: 'hidden',
          }}>
            <ScrollColumn photos={col1} direction="up"   colId="c1" hoveredKey={hoveredKey} onHover={setHoveredKey} paused={paused} />
            <ScrollColumn photos={col2} direction="down" colId="c2" hoveredKey={hoveredKey} onHover={setHoveredKey} paused={paused} />
          </div>

        </div>
      </section>
    </>
  )
}

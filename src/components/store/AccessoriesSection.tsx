'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type AccessoryCard = {
  title: string
  description: string
  image: string
  size: 'small' | 'wide' | 'tall' | 'large'
  color: string
  href?: string
}

const DEFAULT_CARDS: AccessoryCard[] = [
  { title: 'Carteras',        description: 'Cuero genuino, diseño atemporal',  image: '', size: 'large', color: '#2d1b6b', href: '/productos?categoria=carteras' },
  { title: 'Nueva temporada', description: 'Accesorios que definen el look',   image: '', size: 'tall',  color: '#1a1035', href: '/productos' },
  { title: '+2.4K',           description: 'Piezas vendidas este mes',         image: '', size: 'small', color: '#3b1fa8', href: '' },
  { title: '4.9 ★',          description: 'Valoración promedio',               image: '', size: 'small', color: '#4c1d95', href: '' },
  { title: 'Cinturones',      description: 'El detalle que lo cambia todo',    image: '', size: 'wide',  color: '#5b21b6', href: '/productos?categoria=cinturones' },
  { title: 'Joyería',         description: 'Piezas únicas',                   image: '', size: 'small', color: '#6b21a8', href: '/productos?categoria=joyeria' },
  { title: '+23%',            description: 'Crecimiento este trimestre',       image: '', size: 'small', color: '#3730a3', href: '' },
]

type Props = {
  title?: string
  subtitle?: string
  items?: AccessoryCard[]
}

const COL_SPAN: Record<string, string> = {
  small: 'span 1',
  wide:  'span 2',
  tall:  'span 1',
  large: 'span 2',
}
const ROW_SPAN: Record<string, string> = {
  small: 'span 1',
  wide:  'span 1',
  tall:  'span 2',
  large: 'span 2',
}
const MIN_HEIGHT: Record<string, number> = {
  small: 160,
  wide:  160,
  tall:  336,
  large: 336,
}

export default function AccessoriesSection({ title = 'Accesorios', subtitle, items }: Props) {
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  const cards = items && items.length > 0 ? items : DEFAULT_CARDS

  return (
    <>
      <style>{`
        .acc-card {
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease;
        }
        .acc-card:hover {
          transform: translateY(-4px);
        }
        .acc-card-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.45;
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .acc-card:hover .acc-card-bg {
          transform: scale(1.08);
        }
        .acc-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, transparent 60%);
        }
        .acc-card-content {
          position: relative;
          z-index: 1;
          height: 100%;
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .acc-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          color: white;
          backdrop-filter: blur(6px);
          width: fit-content;
        }
        .acc-title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .acc-title-small {
          font-size: 22px;
        }
        .acc-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-top: 6px;
          line-height: 1.4;
        }
        .acc-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: white;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(6px);
          width: fit-content;
          transition: background 0.2s;
        }
        .acc-link:hover { background: rgba(255,255,255,0.25); }
        .acc-grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: auto; grid-auto-flow: row dense; gap: 10px; }
        @media (min-width: 640px) { .acc-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
      `}</style>

      <section ref={sectionRef} className="max-w-6xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium tracking-widest mb-2"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
            {subtitle ?? 'COMPLEMENTA TU ESTILO'}
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">{title}</h2>
        </div>

        {/* Bento grid */}
        <div className="acc-grid">
          {cards.map((card, i) => {
            const delay = i * 0.07

            return (
              <div
                key={i}
                className="acc-card"
                style={{
                  gridColumn: COL_SPAN[card.size],
                  gridRow: ROW_SPAN[card.size],
                  minHeight: MIN_HEIGHT[card.size],
                  background: card.color || '#2d1b6b',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.98)',
                  transition: `opacity 0.55s ease ${delay}s, transform 0.55s cubic-bezier(0.34,1.1,0.64,1) ${delay}s`,
                }}
              >
                {card.image && (
                  <img src={card.image} alt={card.title} className="acc-card-bg" />
                )}
                <div className="acc-card-overlay" />

                <div className="acc-card-content">
                  {/* Top */}
                  <div>
                    {card.size !== 'small' && (
                      <span className="acc-badge">✦ ACCESORIOS</span>
                    )}
                  </div>

                  {/* Bottom */}
                  <div>
                    <div className={`acc-title ${card.size === 'small' ? 'acc-title-small' : ''}`}>
                      {card.title}
                    </div>
                    {card.description && (
                      <p className="acc-desc">{card.description}</p>
                    )}
                    {card.href && (card.size === 'large' || card.size === 'wide' || card.size === 'tall') && (
                      <Link href={card.href} className="acc-link" style={{ marginTop: 14 }}>
                        EXPLORAR <span>›</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

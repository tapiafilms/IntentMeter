'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/lib/supabase/types'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price)
}

const VISIBLE = 3

export default function FeaturedCarousel({ products, customerName, customerAvatar, sectionTitle, sectionSubtitle }: { products: Product[]; customerName?: string | null; customerAvatar?: string | null; sectionTitle?: string; sectionSubtitle?: string }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [animKey, setAnimKey] = useState(0)

  if (products.length === 0) return null

  const navigate = (direction: 'next' | 'prev') => {
    setDir(direction)
    setAnimKey(k => k + 1)
    setIndex(i =>
      direction === 'next'
        ? (i + 1) % products.length
        : (i - 1 + products.length) % products.length
    )
  }

  const visible = Array.from({ length: Math.min(VISIBLE, products.length) }, (_, i) =>
    products[(index + i) % products.length]
  )

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)     scale(1); }
        }
        .feat-card-next { animation: slideInRight 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .feat-card-prev { animation: slideInLeft  420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      <style>{`
        .feat-grid { display: grid; gap: 16px; padding: 16px; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 768px) { .feat-grid { grid-template-columns: repeat(${VISIBLE}, 1fr); padding: 20px; } }
      `}</style>

      <section className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-10">
          <div>
            <p className="text-xs font-medium tracking-widest mb-2"
              style={{ color: '#9f28f8', letterSpacing: '0.15em' }}>
              {sectionSubtitle ?? (customerName ? `HOLA, ${customerName.toUpperCase()} 👋` : 'DESTACADOS')}
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-bold">
              {sectionTitle ?? (customerName ? 'Seleccionado para ti' : 'Lo más destacado')}
            </h2>
          </div>
          <Link
            href="/productos"
            className="text-sm font-medium hidden md:flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ver todo <span>→</span>
          </Link>
        </div>

        {/* Contenedor principal */}
        <div
          className="flex gap-4 rounded-3xl"
          style={{ background: '#e3dfd7' }}
        >
          {/* Columna izquierda — solo en desktop */}
          <div className="relative md:flex flex-col flex-shrink-0 hidden" style={{ width: 220, gap: 0 }}>
            <img src="/burbujas.png" alt="" className="absolute w-full h-full object-cover pointer-events-none" style={{ top: 0, left: 19, height: 470, overflow: 'inherit', }} />

            {/* Card burbuja1 + burbuja2 */}
            <div className="relative flex-[2]">
              {customerName && (
                <div className="absolute flex flex-col items-center gap-2" style={{ top: '25%', left: 53 }}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: '#9f28f8', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', border: '2px solid white' }}
                  >
                    {customerAvatar
                      ? <img src={customerAvatar} alt={customerName} className="w-full h-full object-cover" />
                      : <span className="text-white font-bold text-lg">{customerName.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <Link
                    href="/cuenta/perfil"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#1a1a2e' }}
                    title="Editar perfil"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </Link>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none" style={{ paddingLeft: 47, paddingBottom: 0 }}>
                <button
                  onClick={() => navigate('next')}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95 pointer-events-auto"
                  style={{ background: 'white', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  aria-label="Siguiente"
                >
                  →
                </button>
                <button
                  onClick={() => navigate('prev')}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95 pointer-events-auto"
                  style={{ background: 'white', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  aria-label="Anterior"
                >
                  ←
                </button>
              </div>
            </div>

            <div className="relative flex-[3]">
              <div className="absolute inset-0 flex flex-col" style={{ paddingLeft: 0, paddingRight: 15, paddingTop: 54 }}>
                <p className="font-display font-bold text-white text-xl leading-tight mb-2" style={{ color: 'rgba(158,172,240)', fontWeight: 700, fontSize: 26, }}>
                  {customerName ? 'Solo para ti' : 'Recién llegado'}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(0,0,0,0.7)', fontSize: 15, lineHeight: 1.2, fontWeight: 700, }}>
                  {customerName
                    ? 'Prendas seleccionadas según tus gustos y estilo personal. Dentro de nuestro closet hay mas de una prenda para ideal para tu closet, asi que sorprendete viendo lo que se fabricó para ti.'
                    : 'Los últimos productos que acaban de llegar a nuestra tienda.'}
                </p>
              </div>
            </div>
          </div>

          {/* Navegación mobile — solo visible cuando la columna izq está oculta */}
          <div className="flex md:hidden items-center justify-between px-4 pt-4 w-full absolute top-0 left-0 pointer-events-none" style={{ zIndex: 1 }}>
            <button onClick={() => navigate('prev')} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold pointer-events-auto" style={{ background: 'rgba(0,0,0,0.12)', color: '#1a1a2e' }} aria-label="Anterior">←</button>
            <button onClick={() => navigate('next')} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold pointer-events-auto" style={{ background: 'rgba(0,0,0,0.12)', color: '#1a1a2e' }} aria-label="Siguiente">→</button>
          </div>

          {/* Productos con animación */}
          <div className="feat-grid flex-1 relative">
            {visible.map((product, i) => (
              <Link
                key={`${animKey}-${i}`}
                href={`/producto/${product.slug}`}
                className={`group block ${dir === 'next' ? 'feat-card-next' : 'feat-card-prev'}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="relative overflow-hidden mb-3"
                  style={{ borderRadius: 16, background: 'var(--color-border)', aspectRatio: '3/4' }}
                >
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl opacity-20">◇</span>
                    </div>
                  )}
                  {customerName && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: 'rgba(159,40,248,0.85)', backdropFilter: 'blur(6px)' }}>
                      <span className="text-white text-xs font-semibold" style={{ letterSpacing: '0.05em' }}>✦ Para ti</span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(to top, rgba(26,26,46,0.7) 0%, transparent 60%)' }}
                  >
                    <span className="text-white text-sm font-medium">Ver producto →</span>
                  </div>
                </div>
                <div>
                  {product.category && (
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
                      {product.category.toUpperCase()}
                    </p>
                  )}
                  <h3 className="text-sm font-medium mb-1 line-clamp-2 group-hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {product.name}
                  </h3>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

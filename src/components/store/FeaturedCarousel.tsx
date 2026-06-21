'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/lib/supabase/types'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price)
}

const VISIBLE = 3

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0)

  if (products.length === 0) return null

  const prev = () => setIndex(i => (i - 1 + products.length) % products.length)
  const next = () => setIndex(i => (i + 1) % products.length)

  const visible = Array.from({ length: Math.min(VISIBLE, products.length) }, (_, i) =>
    products[(index + i) % products.length]
  )

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-medium tracking-widest mb-2"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
            DESTACADOS
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Lo más nuevo
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
        className="flex gap-4 rounded-3xl p-5"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {/* Columna izquierda */}
        <div className="flex flex-col gap-4 flex-shrink-0" style={{ width: 220 }}>

          {/* Card burbuja1 + burbuja2 */}
          <div
            className="relative rounded-2xl overflow-hidden flex-1"
            style={{ minHeight: 260, background: 'var(--color-border)' }}
          >
            {/* burbuja1 — fondo con avatar */}
            <img
              src="/burbuja1.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* burbuja2 — flechas superpuestas */}
            <img
              src="/burbuja2.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
            {/* Botones de navegación encima */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ paddingLeft: '55%' }}>
              <button
                onClick={next}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95"
                style={{ background: 'white', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                aria-label="Siguiente"
              >
                →
              </button>
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95"
                style={{ background: 'white', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                aria-label="Anterior"
              >
                ←
              </button>
            </div>
          </div>

          {/* Card burbuja3 — info "solo para ti" */}
          <div
            className="relative rounded-2xl overflow-hidden flex-shrink-0"
            style={{ height: 200 }}
          >
            <img
              src="/burbuja3.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 p-5 flex flex-col justify-end">
              <p className="font-display font-bold text-white text-xl leading-tight mb-2">
                solo para ti
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Prendas seleccionadas según tus gustos y estilo personal.
              </p>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: `repeat(${VISIBLE}, 1fr)` }}>
          {visible.map((product, i) => (
            <Link
              key={`${product.id}-${i}`}
              href={`/producto/${product.slug}`}
              className="group block"
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
  )
}

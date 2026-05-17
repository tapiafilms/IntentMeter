'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  category: string | null
  images: string[]
}

interface Props {
  slugs: string[]
  onSelect: (slug: string, product: Product) => void
  onClose: () => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ProductComparisonOverlay({ slugs, onSelect, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  // Animación de entrada
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        const results = await Promise.all(
          slugs.map(slug =>
            fetch(`/api/product?slug=${slug}`).then(r => r.json())
          )
        )
        setProducts(results.filter(Boolean))
      } catch {
        console.error('Error cargando productos para comparativa')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [slugs])

  const handleClose = () => {
    setClosing(true)
    setVisible(false)
    setTimeout(() => onClose(), 400)
  }

  const handleSelect = (product: Product) => {
    setSelected(product.slug)
    setTimeout(() => {
      setClosing(true)
      setVisible(false)
      setTimeout(() => onSelect(product.slug, product), 400)
    }, 500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: `rgba(15,15,30,${visible ? 0.85 : 0})`,
        backdropFilter: 'blur(8px)',
        transition: 'background 0.4s ease',
      }}
    >
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(226,185,111,0.2)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="text-xs font-semibold tracking-wider" style={{ color: '#e2b96f' }}>
              SOFÍA RECOMIENDA
            </p>
            <p className="text-white text-sm mt-0.5 opacity-60">
              Elige la que más te guste
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            ✕
          </button>
        </div>

        {/* Productos */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl animate-bounce">✨</div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Sofía está preparando las opciones...
                </p>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(products.length, 4)}, 1fr)`,
              }}
            >
              {products.map((product, i) => (
                <button
                  key={product.slug}
                  onClick={() => handleSelect(product)}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 text-left"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: selected === product.slug
                      ? '2px solid #e2b96f'
                      : '2px solid rgba(255,255,255,0.08)',
                    transform: visible
                      ? selected === product.slug ? 'scale(1.02)' : 'scale(1)'
                      : 'translateY(16px)',
                    opacity: visible ? 1 : 0,
                    transition: `transform 0.4s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms, opacity 0.4s ease ${i * 60}ms, border 0.2s ease`,
                  }}
                >
                  {/* Imagen */}
                  <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-4xl opacity-20">◇</span>
                      </div>
                    )}

                    {/* Overlay hover */}
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'rgba(226,185,111,0.15)' }}
                    >
                      <span
                        className="px-4 py-2 rounded-full text-xs font-semibold"
                        style={{ background: '#e2b96f', color: '#1a1a2e' }}
                      >
                        Elegir esta ✓
                      </span>
                    </div>

                    {/* Selected checkmark */}
                    {selected === product.slug && (
                      <div
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: '#e2b96f' }}
                      >
                        <span className="text-sm font-bold" style={{ color: '#1a1a2e' }}>✓</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    {product.category && (
                      <p className="text-xs mb-1" style={{ color: 'rgba(226,185,111,0.7)' }}>
                        {product.category}
                      </p>
                    )}
                    <p className="text-sm font-medium text-white leading-tight mb-1">
                      {product.name}
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#e2b96f' }}>
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Haz clic en cualquier prenda para ver los detalles
          </p>
          <button
            onClick={handleClose}
            className="text-xs px-4 py-2 rounded-full transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
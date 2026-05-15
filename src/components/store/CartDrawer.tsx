'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, itemCount } = useCartStore()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeCart])

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

const [count, setCount] = useState(0)
const [cartTotal, setCartTotal] = useState(0)

useEffect(() => {
  setCount(itemCount())
  setCartTotal(total())
}, [items, itemCount, total])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: 'rgba(26,26,46,0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          backdropFilter: 'blur(4px)',
        }}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--color-surface)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold">Carrito</h2>
            {count > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
              >
                {count}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <span className="text-5xl mb-4 opacity-20">◇</span>
              <p className="font-display text-xl mb-2">Tu carrito está vacío</p>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Agrega productos para comenzar
              </p>
              <button
                onClick={closeCart}
                className="text-sm font-medium underline"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Seguir explorando
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item, i) => (
                <li
                  key={`${item.productId}-${item.variant}`}
                  className="flex gap-4 pb-4 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* Imagen */}
                  <div
                    className="relative flex-shrink-0 overflow-hidden"
                    style={{
                      width: 80, height: 100,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl opacity-20">◇</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {item.variant}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {formatPrice(item.price * item.qty)}
                    </p>

                    {/* Controles cantidad */}
                    <div className="flex items-center gap-3 mt-3">
                      <div
                        className="flex items-center rounded-full border overflow-hidden"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <button
                          onClick={() => updateQty(item.productId, item.variant, item.qty - 1)}
                          className="w-8 h-7 flex items-center justify-center text-lg transition-colors hover:bg-gray-100"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          −
                        </button>
                        <span className="px-3 text-sm font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.variant, item.qty + 1)}
                          className="w-8 h-7 flex items-center justify-center text-lg transition-colors hover:bg-gray-100"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variant)}
                        className="text-xs transition-opacity hover:opacity-50"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer con total y checkout */}
        {items.length > 0 && (
          <div
            className="px-6 py-6 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Subtotal */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
              <span className="text-sm font-medium">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Envío</span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Se calcula al pagar</span>
            </div>
            <div
              className="flex justify-between items-center pb-6 mb-6 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-lg">{formatPrice(cartTotal)}</span>
            </div>

            <Link
              href="/carrito"
              onClick={closeCart}
              className="block w-full py-4 rounded-full text-center font-medium text-sm transition-all hover:opacity-90 mb-3"
              style={{ background: 'var(--color-brand)', color: 'white' }}
            >
              Ir a pagar →
            </Link>
            <button
              onClick={closeCart}
              className="block w-full py-3 rounded-full text-center text-sm transition-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  )
}

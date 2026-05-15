// DESPUÉS
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store/cart'

export default function Navbar() {
  const { itemCount, toggleCart } = useCartStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(itemCount())
  }, [itemCount])

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(248,246,242,0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Tienda<span style={{ color: 'var(--color-accent)' }}>.</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { href: '/productos', label: 'Productos' },
            { href: '/productos?categoria=Ropa', label: 'Ropa' },
            { href: '/productos?categoria=Accesorios', label: 'Accesorios' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-opacity hover:opacity-60"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleCart}
            className="relative flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

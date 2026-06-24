'use client'

import { useState } from 'react'
import Link from 'next/link'

type NavItem = { id: string; label: string; url: string; parent: string }

export default function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <>
      {/* Botón hamburguesa — solo en mobile */}
      <button
        className="md:hidden flex flex-col items-center justify-center w-9 h-9 gap-1.5"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        <span
          className="block h-0.5 w-5 rounded-full transition-all duration-200"
          style={{
            background: 'var(--color-text-primary)',
            transform: open ? 'translateY(8px) rotate(45deg)' : 'none',
          }}
        />
        <span
          className="block h-0.5 w-5 rounded-full transition-all duration-200"
          style={{
            background: 'var(--color-text-primary)',
            opacity: open ? 0 : 1,
          }}
        />
        <span
          className="block h-0.5 w-5 rounded-full transition-all duration-200"
          style={{
            background: 'var(--color-text-primary)',
            transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none',
          }}
        />
      </button>

      {/* Menú desplegable */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 md:hidden"
          style={{
            background: 'white',
            borderBottom: '1px solid var(--color-border)',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {items.map(item => (
              <Link
                key={item.id}
                href={item.url}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-medium border-b last:border-0"
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border)',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}

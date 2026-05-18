'use client'
import Link from 'next/link'
import { useState } from 'react'

type NavItem = { id: string; label: string; url: string; parent: string }

export default function NavLinks({ items }: { items: NavItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="hidden md:flex items-center gap-8">
      {items.map(item => (
        <Link
          key={item.id}
          href={item.url}
          onMouseEnter={() => setHovered(item.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'relative',
            fontSize: 13,
            fontWeight: 500,
            color: hovered === item.id ? 'var(--color-text)' : 'var(--color-text-secondary)',
            textDecoration: 'none',
            letterSpacing: '0.01em',
            transition: 'color 0.2s ease',
            paddingBottom: 2,
          }}
        >
          {item.label}
          {/* línea animada abajo */}
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              left: 0,
              height: 1,
              width: hovered === item.id ? '100%' : '0%',
              background: 'var(--color-accent)',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: 1,
            }}
          />
        </Link>
      ))}
    </nav>
  )
}
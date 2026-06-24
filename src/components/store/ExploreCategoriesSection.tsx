'use client'

import { useState } from 'react'
import Link from 'next/link'

export type CollectionItem = {
  name: string
  href: string
  image: string | null
  tags: string[]
}

const DEFAULT_COLLECTIONS: CollectionItem[] = [
  { name: 'Mujer',     href: '/productos?categoria=mujer',      image: '/coleccion-mujer.jpg',  tags: ['Mujer'] },
  { name: 'Hombre',    href: '/productos?categoria=hombre',     image: '/coleccion-hombre.jpg', tags: ['Hombre'] },
  { name: 'Niños',     href: '/productos?categoria=ninos',      image: null,                    tags: ['Niños'] },
  { name: 'Accesorios',href: '/productos?categoria=accesorios', image: null,                    tags: ['Accesorios'] },
  { name: 'Lo Nuevo',  href: '/productos?nuevo=true',           image: null,                    tags: ['Nuevos'] },
]

type Props = {
  title?: string
  items?: CollectionItem[]
}

export default function ExploreCategoriesSection({ title = 'Colecciones', items }: Props) {
  const [hovered, setHovered] = useState<number>(0)

  const displayed = items && items.length > 0 ? items : DEFAULT_COLLECTIONS

  return (
    <>
      <style>{`
        .exp-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          cursor: pointer;
          transition: flex 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          min-height: 440px;
        }
        .exp-card-collapsed {
          flex: 1;
        }
        .exp-card-expanded {
          flex: 3.5;
        }
        .exp-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .exp-card:hover .exp-card-img {
          transform: scale(1.05);
        }
        .exp-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(10,10,20,0.82) 0%, rgba(10,10,20,0.25) 50%, transparent 100%);
        }
        .exp-card-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }
        .exp-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          transition: opacity 0.3s ease;
        }
        .exp-tag {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          color: white;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .exp-arrow-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f5e642;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #1a1a2e;
          font-weight: bold;
          flex-shrink: 0;
          transition: transform 0.2s;
          text-decoration: none;
        }
        .exp-arrow-btn:hover {
          transform: scale(1.1);
        }
        .exp-arrow-small {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: white;
          flex-shrink: 0;
          text-decoration: none;
          transition: background 0.2s;
        }
        .exp-arrow-small:hover {
          background: rgba(255,255,255,0.3);
        }
        .exp-title {
          font-weight: 800;
          color: white;
          line-height: 1.1;
          transition: font-size 0.3s;
        }
        .exp-title-expanded {
          font-size: 32px;
        }
        .exp-title-collapsed {
          font-size: 18px;
        }
        .exp-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.75);
          line-height: 1.5;
          overflow: hidden;
          transition: max-height 0.4s ease, opacity 0.3s ease;
        }
        .exp-desc-visible {
          max-height: 60px;
          opacity: 1;
        }
        .exp-desc-hidden {
          max-height: 0;
          opacity: 0;
        }
        .exp-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: white;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          backdrop-filter: blur(8px);
          padding: 10px 16px;
          border-radius: 999px;
          text-decoration: none;
          width: fit-content;
          transition: background 0.2s, opacity 0.3s;
          overflow: hidden;
        }
        .exp-cta:hover {
          background: rgba(255,255,255,0.22);
        }
        .exp-cta-visible {
          opacity: 1;
          max-height: 48px;
        }
        .exp-cta-hidden {
          opacity: 0;
          max-height: 0;
          pointer-events: none;
        }
      `}</style>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-medium tracking-widest mb-2"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
              COLECCIONES
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex gap-3" style={{ height: 440 }}>
          {displayed.map((cat, i) => {
            const isExpanded = hovered === i
            const tags = cat.tags ?? [cat.name]

            return (
              <div
                key={cat.href}
                className={`exp-card ${isExpanded ? 'exp-card-expanded' : 'exp-card-collapsed'}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: 'var(--color-border)' }}
              >
                {/* Background image */}
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="exp-card-img"
                  />
                )}
                <div className="exp-card-overlay" />

                <div className="exp-card-content">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`exp-tags ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
                      style={{ transition: 'opacity 0.3s ease' }}>
                      {tags.map(tag => (
                        <span key={tag} className="exp-tag">{tag}</span>
                      ))}
                    </div>

                    {isExpanded ? (
                      <Link href={cat.href} className="exp-arrow-btn" aria-label={`Ir a ${cat.name}`}>
                        →
                      </Link>
                    ) : (
                      <Link href={cat.href} className="exp-arrow-small" aria-label={`Ir a ${cat.name}`}>
                        ↗
                      </Link>
                    )}
                  </div>

                  {/* Bottom content */}
                  <div className="mt-auto flex flex-col gap-3">
                    <h3 className={`exp-title ${isExpanded ? 'exp-title-expanded' : 'exp-title-collapsed'}`}>
                      {cat.name}
                    </h3>

                    <Link
                      href={cat.href}
                      className={`exp-cta ${isExpanded ? 'exp-cta-visible' : 'exp-cta-hidden'}`}
                    >
                      EXPLORAR COLECCIÓN <span>›</span>
                    </Link>
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

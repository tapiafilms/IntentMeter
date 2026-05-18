'use client'

import { useState, useEffect, useRef } from 'react'
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
  onRegisterClose: (fn: () => void) => void
  onClose: () => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId = 0
    let t = 0
    let lastShoot = 0

    interface Star {
      x: number; y: number; r: number
      baseAlpha: number; alpha: number
      phase: number; speed: number
      color: string; halo?: boolean
    }
    interface Shooting {
      x: number; y: number; vx: number; vy: number
      life: number; decay: number
      trail: { x: number; y: number }[]
    }

    const stars: Star[] = []
    const shooting: Shooting[] = []

    function init() {
      const W = canvas.width, H = canvas.height
      stars.length = 0
      for (let i = 0; i < 140; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.4 + 0.2,
          baseAlpha: Math.random() * 0.5 + 0.1, alpha: 0,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.8 + 0.3,
          color: Math.random() > 0.85
            ? `hsl(${200 + Math.random() * 60}, 80%, 85%)`
            : Math.random() > 0.7 ? 'hsl(40,90%,85%)' : '#ffffff',
        })
      }
      for (let i = 0; i < 8; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H * 0.7,
          r: Math.random() * 2 + 1.5,
          baseAlpha: Math.random() * 0.4 + 0.3, alpha: 0,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.4 + 0.1,
          color: '#e2b96f', halo: true,
        })
      }
    }

    function spawnShooting() {
      const W = canvas.width, H = canvas.height
      const ang = (Math.random() * 20 + 20) * Math.PI / 180
      shooting.push({
        x: Math.random() * W * 0.7 + W * 0.1,
        y: Math.random() * H * 0.3,
        vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8,
        life: 1, decay: 0.018 + Math.random() * 0.01, trail: [],
      })
    }

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.offsetWidth
      canvas.height = parent.offsetHeight
      init()
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    function loop() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      t += 0.012

      const g1 = ctx.createRadialGradient(W*0.3, H*0.4, 0, W*0.3, H*0.4, W*0.55)
      g1.addColorStop(0, 'rgba(40,20,80,0.18)'); g1.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)

      const g2 = ctx.createRadialGradient(W*0.75, H*0.6, 0, W*0.75, H*0.6, W*0.4)
      g2.addColorStop(0, 'rgba(20,40,80,0.12)'); g2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)

      stars.forEach(s => {
        s.alpha = s.baseAlpha + Math.sin(t * s.speed + s.phase) * (s.baseAlpha * 0.6)
        ctx.save()
        ctx.globalAlpha = Math.max(0, s.alpha)
        if (s.halo) {
          const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4)
          hg.addColorStop(0, 'rgba(226,185,111,0.25)'); hg.addColorStop(1, 'rgba(226,185,111,0)')
          ctx.fillStyle = hg
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = s.color
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      })

      if (t - lastShoot > 4 + Math.random() * 3) { spawnShooting(); lastShoot = t }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i]
        s.trail.push({ x: s.x, y: s.y })
        if (s.trail.length > 12) s.trail.shift()
        s.x += s.vx; s.y += s.vy; s.life -= s.decay
        if (s.life <= 0) { shooting.splice(i, 1); continue }
        ctx.save()
        s.trail.forEach((pt, ti) => {
          ctx.globalAlpha = (ti / s.trail.length) * s.life * 0.8
          ctx.fillStyle = '#ffffff'
          ctx.beginPath(); ctx.arc(pt.x, pt.y, (1 - ti / s.trail.length) * 2, 0, Math.PI * 2); ctx.fill()
        })
        ctx.restore()
      }
      animId = requestAnimationFrame(loop)
    }
    loop()

    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />
  )
}

function ProductCard({ product, selected, visible, index, onClick }: {
  product: Product; selected: boolean; visible: boolean; index: number; onClick: () => void
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const MAX_ROT = 14

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const inner = innerRef.current; const shine = shineRef.current
    if (!inner || !shine) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    inner.style.transform = `perspective(600px) rotateX(${-dy * MAX_ROT * 0.6}deg) rotateY(${dx * MAX_ROT}deg) scale3d(1.04,1.04,1.04)`
    shine.style.background = `radial-gradient(circle at ${((dx+1)/2)*100}% ${((dy+1)/2)*100}%, rgba(255,255,255,0.18) 0%, transparent 65%)`
    shine.style.opacity = '1'
  }

  const handleMouseLeave = () => {
    if (innerRef.current) innerRef.current.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    if (shineRef.current) shineRef.current.style.opacity = '0'
  }

  return (
    <button
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative text-left"
      style={{
        flex: 1, maxWidth: 200, borderRadius: 14, overflow: 'visible',
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? (selected ? 'scale(1.02)' : 'scale(1)') : 'translateY(16px)',
        transition: `opacity 0.4s ease ${index * 80}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${index * 80}ms`,
      }}
    >
      <div
        ref={innerRef}
        style={{
          borderRadius: 14, overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          border: selected ? '2px solid #e2b96f' : '2px solid rgba(255,255,255,0.1)',
          boxShadow: selected ? '0 0 24px rgba(226,185,111,0.2)' : 'none',
          transition: 'transform 0.08s ease-out, border 0.2s, box-shadow 0.2s',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-4xl opacity-20">◇</span>
            </div>
          )}
          <div ref={shineRef} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: 0, transition: 'opacity 0.2s', background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, transparent 65%)' }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'rgba(226,185,111,0.12)', zIndex: 3 }}>
            <span className="px-4 py-2 rounded-full text-xs font-semibold" style={{ background: '#e2b96f', color: '#1a1a2e' }}>Elegir esta ✓</span>
          </div>
          {selected && (
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#e2b96f', zIndex: 4 }}>
              <span className="text-sm font-bold" style={{ color: '#1a1a2e' }}>✓</span>
            </div>
          )}
        </div>
        <div className="p-3">
          {product.category && <p className="text-xs mb-1" style={{ color: 'rgba(226,185,111,0.7)' }}>{product.category}</p>}
          <p className="text-sm font-medium text-white leading-tight mb-1">{product.name}</p>
          <p className="text-sm font-bold" style={{ color: '#e2b96f' }}>{formatPrice(product.price)}</p>
        </div>
      </div>
    </button>
  )
}

export default function ProductComparisonOverlay({ slugs, onSelect, onRegisterClose, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [showCards, setShowCards] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t) }, [])

  const handleClose = () => { setVisible(false); setTimeout(() => onClose(), 400) }

  useEffect(() => { onRegisterClose(handleClose) }, [])

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        const results = await Promise.all(slugs.map(slug => fetch(`/api/product?slug=${slug}`).then(r => r.json())))
        setProducts(results.filter(Boolean))
      } catch { console.error('Error cargando productos') }
      finally { setLoading(false); setTimeout(() => setShowCards(true), 200) }
    }
    loadProducts()
  }, [slugs])

  const handleSelect = (product: Product) => {
    setSelected(product.slug)
    setTimeout(() => { setVisible(false); setTimeout(() => onSelect(product.slug, product), 400) }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: `rgba(7,7,26,${visible ? 0.92 : 0})`, backdropFilter: 'blur(8px)', transition: 'background 0.4s ease' }}>
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: '#07071a', border: '1px solid rgba(226,185,111,0.2)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
          position: 'relative',
        }}>
        <StarCanvas />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-xs font-semibold tracking-wider" style={{ color: '#e2b96f' }}>SOFÍA RECOMIENDA</p>
              <p className="text-white text-sm mt-0.5 opacity-60">Elige la que más te guste</p>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-3xl animate-bounce">✨</div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Sofía está preparando las opciones...</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(products.length, 4)}, 1fr)`, perspective: '1000px' }}>
                {products.map((product, i) => (
                  <ProductCard key={product.slug} product={product} selected={selected === product.slug} visible={showCards} index={i} onClick={() => handleSelect(product)} />
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Pasa el mouse por cada prenda ✦</p>
            <button onClick={handleClose} className="text-xs px-4 py-2 rounded-full transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
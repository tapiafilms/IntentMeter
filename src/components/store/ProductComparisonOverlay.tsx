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

// ─── Canvas de partículas hover (vanilla Canvas, sin Phaser) ─────────────────
function useHoverParticles(cardRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<any[]>([])
  const activeRef = useRef(false)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const imgEl = card.querySelector('.phaser-img-zone') as HTMLElement
    if (!imgEl) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2'
    imgEl.appendChild(canvas)
    canvasRef.current = canvas

    const resize = () => {
      canvas.width = imgEl.offsetWidth
      canvas.height = imgEl.offsetHeight
    }
    resize()

    const COLORS = ['#e2b96f', '#ffffff', '#f9a8d4', '#c4b5fd', '#93c5fd']

    const spawn = (x: number, y: number) => {
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2
        const spd = 30 + Math.random() * 90
        particlesRef.current.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: 0.025 + Math.random() * 0.03,
          size: 1.5 + Math.random() * 3.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          circle: Math.random() > 0.5,
        })
      }
    }

    const loop = () => {
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (activeRef.current) spawn(mouseRef.current.x, mouseRef.current.y)
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx * 0.016
        p.y += (p.vy + 60) * 0.016
        p.life -= p.decay
        if (p.life <= 0) return false
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        p.circle
          ? ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          : ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.fill()
        return true
      })
      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(loop)
    }
    loop()

    const onMove = (e: MouseEvent) => {
      const r = imgEl.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
      activeRef.current = true
    }
    const onLeave = () => { activeRef.current = false }

    imgEl.addEventListener('mousemove', onMove)
    imgEl.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(animRef.current)
      imgEl.removeEventListener('mousemove', onMove)
      imgEl.removeEventListener('mouseleave', onLeave)
      canvas.remove()
    }
  }, [cardRef])
}

// ─── Fondo Phaser con estrellas + orbes + burst de partículas ────────────────
function PhaserBackground({ triggerBurst, onBurstDone }: {
  triggerBurst: boolean
  onBurstDone: () => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)

  useEffect(() => {
    let destroyed = false

    import('phaser').then(({ default: Phaser }) => {
      if (destroyed || !mountRef.current) return

      const W = mountRef.current.offsetWidth || 900
      const H = mountRef.current.offsetHeight || 600

      class BgScene extends Phaser.Scene {
        stars: any[] = []
        orbs: any[] = []
        burst: any[] = []
        burstActive = false
        burstCount = 0
        burstTimer = 0
        t = 0

        constructor() { super('Bg') }

        create() {
          // Estrellas flotantes
          for (let i = 0; i < 60; i++) {
            const g = this.add.graphics()
            const sz = Phaser.Math.FloatBetween(0.7, 2.4)
            g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.45))
            g.fillCircle(0, 0, sz)
            g.x = Phaser.Math.Between(0, W)
            g.y = Phaser.Math.Between(0, H)
            this.stars.push({ g, baseY: g.y, spd: Phaser.Math.FloatBetween(0.2, 0.7), ph: Math.random() * Math.PI * 2 })
          }

          // Orbes difusos
          const orbCols = [0xe2b96f, 0x93c5fd, 0xc4b5fd, 0xf9a8d4]
          for (let i = 0; i < 4; i++) {
            const g = this.add.graphics()
            const r = Phaser.Math.Between(50, 90)
            g.fillStyle(orbCols[i], 0.035)
            g.fillCircle(0, 0, r)
            g.x = Phaser.Math.Between(80, W - 80)
            g.y = Phaser.Math.Between(80, H - 80)
            this.orbs.push({ g, vx: Phaser.Math.FloatBetween(-0.25, 0.25), vy: Phaser.Math.FloatBetween(-0.18, 0.18) })
          }

          sceneRef.current = this
        }

        startBurst() {
          this.burstActive = true
          this.burstCount = 0
          this.burstTimer = 0
        }

        update(_: number, delta: number) {
          this.t += delta

          this.stars.forEach(s => {
            s.g.y = s.baseY + Math.sin(this.t * 0.001 * s.spd + s.ph) * 3.5
            s.g.alpha = 0.15 + Math.sin(this.t * 0.0018 * s.spd + s.ph) * 0.15
          })

          this.orbs.forEach(o => {
            o.g.x += o.vx; o.g.y += o.vy
            if (o.g.x < 50 || o.g.x > W - 50) o.vx *= -1
            if (o.g.y < 50 || o.g.y > H - 50) o.vy *= -1
          })

          if (this.burstActive && this.burstCount < 180) {
            this.burstTimer += delta
            if (this.burstTimer > 35) {
              const COLS = [0xe2b96f, 0xffffff, 0x93c5fd, 0xf9a8d4, 0xc4b5fd, 0x86efac]
              for (let i = 0; i < 6; i++) {
                const cx = Phaser.Math.Between(W * 0.1, W * 0.9)
                const cy = Phaser.Math.Between(H * 0.15, H * 0.8)
                const col = Phaser.Utils.Array.GetRandom(COLS)
                const g = this.add.graphics()
                const sz = Phaser.Math.Between(2, 7)
                g.fillStyle(col, 1)
                Math.random() > 0.4 ? g.fillCircle(0, 0, sz) : g.fillRect(-sz / 2, -sz / 2, sz, sz)
                g.x = cx; g.y = cy
                const ang = Phaser.Math.Between(0, 360)
                const spd = Phaser.Math.Between(90, 260)
                this.burst.push({
                  g,
                  vx: Math.cos(Phaser.Math.DegToRad(ang)) * spd,
                  vy: Math.sin(Phaser.Math.DegToRad(ang)) * spd,
                  life: 1,
                  decay: Phaser.Math.FloatBetween(0.008, 0.022),
                })
                this.burstCount++
              }
              this.burstTimer = 0
            }
            if (this.burstCount >= 180) {
              this.burstActive = false
              onBurstDone()
            }
          }

          for (let i = this.burst.length - 1; i >= 0; i--) {
            const p = this.burst[i]
            p.g.x += p.vx * (delta / 1000)
            p.g.y += (p.vy + 70) * (delta / 1000)
            p.life -= p.decay
            p.g.alpha = Math.max(0, p.life)
            if (p.life <= 0) { p.g.destroy(); this.burst.splice(i, 1) }
          }
        }
      }

      const g = new Phaser.Game({
        type: Phaser.AUTO,
        width: W, height: H,
        transparent: true,
        parent: mountRef.current!,
        scene: BgScene,
        scale: { mode: Phaser.Scale.NONE },
      })
      gameRef.current = g
    })

    return () => {
      destroyed = true
      gameRef.current?.destroy(true)
    }
  }, [])

  useEffect(() => {
    if (triggerBurst && sceneRef.current) {
      sceneRef.current.startBurst()
    }
  }, [triggerBurst])

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  )
}

// ─── Tarjeta de producto con hover particles ──────────────────────────────────
function ProductCard({ product, selected, visible, index, onClick }: {
  product: Product
  selected: boolean
  visible: boolean
  index: number
  onClick: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  useHoverParticles(cardRef)

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 text-left"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: selected ? '2px solid #e2b96f' : '2px solid rgba(255,255,255,0.08)',
        transform: visible
          ? selected ? 'scale(1.02)' : 'scale(1)'
          : 'translateY(16px)',
        opacity: visible ? 1 : 0,
        transition: `transform 0.4s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms, opacity 0.4s ease ${index * 60}ms, border 0.2s ease`,
      }}
    >
      {/* Imagen con canvas de partículas */}
      <div className="phaser-img-zone relative w-full" style={{ aspectRatio: '3/4' }}>
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
          style={{ background: 'rgba(226,185,111,0.12)', zIndex: 1 }}
        >
          <span
            className="px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: '#e2b96f', color: '#1a1a2e' }}
          >
            Elegir esta ✓
          </span>
        </div>

        {/* Checkmark seleccionado */}
        {selected && (
          <div
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#e2b96f', zIndex: 3 }}
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
        <p className="text-sm font-medium text-white leading-tight mb-1">{product.name}</p>
        <p className="text-sm font-bold" style={{ color: '#e2b96f' }}>{formatPrice(product.price)}</p>
      </div>
    </button>
  )
}

// ─── Overlay principal ────────────────────────────────────────────────────────
export default function ProductComparisonOverlay({ slugs, onSelect, onRegisterClose, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [burstTrigger, setBurstTrigger] = useState(false)
  const [showCards, setShowCards] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setClosing(true)
    setVisible(false)
    setTimeout(() => onClose(), 400)
  }

  useEffect(() => {
    onRegisterClose(handleClose)
  }, [])

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        const results = await Promise.all(
          slugs.map(slug => fetch(`/api/product?slug=${slug}`).then(r => r.json()))
        )
        setProducts(results.filter(Boolean))
      } catch {
        console.error('Error cargando productos para comparativa')
      } finally {
        setLoading(false)
        // Disparar burst de partículas cuando los productos cargan
        setTimeout(() => setBurstTrigger(true), 300)
      }
    }
    loadProducts()
  }, [slugs])

  const handleBurstDone = () => {
    setShowCards(true)
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
        background: `rgba(15,15,30,${visible ? 0.88 : 0})`,
        backdropFilter: 'blur(8px)',
        transition: 'background 0.4s ease',
      }}
    >
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: '#0f0f1e',
          border: '1px solid rgba(226,185,111,0.2)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
          position: 'relative',
        }}
      >
        {/* Fondo Phaser */}
        <PhaserBackground
          triggerBurst={burstTrigger}
          onBurstDone={handleBurstDone}
        />

        {/* Contenido sobre el fondo */}
        <div style={{ position: 'relative', zIndex: 10 }}>
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
                style={{ gridTemplateColumns: `repeat(${Math.min(products.length, 4)}, 1fr)` }}
              >
                {products.map((product, i) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    selected={selected === product.slug}
                    visible={showCards}
                    index={i}
                    onClick={() => handleSelect(product)}
                  />
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
              Pasa el mouse por las prendas ✦
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
    </div>
  )
}
'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { Product, ProductVariant } from '@/lib/supabase/types'
import { useCartStore } from '@/lib/store/cart'

interface Props {
  product: Product
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

const SOFIA_COMMENTS: Record<string, string[]> = {
  vestidos: [
    '¿Ves la caída del tejido? Es lo que lo hace especial ✨',
    'Este es uno de mis favoritos de la temporada... ¿lo sentís?',
    'La silueta que forma es perfecta para cualquier ocasión 🤍',
  ],
  abrigos: [
    'La estructura de este abrigo es increíble, ¿no te parece?',
    'Este tono es tendencia ahora mismo... muy versátil 🔥',
    'Imagínatelo con botas altas. Una combinación perfecta ✨',
  ],
  blusas: [
    'El corte de esta blusa estiliza muchísimo la figura 🤍',
    'Este tejido es tan suave... ideal para el día a día ✨',
    'Me encanta cómo queda con jeans o falda por igual 💫',
  ],
  pantalones: [
    'El corte de tiro alto alarga la silueta, ¿lo notas? ✨',
    'Este modelo combina con absolutamente todo 🤍',
    'La tela cae perfecto, sin arrugarse durante el día 💫',
  ],
  accesorios: [
    'Un detalle así transforma cualquier outfit al instante ✨',
    'Este accesorio es de esos que usas con todo 🤍',
    'Me encanta la calidad del material, se nota en las fotos 💫',
  ],
  default: [
    '¿Ves los detalles en esta foto? Vale cada peso 🤍',
    'Este es uno de mis favoritos de la colección ✨',
    'La calidad se nota hasta en la foto... imagínatelo en persona 💫',
  ],
}

function getSofiaComment(category?: string): string {
  const key = category?.toLowerCase() ?? 'default'
  const comments = SOFIA_COMMENTS[key] ?? SOFIA_COMMENTS.default
  return comments[Math.floor(Math.random() * comments.length)]
}

export default function ProductDetail({ product }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  )
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [sofiaComment, setSofiaComment] = useState<string | null>(null)
  const [sofiaVisible, setSofiaVisible] = useState(false)
  const { addItem } = useCartStore()

  const hasVariants = product.variants.length > 0
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true
  const isLowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3

  function handleImageSelect(index: number) {
    setSelectedImage(index)
    // Mostrar comentario de Sofía solo al ver una foto que no es la primera
    if (index > 0 && !sofiaVisible) {
      setSofiaComment(getSofiaComment(product.category))
      setSofiaVisible(true)
      setTimeout(() => setSofiaVisible(false), 5000)
    }
  }

  function handleAddToCart() {
    if (!inStock) return
    addItem({
      productId: product.id,
      productName: product.name,
      variant: selectedVariant?.name ?? 'Único',
      price: product.price + (selectedVariant?.price_modifier ?? 0),
      qty: 1,
      image: product.images[0],
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    window.dispatchEvent(new CustomEvent('ti:add_to_cart', {
      detail: { product_id: product.id, variant: selectedVariant?.name }
    }))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

        {/* Galería */}
        <div className="space-y-3">
          {/* Imagen principal */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-surface-2)',
              aspectRatio: '3/4',
            }}
          >
            {product.images.length > 0 ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-10">◇</span>
              </div>
            )}

            {/* ── Franja comentario de Sofía ── */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
              style={{
                background: 'rgba(10, 10, 20, 0.82)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
                transform: sofiaVisible ? 'translateY(0)' : 'translateY(100%)',
                opacity: sofiaVisible ? 1 : 0,
                pointerEvents: sofiaVisible ? 'auto' : 'none',
              }}
            >
              {/* Mini avatar */}
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-[#1a1a2e]">
                <video
                  src="/avatar1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>
              {/* Texto */}
              <p className="text-white text-sm leading-snug flex-1" style={{ fontStyle: 'italic' }}>
                "{sofiaComment}"
              </p>
              {/* Cerrar */}
              <button
                onClick={() => setSofiaVisible(false)}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => handleImageSelect(i)}
                  className="relative flex-shrink-0 overflow-hidden transition-all"
                  style={{
                    width: 72, height: 96,
                    borderRadius: 'var(--radius-md)',
                    border: selectedImage === i
                      ? '2px solid var(--color-brand)'
                      : '2px solid transparent',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="72px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info del producto */}
        <div className="flex flex-col">
          {product.category && (
            <p className="text-xs font-medium tracking-widest mb-3"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
              {product.category.toUpperCase()}
            </p>
          )}

          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {product.name}
          </h1>

          <p className="text-2xl font-semibold mb-6">
            {formatPrice(product.price + (selectedVariant?.price_modifier ?? 0))}
          </p>

          {product.description && (
            <p className="text-sm leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}>
              {product.description}
            </p>
          )}

          {hasVariants && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">
                  {selectedVariant ? `Talla: ${selectedVariant.name}` : 'Selecciona una talla'}
                </p>
                <button
                  className="text-xs underline"
                  style={{ color: 'var(--color-text-muted)' }}
                  onClick={() => window.dispatchEvent(new CustomEvent('ti:shipping_view'))}
                >
                  Guía de tallas
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(variant => {
                  const outOfStock = variant.stock === 0
                  const isSelected = selectedVariant?.name === variant.name
                  return (
                    <button
                      key={variant.name}
                      onClick={() => !outOfStock && setSelectedVariant(variant)}
                      disabled={outOfStock}
                      className="relative px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '2px solid var(--color-brand)'
                          : '1.5px solid var(--color-border)',
                        background: isSelected ? 'var(--color-brand)' : 'transparent',
                        color: isSelected ? 'white'
                          : outOfStock ? 'var(--color-text-muted)'
                          : 'var(--color-text-primary)',
                        opacity: outOfStock ? 0.4 : 1,
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        textDecoration: outOfStock ? 'line-through' : 'none',
                      }}
                    >
                      {variant.name}
                    </button>
                  )
                })}
              </div>
              {isLowStock && (
                <p className="mt-3 text-xs font-medium" style={{ color: '#c05621' }}>
                  ⚡ Solo quedan {selectedVariant!.stock} unidades
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-full py-4 px-8 rounded-full font-medium text-sm transition-all mb-4"
            style={{
              background: added ? '#22c55e' : inStock ? 'var(--color-brand)' : 'var(--color-border)',
              color: inStock ? 'white' : 'var(--color-text-muted)',
              cursor: inStock ? 'pointer' : 'not-allowed',
              transform: added ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            {added ? '✓ Agregado al carrito' : !inStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>

          <button
            className="w-full py-3 px-8 rounded-full font-medium text-sm border transition-all"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            onClick={() => window.dispatchEvent(new CustomEvent('ti:shipping_view'))}
          >
            Ver info de envío y devoluciones
          </button>

          {Object.keys(product.metadata).length > 0 && (
            <div
              className="mt-8 pt-8 border-t space-y-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {Object.entries(product.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-4 text-sm">
                  <span
                    className="capitalize font-medium min-w-24"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {key}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
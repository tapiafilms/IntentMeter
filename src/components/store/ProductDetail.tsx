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

export default function ProductDetail({ product }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  )
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const { addItem } = useCartStore()

  const hasVariants = product.variants.length > 0
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true
  const isLowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3

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

    // Dispara evento de tracking
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
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
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
          {/* Categoría */}
          {product.category && (
            <p className="text-xs font-medium tracking-widest mb-3"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
              {product.category.toUpperCase()}
            </p>
          )}

          {/* Nombre */}
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {product.name}
          </h1>

          {/* Precio */}
          <p className="text-2xl font-semibold mb-6">
            {formatPrice(product.price + (selectedVariant?.price_modifier ?? 0))}
          </p>

          {/* Descripción */}
          {product.description && (
            <p className="text-sm leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}>
              {product.description}
            </p>
          )}

          {/* Selector de variantes */}
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

              {/* Stock bajo */}
              {isLowStock && (
                <p className="mt-3 text-xs font-medium" style={{ color: '#c05621' }}>
                  ⚡ Solo quedan {selectedVariant!.stock} unidades
                </p>
              )}
            </div>
          )}

          {/* Botón agregar al carrito */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-full py-4 px-8 rounded-full font-medium text-sm transition-all mb-4"
            style={{
              background: added
                ? '#22c55e'
                : inStock
                ? 'var(--color-brand)'
                : 'var(--color-border)',
              color: inStock ? 'white' : 'var(--color-text-muted)',
              cursor: inStock ? 'pointer' : 'not-allowed',
              transform: added ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            {added ? '✓ Agregado al carrito' : !inStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>

          {/* Info envío */}
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

          {/* Metadata del producto */}
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

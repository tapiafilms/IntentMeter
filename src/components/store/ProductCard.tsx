import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/lib/supabase/types'

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

export default function ProductCard({ product }: Props) {
  const hasImage = product.images && product.images.length > 0
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
  const isLowStock = totalStock > 0 && totalStock <= 3

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      {/* Imagen */}
      <div
        className="relative overflow-hidden mb-3"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-2)',
          aspectRatio: '3/4',
        }}
      >
        {hasImage ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20">◇</span>
          </div>
        )}

        {/* Badge stock bajo */}
        {isLowStock && (
          <div
            className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
          >
            Últimas {totalStock}
          </div>
        )}

        {/* Overlay hover */}
        <div
          className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(to top, rgba(26,26,46,0.7) 0%, transparent 60%)' }}
        >
          <span className="text-white text-sm font-medium">Ver producto →</span>
        </div>
      </div>

      {/* Info */}
      <div>
        {product.category && (
          <p className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
            {product.category.toUpperCase()}
          </p>
        )}
        <h3
          className="text-sm font-medium mb-1 transition-opacity group-hover:opacity-70 line-clamp-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {product.name}
        </h3>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  )
}

import { getProducts } from '@/lib/supabase/queries'
import ProductCard from '@/components/store/ProductCard'

export const revalidate = 60 // ISR: revalida cada 60 segundos

interface Props {
  searchParams: Promise<{ categoria?: string }>
}

export default async function ProductosPage({ searchParams }: Props) {
  const { categoria } = await searchParams
  const products = await getProducts(categoria)

  // Categorías únicas para el filtro
  const allProducts = await getProducts()
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))] as string[]

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-widest mb-2"
          style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
          CATÁLOGO
        </p>
        <h1 className="font-display text-4xl font-bold mb-6">
          {categoria ? categoria : 'Todos los productos'}
        </h1>

        {/* Filtros por categoría */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <a
              href="/productos"
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: !categoria ? 'var(--color-brand)' : 'var(--color-surface-2)',
                color: !categoria ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              Todos
            </a>
            {categories.map(cat => (
              <a
                key={cat}
                href={`/productos?categoria=${encodeURIComponent(cat)}`}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: categoria === cat ? 'var(--color-brand)' : 'var(--color-surface-2)',
                  color: categoria === cat ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {cat}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Grid de productos */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24" style={{ color: 'var(--color-text-muted)' }}>
          <p className="font-display text-3xl mb-3">Sin productos aún</p>
          <p className="text-sm">
            {categoria
              ? `No hay productos en la categoría "${categoria}".`
              : 'Agrega productos desde el panel de administración.'}
          </p>
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import HeroCarousel from '@/components/store/HeroCarousel'
import { getProducts } from '@/lib/supabase/queries'
import ProductCard from '@/components/store/ProductCard'

export default async function HomePage() {
  const products = await getProducts()
  const featured = products.slice(0, 4)

  return (
    <>
      <HeroCarousel products={products} />

      {/* Productos destacados */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-medium tracking-widest mb-2"
                style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
                DESTACADOS
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Lo más nuevo
              </h2>
            </div>
            <Link
              href="/productos"
              className="text-sm font-medium hidden md:flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ver todo <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product, i) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Banner propuesta de valor */}
      <section style={{ background: 'var(--color-surface-2)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '✦', title: 'Envío a todo Chile', desc: 'Despacho en 2-5 días hábiles a cualquier región.' },
            { icon: '◈', title: 'Cambios sin drama', desc: '30 días para cambiar talla o color sin preguntas.' },
            { icon: '◇', title: 'Pago seguro', desc: 'Webpay, tarjetas y transferencia bancaria.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-2xl mt-1" style={{ color: 'var(--color-accent)' }}>{item.icon}</span>
              <div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
import HeroCarousel from '@/components/store/HeroCarousel'
import FeaturedCarousel from '@/components/store/FeaturedCarousel'
import { getProducts, getCategories } from '@/lib/supabase/queries'

export default async function HomePage() {
  const [products, dbCategories] = await Promise.all([getProducts(), getCategories()])

  // Si hay categorías en la tabla úsalas, si no deriva de productos como fallback
  const categories = dbCategories.length > 0
    ? dbCategories.map(c => ({
        name: c.name,
        image: c.image_url,
        href: `/productos?categoria=${encodeURIComponent(c.slug)}`,
      }))
    : [...new Map(products.filter(p => p.category && p.images?.[0]).map(p => [p.category, p])).values()]
        .map(p => ({ name: p.category!, image: p.images![0], href: `/productos?categoria=${encodeURIComponent(p.category!)}` }))

  return (
    <>
      <HeroCarousel categories={categories} />

      <FeaturedCarousel products={products} />

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
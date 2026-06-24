import HeroCarousel from '@/components/store/HeroCarousel'
import FeaturedCarousel from '@/components/store/FeaturedCarousel'
import ExploreCategoriesSection from '@/components/store/ExploreCategoriesSection'
import AccessoriesSection from '@/components/store/AccessoriesSection'
import CustomersSection from '@/components/store/CustomersSection'
import { getProducts, getCategories, getCustomerProfile } from '@/lib/supabase/queries'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { personalizeProducts } from '@/lib/personalization/filterProducts'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

type HomeSection = {
  type: string
  enabled: boolean
  sort_order: number
  config: Record<string, unknown>
}

async function getHomeSections(): Promise<HomeSection[]> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('home_sections')
      .select('type, enabled, sort_order, config')
      .eq('tenant_id', TENANT_ID)
      .order('sort_order', { ascending: true })
    return (data ?? []) as HomeSection[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [products, dbCategories, homeSections] = await Promise.all([
    getProducts(),
    getCategories(),
    getHomeSections(),
  ])

  const categories = dbCategories.length > 0
    ? dbCategories.map(c => ({
        name: c.name,
        image: c.image_url,
        href: `/productos?categoria=${encodeURIComponent(c.slug)}`,
      }))
    : [...new Map(products.filter(p => p.category && p.images?.[0]).map(p => [p.category, p])).values()]
        .map(p => ({ name: p.category!, image: p.images![0], href: `/productos?categoria=${encodeURIComponent(p.category!)}` }))

  let customerProfile = null
  let customerName = null
  let customerAvatar = null
  if (user) {
    customerProfile = await getCustomerProfile(user.id)
    customerName = customerProfile?.name ?? user.user_metadata?.name ?? null
    customerAvatar = user.user_metadata?.avatar_url ?? null
  }

  const featuredProducts = customerProfile
    ? personalizeProducts(products, customerProfile)
    : products

  // Si no hay secciones en DB, usamos las dos secciones por defecto
  const enabledSections: HomeSection[] = homeSections.length > 0
    ? homeSections.filter(s => s.enabled)
    : [
        { type: 'featured',     enabled: true, sort_order: 1, config: {} },
        { type: 'collections',  enabled: true, sort_order: 2, config: {} },
        { type: 'accessories',  enabled: true, sort_order: 3, config: {} },
        { type: 'customers',    enabled: true, sort_order: 4, config: {} },
      ]

  return (
    <>
      <HeroCarousel categories={categories} customerName={customerName} />

      {enabledSections.map(sec => {
        if (sec.type === 'featured') {
          const cfg = sec.config as { title?: string; subtitle?: string }
          return (
            <FeaturedCarousel
              key="featured"
              products={featuredProducts}
              customerName={customerName}
              customerAvatar={customerAvatar}
              sectionTitle={cfg.title || undefined}
              sectionSubtitle={cfg.subtitle || undefined}
            />
          )
        }

        if (sec.type === 'collections') {
          const cfg = sec.config as { title?: string; items?: unknown[] }
          return (
            <ExploreCategoriesSection
              key="collections"
              title={cfg.title || 'Colecciones'}
              items={cfg.items as never}
            />
          )
        }

        if (sec.type === 'accessories') {
          const cfg = sec.config as { title?: string; subtitle?: string; items?: unknown[] }
          return (
            <AccessoriesSection
              key="accessories"
              title={cfg.title || 'Accesorios'}
              subtitle={cfg.subtitle || undefined}
              items={cfg.items as never}
            />
          )
        }

        if (sec.type === 'customers') {
          const cfg = sec.config as { title?: string; description?: string; cta_text?: string; cta_href?: string; items?: unknown[] }
          return (
            <CustomersSection
              key="customers"
              title={cfg.title}
              description={cfg.description}
              cta_text={cfg.cta_text}
              cta_href={cfg.cta_href}
              photos={cfg.items as never}
            />
          )
        }

        return null
      })}

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

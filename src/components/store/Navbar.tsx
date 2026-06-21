import Link from 'next/link'
import { createStaticClient } from '@/lib/supabase/server'
import { getTenant, getStoreConfig } from '@/lib/supabase/queries'
import CartButton from './CartButton'
import NavLinks from './NavLinks'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

async function getNavItems() {
  const db = createStaticClient()
  const { data } = await db
    .from('nav_items')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('sort_order', { ascending: true })
  return (data || []) as { id: string; label: string; url: string; parent: string }[]
}

export default async function Navbar() {
  const [navItems, tenant] = await Promise.all([getNavItems(), getTenant()])
  const rootItems = navItems.filter(i => !i.parent)
  const store = getStoreConfig(tenant)

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: '#fff',
        borderColor: '#fff',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-tight flex items-center" style={{ position: 'absolute', top: 10, zIndex: 60 }}>
          {store.logo_url
            ? <img src={store.logo_url} alt={store.name} style={{ height: 100, objectFit: 'contain' }} />
            : <>{store.name}<span style={{ color: 'var(--color-accent)' }}>.</span></>
          }
        </Link>

        {/* Spacer para compensar el logo absolute */}
        <div style={{ width: 140 }} />

        <NavLinks items={rootItems} />

        <div className="flex items-center gap-4">
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold select-none"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)',
              color: '#e2b96f',
              border: '1px solid rgba(226,185,111,0.3)',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: '10px' }}>✦</span>
            <span>Asistida con IA — aprovéchala</span>
          </div>

          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-70"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Admin
          </Link>

          <CartButton />
        </div>
      </div>
      <img src="/curva.png" alt="" className="absolute left-0 right-0 w-full pointer-events-none" style={{ bottom: 0, transform: 'translateY(100%)', zIndex: 50 }} />
    </header>
  )
}
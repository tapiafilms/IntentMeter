import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import CartDrawer from '@/components/store/CartDrawer'
import TrackingProvider from '@/components/store/TrackingProvider'
import AIWidget from '@/components/store/AIWidget'
import DemoPanel from '@/components/store/DemoPanel'
import PageTransition from '@/components/store/PageTransition'
import { getTenant, getStoreConfig } from '@/lib/supabase/queries'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenant()
  const store = getStoreConfig(tenant)

  // Hex to RGB helper for CSS vars that need alpha variants
  const dark = store.theme === 'dark'
  const cssVars = `
    :root {
      --color-brand:          ${dark ? '#ffffff' : store.primary_color};
      --color-text-primary:   ${dark ? '#ffffff' : store.primary_color};
      --color-text:           ${dark ? '#ffffff' : store.primary_color};
      --color-accent:         ${store.accent_color};
      --color-surface:        ${dark ? '#13121e' : '#f8f6f2'};
      --color-surface-2:      ${dark ? '#1e1c2e' : '#f0ede6'};
      --color-border:         ${dark ? '#2e2c42' : '#e5e0d8'};
      --color-text-secondary: ${dark ? '#9895b0' : '#6b6560'};
      --color-text-muted:     ${dark ? '#5e5c75' : '#9e9890'};
      --color-cream:          ${dark ? '#13121e' : '#fdfaf5'};
    }
    body { background-color: var(--color-surface); color: var(--color-text-primary); }
  `

  return (
    <TrackingProvider>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <Footer />
        <CartDrawer />
        <AIWidget />
      </div>
      <DemoPanel />
    </TrackingProvider>
  )
}
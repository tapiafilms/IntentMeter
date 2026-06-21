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
  const cssVars = `
    :root {
      --color-brand: ${store.primary_color};
      --color-text-primary: ${store.primary_color};
      --color-text: ${store.primary_color};
      --color-accent: ${store.accent_color};
    }
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
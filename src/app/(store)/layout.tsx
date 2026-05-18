import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import CartDrawer from '@/components/store/CartDrawer'
import TrackingProvider from '@/components/store/TrackingProvider'
import AIWidget from '@/components/store/AIWidget'
import DemoPanel from '@/components/store/DemoPanel'
import PageTransition from '@/components/store/PageTransition'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TrackingProvider>
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
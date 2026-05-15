// ============================================================
// components/store/TrackingProvider.tsx
// Wrapper cliente — activa tracking global en toda la tienda
// ============================================================
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  trackEvent,
  useExitIntentTracker,
  useIdleTracker,
} from '@/lib/tracker'

export default function TrackingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Page view en cada cambio de ruta
  useEffect(() => {
    trackEvent('page_view', { url: pathname })
  }, [pathname])

  // Exit intent y idle globales
  useExitIntentTracker()
  useIdleTracker(30_000)

  return <>{children}</>
}
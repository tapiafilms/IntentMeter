'use client'
// ============================================================
// components/TrackingProvider.tsx
// Componente cliente que activa los hooks de tracking globales
// ============================================================
import { useSessionEndTracker, useExitIntentTracker, useIdleTracker, usePolicyViewTracker } from '@/lib/tracker'

export default function TrackingProvider() {
  useSessionEndTracker()
  useExitIntentTracker()
  useIdleTracker()
  usePolicyViewTracker()

  return null // no renderiza nada
}

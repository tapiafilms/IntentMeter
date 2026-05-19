// ============================================================
// lib/tracker/index.ts
// Hook de tracking — registra eventos de sesión en Supabase
// ============================================================
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { SessionEventType } from '@/lib/supabase/types'

// ── Visitor ID persistido en localStorage ─────────────────────
function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder'
  let id = localStorage.getItem('ti_visitor_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('ti_visitor_id', id)
  }
  return id
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder'
  let id = localStorage.getItem('ti_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('ti_session_id', id)
  }
  return id
}

// ── Función base de tracking ──────────────────────────────────
export async function trackEvent(
  type: SessionEventType,
  payload: Record<string, unknown> = {}
) {
  try {
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        type,
        payload,
      }),
    })

    const data = await res.json()
    if (data.session_id) localStorage.setItem('ti_session_id', data.session_id)
    if (data.intent_score !== undefined) {
      window.dispatchEvent(new CustomEvent('ti:track', {
        detail: {
          type,
          payload,
          score: data.intent_score,
          intentType: data.intent_type,
        }
      }))
    }
  } catch {
    // Silencioso
  }
}

// ── Hook para componentes ─────────────────────────────────────
export function useTracker() {
  const track = useCallback(
    (type: SessionEventType, payload: Record<string, unknown> = {}) =>
      trackEvent(type, payload),
    []
  )
  return { track }
}

// ── Hook de scroll depth ──────────────────────────────────────
export function useScrollDepthTracker(productSlug?: string) {
  const reported = useRef<Set<number>>(new Set())

  useEffect(() => {
    const thresholds = [25, 50, 75, 100]

    const handler = () => {
      const scrolled =
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100

      thresholds.forEach(t => {
        if (scrolled >= t && !reported.current.has(t)) {
          reported.current.add(t)
          trackEvent('scroll_depth', { depth: t, slug: productSlug ?? 'unknown' })
        }
      })
    }

    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [productSlug])
}

// ── Hook de exit intent ───────────────────────────────────────
export function useExitIntentTracker() {
  const fired = useRef(false)
  const lastY = useRef(0)

  useEffect(() => {
    const trackMouseMove = (e: MouseEvent) => {
      lastY.current = e.clientY
    }

    const handler = (e: MouseEvent) => {
      if (e.clientY <= 5 && lastY.current > 20 && !fired.current) {
        fired.current = true
        trackEvent('exit_intent', { url: window.location.pathname })
      }
    }

    window.addEventListener('mousemove', trackMouseMove, { passive: true })
    document.addEventListener('mouseleave', handler)

    return () => {
      window.removeEventListener('mousemove', trackMouseMove)
      document.removeEventListener('mouseleave', handler)
    }
  }, [])
}

// ── Hook de idle detection ────────────────────────────────────
export function useIdleTracker(timeoutMs = 30_000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const hasInteracted = useRef(false)

  useEffect(() => {
    const reset = () => {
      fired.current = false
      hasInteracted.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (!fired.current && hasInteracted.current) {
          fired.current = true
          trackEvent('idle_detected', {
            url: window.location.pathname,
            timeout_ms: timeoutMs,
          })
        }
      }, timeoutMs)
    }

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [timeoutMs])
}

// ── Hook de cierre de sesión ──────────────────────────────────
// Escribe ended_at cuando el usuario cierra la pestaña o navega fuera
export function useSessionEndTracker() {
  useEffect(() => {
    const handleEnd = () => {
      const sessionId = getSessionId()
      const visitorId = getVisitorId()
      if (!sessionId || sessionId === 'ssr-placeholder') return

      // sendBeacon es más confiable que fetch en beforeunload
      navigator.sendBeacon(
        '/api/session-end',
        JSON.stringify({ sessionId, visitorId })
      )
    }

    window.addEventListener('beforeunload', handleEnd)
    // visibilitychange captura cuando el usuario cambia de pestaña en móvil
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleEnd()
    })

    return () => {
      window.removeEventListener('beforeunload', handleEnd)
    }
  }, [])
}

// ── Hook de vista de producto (detecta revisitas) ─────────────
// Llámalo en la página de cada producto
export function useProductViewTracker(slug: string) {
  useEffect(() => {
    if (!slug || slug === 'ssr-placeholder') return

    const key = `ti_viewed_${slug}`
    const alreadySeen = sessionStorage.getItem(key)

    if (alreadySeen) {
      // Ya lo vio en esta sesión → es una revisita
      trackEvent('product_revisit', { slug })
    } else {
      // Primera vez que lo ve
      sessionStorage.setItem(key, '1')
      trackEvent('product_view', { slug })
    }
  }, [slug])
}

// ── Hook de búsqueda ──────────────────────────────────────────
// Llámalo pasándole el término buscado cuando el usuario ejecuta una búsqueda
export function useSearchTracker() {
  const track = useCallback((query: string) => {
    if (!query?.trim()) return
    trackEvent('search_query', { query: query.trim().toLowerCase() })
  }, [])

  return { trackSearch: track }
}

// ── Hook de páginas de políticas ──────────────────────────────
// Detecta automáticamente si el usuario está en /envios o /devoluciones
export function usePolicyViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    if (pathname.includes('envio')) {
      trackEvent('shipping_view', { url: pathname })
    } else if (pathname.includes('devolucion') || pathname.includes('cambio')) {
      trackEvent('returns_view', { url: pathname })
    }
  }, [pathname])
}

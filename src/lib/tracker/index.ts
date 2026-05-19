// ============================================================
// lib/tracker/index.ts
// Hook de tracking — registra eventos de sesión en Supabase
// ============================================================
'use client'

import { useCallback, useEffect, useRef } from 'react'
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

    // Emitir evento al widget con el score actualizado
    const data = await res.json()
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

// ── Hook de exit intent (MEJORADO) ────────────────────────────
export function useExitIntentTracker() {
  const fired = useRef(false)
  const lastY = useRef(0)
  const lastX = useRef(0)

  useEffect(() => {
    // Rastrear el movimiento del mouse para detectar velocidad
    const trackMouseMove = (e: MouseEvent) => {
      lastY.current = e.clientY
      lastX.current = e.clientX
    }

    const handler = (e: MouseEvent) => {
      // Solo detectar si el cursor sale por la parte superior (y < 5)
      // Y si el movimiento fue hacia arriba (velocidad positiva en Y)
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

// ── Hook de idle detection (MEJORADO) ──────────────────────────
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

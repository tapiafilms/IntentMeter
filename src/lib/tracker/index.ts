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

// ── Session ID en memoria (dura mientras el tab esté abierto) ─
let _sessionId: string | null = null
function getSessionId(): string {
  if (!_sessionId) _sessionId = crypto.randomUUID()
  return _sessionId
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

// ── Hook de exit intent ───────────────────────────────────────
export function useExitIntentTracker() {
  const fired = useRef(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 5 && !fired.current) {
        fired.current = true
        trackEvent('exit_intent', { url: window.location.pathname })
      }
    }
    document.addEventListener('mouseleave', handler)
    return () => document.removeEventListener('mouseleave', handler)
  }, [])
}

// ── Hook de idle detection ────────────────────────────────────
export function useIdleTracker(timeoutMs = 30_000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    const reset = () => {
      fired.current = false
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (!fired.current) {
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
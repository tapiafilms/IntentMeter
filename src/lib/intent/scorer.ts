// ============================================================
// lib/intent/scorer.ts
// Calcula intent_score e intent_type a partir de eventos
// ============================================================
import type { SessionEventType, IntentType } from '@/lib/supabase/types'

// ── Tabla de puntos por evento ────────────────────────────────
const EVENT_SCORES: Partial<Record<SessionEventType, number>> = {
  page_view:        2,
  product_view:     8,
  product_revisit:  15,
  cart_view:        10,
  add_to_cart:      25,
  remove_from_cart: -5,
  checkout_start:   30,
  checkout_abandon: -10,
  shipping_view:    5,
  returns_view:     3,
  search_query:     4,
  exit_intent:      -5,
  idle_detected:    -3,
}

// ── Puntos extra por scroll depth ────────────────────────────
export function getScrollScore(depth: number): number {
  if (depth >= 100) return 8
  if (depth >= 75)  return 5
  if (depth >= 50)  return 2
  return 0
}

// ── Score de un evento individual ────────────────────────────
export function scoreEvent(
  type: SessionEventType,
  payload: Record<string, unknown> = {}
): number {
  if (type === 'scroll_depth') {
    return getScrollScore((payload.depth as number) ?? 0)
  }
  return EVENT_SCORES[type] ?? 0
}

// ── Intent type según score total ────────────────────────────
export function getIntentType(score: number): IntentType {
  if (score >= 86) return 'buyer'
  if (score >= 66) return 'price_sensitive'
  if (score >= 41) return 'comparator'
  if (score >= 21) return 'undecided'
  return 'curious'
}

// ── Clamp entre 0 y 100 ───────────────────────────────────────
export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score))
}
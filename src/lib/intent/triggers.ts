// ============================================================
// lib/intent/triggers.ts
// Reglas que deciden cuándo y cómo abrir el widget IA
// ============================================================
import type { IntentType, SessionEventType } from '@/lib/supabase/types'

export interface TriggerResult {
  shouldOpen: boolean
  reason: string
  greeting: string
}

export function evaluateTrigger(
  eventType: SessionEventType,
  intentScore: number,
  intentType: IntentType,
  payload: Record<string, unknown> = {},
  productName?: string
): TriggerResult {

  // R01 — Add to cart sin checkout después de 30s
  if (eventType === 'cart_view') {
    return {
      shouldOpen: true,
      reason: 'cart_view_high_intent',
      greeting: `¡Hola! Vi que agregaste algo al carrito 🛍️ ¿Tienes alguna duda sobre tallas, envío o cambios antes de finalizar?`,
    }
  }

  // R02 — Product revisit (volvió a ver el mismo producto)
  if (eventType === 'product_revisit') {
    const name = productName ?? 'ese producto'
    return {
      shouldOpen: true,
      reason: 'product_revisit',
      greeting: `Hola 👋 Noto que volviste a ver ${name}. ¿Te puedo ayudar a decidirte o tienes alguna pregunta?`,
    }
  }

  // R03 — Exit intent con intención media-alta
  if (eventType === 'exit_intent') {
    return {
      shouldOpen: true,
      reason: 'exit_intent',
      greeting: `¡Espera! ¿Encontraste lo que buscabas? Si tienes alguna duda puedo ayudarte ahora mismo 😊`,
    }
  }

  // R04 — Idle con producto activo
  if (eventType === 'idle_detected' && productName) {
    return {
      shouldOpen: true,
      reason: 'idle_on_product',
      greeting: `Hola 👋 ¿Tienes preguntas sobre ${productName}? Estoy aquí para ayudarte.`,
    }
  }

  // R05 — Score alto (buyer) sin checkout
if (eventType === 'product_view' && intentScore >= 8) {
    return {
      shouldOpen: true,
      reason: 'high_intent_buyer',
      greeting: `¡Hola! Veo que te interesa nuestra colección 💛 ¿Puedo ayudarte a encontrar la pieza perfecta?`,
    }
  }

  return { shouldOpen: false, reason: '', greeting: '' }
}
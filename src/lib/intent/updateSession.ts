// ============================================================
// lib/intent/updateSession.ts
// Actualiza intent_score e intent_type en la sesión activa
// ============================================================
import { createServiceClient } from '@/lib/supabase/server'
import { scoreEvent, getIntentType, clampScore } from './scorer'
import type { SessionEventType } from '@/lib/supabase/types'

export async function updateSessionIntent(
  sessionId: string,
  eventType: SessionEventType,
  payload: Record<string, unknown> = {}
) {
  const db = createServiceClient()

  // Leer score actual
  const { data: session, error } = await db
    .from('sessions')
    .select('intent_score')
    .eq('id', sessionId)
    .single()

  if (error || !session) return

  // Calcular nuevo score
  const delta = scoreEvent(eventType, payload)
  const newScore = clampScore((session.intent_score ?? 0) + delta)
  const newType = getIntentType(newScore)

  // Actualizar sesión
  await db
    .from('sessions')
    .update({
      intent_score: newScore,
      intent_type: newType,
    })
    .eq('id', sessionId)
}
// ============================================================
// app/api/track/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateSession } from '@/lib/supabase/queries'
import { updateSessionIntent } from '@/lib/intent/updateSession'
import type { SessionEventType } from '@/lib/supabase/types'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

interface TrackBody {
  visitorId: string
  sessionId: string
  type: SessionEventType
  payload: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  try {
    const body: TrackBody = await req.json()
    const { visitorId, type, payload } = body

    if (!visitorId || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const db = createServiceClient()

    // Obtener o crear sesión
    const session = await getOrCreateSession(visitorId)

    // Insertar evento
    const { error } = await db.from('session_events').insert({
      tenant_id: TENANT_ID,
      session_id: session.id,
      type,
      payload,
    } as any)

    if (error) throw error

    // Actualizar intent score
    await updateSessionIntent(session.id, type, payload)

    // Leer el score actualizado para devolverlo al cliente
    const { data: updatedSession } = await db
      .from('sessions')
      .select('intent_score, intent_type')
      .eq('id', session.id)
      .single()

    const sessionData = updatedSession as any

    return NextResponse.json({
      ok: true,
      session_id: session.id,
      intent_score: sessionData?.intent_score ?? 0,
      intent_type: sessionData?.intent_type ?? 'curious',
    })
  } catch (err) {
    console.error('[track]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
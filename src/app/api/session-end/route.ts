// ============================================================
// app/api/session-end/route.ts
// Cierra la sesión escribiendo ended_at en Supabase
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ ok: false })

    const db = await createClient()
    await db
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('tenant_id', TENANT_ID)
      .is('ended_at', null) // solo si no está ya cerrada

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// ============================================================
// app/api/save-conversation/route.ts
// Guarda la conversación completa al cerrar el chat — 1 write por sesión
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

interface SaveBody {
  sessionId: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  outcome: 'converted' | 'abandoned' | 'ongoing'
}

function detectObjections(messages: SaveBody['messages']): string[] {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ')

  const checks: [string, string][] = [
    ['talla',               'talla'],
    ['talle',               'talla'],
    ['precio|caro|barato',  'precio'],
    ['envio|envío|despacho','envío'],
    ['cambio|devolu',       'cambios/devoluciones'],
    ['color',               'color'],
    ['stock|disponib',      'disponibilidad'],
    ['material|tela',       'material'],
    ['descuento|oferta',    'descuento'],
    ['garantia|garantía',   'garantía'],
  ]

  const found = new Set<string>()
  checks.forEach(([pattern, label]) => {
    if (new RegExp(pattern).test(userText)) found.add(label)
  })
  return Array.from(found)
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveBody = await req.json()
    const { sessionId, messages, outcome } = body

    if (!sessionId || !messages?.length) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const db = await createClient()
    const objections = detectObjections(messages)
    const now = new Date().toISOString()

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: now,
    }))

    // Upsert: si ya existe conversación para esta sesión, actualizar; si no, crear
    const { data: existing } = await db
      .from('conversations')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      await db.from('conversations').update({
        messages: formattedMessages,
        objections,
        outcome,
        updated_at: now,
      }).eq('id', existing.id)
    } else {
      await db.from('conversations').insert({
        tenant_id: TENANT_ID,
        session_id: sessionId,
        product_id: null,
        messages: formattedMessages,
        trigger_type: 'R01',
        objections,
        outcome,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[save-conversation]', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
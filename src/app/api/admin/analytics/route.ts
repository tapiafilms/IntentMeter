import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function GET() {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createServiceClient()
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: sessions },
      { data: events },
      { data: conversations },
      { data: recentConversations },
      { data: scrollEvents },
      { data: idleEvents },
      { data: weeklyReport },
    ] = await Promise.all([
      svc.from('sessions').select('*').eq('tenant_id', TENANT_ID).gte('started_at', since7).order('started_at', { ascending: false }),
      svc.from('session_events').select('type, payload, created_at, session_id').eq('tenant_id', TENANT_ID).gte('created_at', since7),
      svc.from('conversations').select('objections, messages, product_id, outcome, created_at').eq('tenant_id', TENANT_ID).gte('created_at', since7),
      svc.from('conversations').select('id, session_id, messages, objections, outcome, created_at').eq('tenant_id', TENANT_ID).gte('created_at', since7).order('created_at', { ascending: false }).limit(10),
      svc.from('session_events').select('payload, session_id').eq('tenant_id', TENANT_ID).eq('type', 'scroll_depth').gte('created_at', since7),
      svc.from('session_events').select('payload').eq('tenant_id', TENANT_ID).eq('type', 'idle_detected').gte('created_at', since7),
      svc.from('weekly_reports').select('*').eq('tenant_id', TENANT_ID).order('week_start', { ascending: false }).limit(1).single(),
    ])

    return NextResponse.json({
      sessions:             sessions ?? [],
      events:               events ?? [],
      conversations:        conversations ?? [],
      recentConversations:  recentConversations ?? [],
      scrollEvents:         scrollEvents ?? [],
      idleEvents:           idleEvents ?? [],
      weeklyReport:         weeklyReport ?? null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function GET() {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await db.from('tenants').select('config').eq('id', TENANT_ID).single()
    if (error) throw error
    return NextResponse.json({ config: data.config })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { store } = await req.json()
    if (!store || typeof store !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Merge store config into existing config (preserves widget/rules/ai settings)
    const { data: current } = await db.from('tenants').select('config').eq('id', TENANT_ID).single()
    const merged = { ...(current?.config ?? {}), store }

    const { error } = await db.from('tenants').update({ config: merged }).eq('id', TENANT_ID)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

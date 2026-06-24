import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function GET() {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('home_sections')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json({ sections: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sections } = await req.json()
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const svc = createServiceClient()

    for (const sec of sections) {
      const payload = {
        tenant_id: TENANT_ID,
        type: sec.type,
        enabled: sec.enabled,
        sort_order: sec.sort_order,
        config: sec.config ?? {},
      }
      const { error } = await svc
        .from('home_sections')
        .upsert(payload, { onConflict: 'tenant_id,type' })
      if (error) throw error
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

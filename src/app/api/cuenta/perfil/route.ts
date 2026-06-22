import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertCustomerProfile } from '@/lib/supabase/queries'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const { name, style, occasions, colors, size } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    await upsertCustomerProfile(user.id, { name, style, occasions, colors, size })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[perfil]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

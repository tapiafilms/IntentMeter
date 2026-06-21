import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await req.json()
  revalidatePath('/productos')
  revalidatePath('/')
  if (slug && typeof slug === 'string') revalidatePath(`/producto/${slug}`)
  return NextResponse.json({ revalidated: true })
}

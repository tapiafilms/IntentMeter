import { NextRequest, NextResponse } from 'next/server'
import { getProductBySlug } from '@/lib/supabase/queries'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json(null, { status: 400 })

  const product = await getProductBySlug(slug)
  return NextResponse.json(product)
}
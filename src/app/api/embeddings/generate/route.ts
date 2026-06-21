// ============================================================
// app/api/embeddings/generate/route.ts
// Genera embedding para un producto usando Transformers.js
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function POST(req: NextRequest) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId, text } = await req.json()
    if (!productId || !text) {
      return NextResponse.json({ error: 'Missing productId or text' }, { status: 400 })
    }

    // Importación dinámica para evitar problemas en build
    const { pipeline } = await import('@xenova/transformers')

    // Cargar modelo (se cachea automáticamente tras la primera vez)
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // versión comprimida, más rápida
    })

    // Generar embedding
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    const embedding = Array.from(output.data as Float32Array)

    // Guardar en Supabase
    const { error } = await db
      .from('products')
      .update({ embedding })
      .eq('id', productId)
      .eq('tenant_id', TENANT_ID)

    if (error) throw error

    return NextResponse.json({ ok: true, dimensions: embedding.length })
  } catch (err: any) {
    console.error('[embeddings/generate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

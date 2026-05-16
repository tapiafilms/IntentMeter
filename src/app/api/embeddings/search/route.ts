// ============================================================
// app/api/embeddings/search/route.ts
// Búsqueda semántica de productos por significado
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 6 } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 })
    }

    const { pipeline } = await import('@xenova/transformers')
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    })

    const output = await extractor(query, { pooling: 'mean', normalize: true })
    const embedding = Array.from(output.data as Float32Array)

    const db = await createClient()
    const { data, error } = await db.rpc('match_products', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: limit,
    })

    if (error) throw error

    return NextResponse.json({ results: data || [] })
  } catch (err: any) {
    console.error('[embeddings/search]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

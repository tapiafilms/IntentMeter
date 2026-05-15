// ============================================================
// lib/supabase/queries.ts
// Funciones de query reutilizables — evita SQL repetido
// ============================================================
import { createClient, createStaticClient } from './server'
import type { Product, Session, Conversation, WeeklyReport } from './types'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

// ── Productos ─────────────────────────────────────────────────
export async function getProducts(category?: string): Promise<Product[]> {
  const db = await createClient()
  let q = db.from('products')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) throw error
  return data as Product[]
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = await createClient()
  const { data, error } = await db.from('products')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error) return null
  return data as Product
}

// Solo para generateStaticParams en build time (sin cookies)
export async function getProductsSlugs(): Promise<{ slug: string }[]> {
  const db = createStaticClient()
  const { data } = await db.from('products')
    .select('slug')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
  return (data || []) as { slug: string }[]
}

// ── Sesiones ──────────────────────────────────────────────────
export async function getOrCreateSession(visitorId: string): Promise<Session> {
  const db = await createClient()

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: existing } = await db.from('sessions')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('visitor_id', visitorId)
    .is('ended_at', null)
    .gte('started_at', thirtyMinutesAgo)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing as Session

  const { data: created, error } = await db.from('sessions')
    .insert({ tenant_id: TENANT_ID, visitor_id: visitorId } as any)
    .select()
    .single()

  if (error) throw error
  return created as Session
}

// ── Conversaciones ────────────────────────────────────────────
export async function getRecentConversations(limit = 20): Promise<Conversation[]> {
  const db = await createClient()
  const { data, error } = await db.from('conversations')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Conversation[]
}

// ── Reporte semanal ───────────────────────────────────────────
export async function getLatestWeeklyReport(): Promise<WeeklyReport | null> {
  const db = await createClient()
  const { data, error } = await db.from('weekly_reports')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as WeeklyReport
}

// ── Analytics ─────────────────────────────────────────────────
export async function getTopObjections(days = 7) {
  const db = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db.from('conversations')
    .select('objections, product_id')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since)
    .neq('objections', '{}')

  if (error) throw error

  const counts: Record<string, number> = {}
  data?.forEach(row => {
    const rowData = row as any
    rowData.objections?.forEach((obj: string) => {
      counts[obj] = (counts[obj] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }))
}
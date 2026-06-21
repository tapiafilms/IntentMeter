// ============================================================
// app/admin/page.tsx
// Dashboard de administración — Tienda Inteligente
// ============================================================
import { createClient } from '@/lib/supabase/server'
import type { Session, SessionEvent, Conversation, WeeklyReport } from '@/lib/supabase/types'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

async function getDashboardData() {
  const db = await createClient()
  const since7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await db
    .from('sessions')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .gte('started_at', since7days)
    .order('started_at', { ascending: false })

  const { data: events } = await db
    .from('session_events')
    .select('type, payload, created_at, session_id')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since7days)

  const { data: conversations } = await db
    .from('conversations')
    .select('objections, messages, product_id, outcome, created_at')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since7days)

  const { data: recentConversations } = await db
    .from('conversations')
    .select('id, session_id, messages, objections, outcome, created_at')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since7days)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: scrollEvents } = await db
    .from('session_events')
    .select('payload, session_id')
    .eq('tenant_id', TENANT_ID)
    .eq('type', 'scroll_depth')
    .gte('created_at', since7days)

  const { data: idleEvents } = await db
    .from('session_events')
    .select('payload, session_id')
    .eq('tenant_id', TENANT_ID)
    .eq('type', 'idle_detected')
    .gte('created_at', since7days)

  const { data: weeklyReport } = await db
    .from('weekly_reports')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  return {
    sessions: sessions ?? [],
    events: events ?? [],
    conversations: conversations ?? [],
    recentConversations: recentConversations ?? [],
    scrollEvents: scrollEvents ?? [],
    idleEvents: idleEvents ?? [],
    weeklyReport: weeklyReport ?? null,
  }
}

export default async function AdminPage() {
  const data = await getDashboardData()
  const sessions = data.sessions as Session[]
  const events = data.events as SessionEvent[]
  const conversations = data.conversations as Conversation[]
  const recentConversations = data.recentConversations as any[]
  const scrollEvents = data.scrollEvents as any[]
  const idleEvents = data.idleEvents as any[]
  const weeklyReport = data.weeklyReport as WeeklyReport | null

  // ── KPIs base ─────────────────────────────────────────────
  const totalSessions = sessions.length
  const converted = sessions.filter(s => s.converted).length
  const conversionRate = totalSessions > 0 ? ((converted / totalSessions) * 100).toFixed(1) : '0'
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.intent_score ?? 0), 0) / totalSessions)
    : 0

  // ── Duración promedio de sesión ────────────────────────────
  const sessionsWithDuration = sessions.filter(s => s.ended_at && s.started_at)
  const avgDurationSeconds = sessionsWithDuration.length > 0
    ? Math.round(sessionsWithDuration.reduce((sum, s) => {
        const duration = (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 1000
        return sum + duration
      }, 0) / sessionsWithDuration.length)
    : 0
  const avgDurationLabel = avgDurationSeconds >= 60
    ? `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`
    : `${avgDurationSeconds}s`

  // ── Distribución de intención ──────────────────────────────
  const intentDist = sessions.reduce((acc: Record<string, number>, s) => {
    const type = s.intent_type ?? 'curious'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // ── Productos más vistos ───────────────────────────────────
  const productViews = events
    .filter(e => e.type === 'product_view')
    .reduce((acc: Record<string, number>, e) => {
      const slug = (e.payload as any)?.slug ?? 'unknown'
      acc[slug] = (acc[slug] || 0) + 1
      return acc
    }, {})
  const topProducts = Object.entries(productViews).sort(([, a], [, b]) => b - a).slice(0, 5)

  // ── Productos revisitados (interés alto) ──────────────────
  const productRevisits = events
    .filter(e => e.type === 'product_revisit')
    .reduce((acc: Record<string, number>, e) => {
      const slug = (e.payload as any)?.slug ?? 'unknown'
      acc[slug] = (acc[slug] || 0) + 1
      return acc
    }, {})
  const topRevisits = Object.entries(productRevisits).sort(([, a], [, b]) => b - a).slice(0, 5)

  // ── Eventos de carrito ─────────────────────────────────────
  const cartEvents = events.filter(e => e.type === 'add_to_cart').length
  const removeFromCartEvents = events.filter(e => e.type === 'remove_from_cart').length
  const cartViewEvents = events.filter(e => e.type === 'cart_view').length

  // Productos más añadidos al carrito
  const addToCartByProduct = events
    .filter(e => e.type === 'add_to_cart')
    .reduce((acc: Record<string, number>, e) => {
      const slug = (e.payload as any)?.slug ?? (e.payload as any)?.product_id ?? 'unknown'
      acc[slug] = (acc[slug] || 0) + 1
      return acc
    }, {})
  const topCartProducts = Object.entries(addToCartByProduct).sort(([, a], [, b]) => b - a).slice(0, 5)

  // ── Exit intents ───────────────────────────────────────────
  const exitEvents = events.filter(e => e.type === 'exit_intent').length
  const exitByProduct: Record<string, number> = {}
  events.filter(e => e.type === 'exit_intent').forEach(e => {
    const slug = (e.payload as any)?.slug ?? (e.payload as any)?.currentProduct ?? 'inicio'
    exitByProduct[slug] = (exitByProduct[slug] || 0) + 1
  })
  const topExits = Object.entries(exitByProduct).sort(([, a], [, b]) => b - a).slice(0, 5)

  // ── Búsquedas ──────────────────────────────────────────────
  const searchQueries = events
    .filter(e => e.type === 'search_query')
    .reduce((acc: Record<string, number>, e) => {
      const query = (e.payload as any)?.query ?? 'desconocido'
      acc[query] = (acc[query] || 0) + 1
      return acc
    }, {})
  const topSearches = Object.entries(searchQueries).sort(([, a], [, b]) => b - a).slice(0, 8)

  // ── Páginas consultadas (shipping/returns) ─────────────────
  const shippingViews = events.filter(e => e.type === 'shipping_view').length
  const returnsViews = events.filter(e => e.type === 'returns_view').length

  // ── Sofía ──────────────────────────────────────────────────
  const sofiaConversations = conversations.length
  const sofiaConverted = conversations.filter(c => (c as any).outcome === 'converted').length
  const sofiaConversionRate = sofiaConversations > 0
    ? ((sofiaConverted / sofiaConversations) * 100).toFixed(0)
    : '0'

  const objectionCounts: Record<string, number> = {}
  conversations.forEach(c => {
    const conv = c as any
    conv.objections?.forEach((obj: string) => {
      objectionCounts[obj] = (objectionCounts[obj] || 0) + 1
    })
  })
  const topObjections = Object.entries(objectionCounts).sort(([, a], [, b]) => b - a).slice(0, 6)

  // ── Scroll depth por producto ──────────────────────────────
  const scrollByProduct: Record<string, number[]> = {}
  scrollEvents.forEach(e => {
    const slug = (e.payload as any)?.slug ?? 'unknown'
    if (!scrollByProduct[slug]) scrollByProduct[slug] = []
    scrollByProduct[slug].push((e.payload as any)?.depth ?? 0)
  })
  const avgScrollByProduct = Object.entries(scrollByProduct)
    .map(([slug, depths]) => ({
      slug,
      avg: Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  // ── Idle por página ────────────────────────────────────────
  const idleByPage: Record<string, number> = {}
  idleEvents.forEach(e => {
    const url = (e.payload as any)?.url ?? 'unknown'
    idleByPage[url] = (idleByPage[url] || 0) + 1
  })
  const topIdlePages = Object.entries(idleByPage).sort(([, a], [, b]) => b - a).slice(0, 5)

  const recentSessions = sessions.slice(0, 8)

  const INTENT_COLORS: Record<string, string> = {
    curious: '#94a3b8', undecided: '#f59e0b', comparator: '#3b82f6',
    price_sensitive: '#8b5cf6', buyer: '#22c55e',
  }
  const INTENT_LABELS: Record<string, string> = {
    curious: 'Curioso', undecided: 'Indeciso', comparator: 'Comparando',
    price_sensitive: 'Sensible al precio', buyer: 'Listo para comprar',
  }

  // ── Funnel ─────────────────────────────────────────────────
  const totalProductViews = events.filter(e => e.type === 'product_view').length
  const funnelSteps = [
    { label: 'Sesiones', value: totalSessions, color: '#e2b96f' },
    { label: 'Vistas de producto', value: totalProductViews, color: '#3b82f6' },
    { label: 'Add to cart', value: cartEvents, color: '#8b5cf6' },
    { label: 'Conversiones', value: converted, color: '#22c55e' },
  ]
  const funnelMax = funnelSteps[0].value || 1

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1e', color: 'white', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2b96f' }}>Tienda Inteligente</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Dashboard de administración — últimos 7 días</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/configuracion" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
            ⚙ Configuración
          </a>
          <a href="/admin/productos" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ background: 'rgba(226,185,111,0.15)', border: '1px solid rgba(226,185,111,0.3)', color: '#e2b96f' }}>
            Gestionar productos
          </a>
          <a href="/" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
            ← Ver tienda
          </a>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Sesiones totales', value: totalSessions, sub: 'últimos 7 días', color: '#e2b96f' },
            { label: 'Conversiones', value: converted, sub: `${conversionRate}% tasa`, color: '#22c55e' },
            { label: 'Score promedio', value: `${avgScore}/100`, sub: 'intención media', color: '#3b82f6' },
            { label: 'Duración promedio', value: avgDurationLabel, sub: `${sessionsWithDuration.length} sesiones con datos`, color: '#f59e0b' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</p>
              <p className="text-3xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* KPIs secundarios */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Vistas de producto', value: totalProductViews, color: '#60a5fa' },
            { label: 'Add to cart', value: cartEvents, color: '#a78bfa' },
            { label: 'Remove from cart', value: removeFromCartEvents, color: '#f87171' },
            { label: 'Vistas del carrito', value: cartViewEvents, color: '#34d399' },
            { label: 'Exit intents', value: exitEvents, color: '#fb923c' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Funnel de conversión */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Funnel de conversión</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Dónde se cae la gente</p>
          <div className="flex items-end gap-3 justify-between">
            {funnelSteps.map((step, i) => {
              const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0
              const dropPct = i > 0 && funnelSteps[i - 1].value > 0
                ? (((funnelSteps[i - 1].value - step.value) / funnelSteps[i - 1].value) * 100).toFixed(0)
                : null
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                  {dropPct !== null && (
                    <p className="text-xs font-medium" style={{ color: '#f87171' }}>−{dropPct}%</p>
                  )}
                  <div className="w-full rounded-xl flex flex-col justify-end overflow-hidden" style={{ height: '120px', background: 'rgba(255,255,255,0.04)' }}>
                    <div
                      className="w-full rounded-xl transition-all"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: step.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: step.color }}>{step.value}</p>
                  <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>{step.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Intención + Productos más vistos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Distribución de intención</h2>
            {totalSessions === 0 ? <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p> : (
              <div className="space-y-3">
                {Object.entries(intentDist).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: INTENT_COLORS[type] ?? 'white' }}>{INTENT_LABELS[type] ?? type}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{count} sesiones</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / totalSessions) * 100}%`, background: INTENT_COLORS[type] ?? '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Productos más vistos</h2>
            {topProducts.length === 0 ? <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p> : (
              <div className="space-y-3">
                {topProducts.map(([slug, count], i) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{slug.replace(/-/g, ' ')}</p>
                    <span className="text-xs font-bold" style={{ color: '#e2b96f' }}>{count} vistas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Productos revisitados + Productos al carrito */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Productos revisitados</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Interés alto — volvieron a ver el mismo producto</p>
            {topRevisits.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topRevisits.map(([slug, count], i) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{slug.replace(/-/g, ' ')}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Más añadidos al carrito</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Productos que generan más intención de compra</p>
            {topCartProducts.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topCartProducts.map(([slug, count], i) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{slug.replace(/-/g, ' ')}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Búsquedas + Políticas consultadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Qué buscan los visitantes</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Términos de búsqueda más frecuentes</p>
            {topSearches.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin búsquedas registradas aún</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topSearches.map(([query, count]) => (
                  <span key={query} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                    {query}
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(96,165,250,0.2)', color: '#60a5fa' }}>{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Políticas consultadas</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Qué revisan antes de decidir</p>
            <div className="space-y-4">
              {[
                { label: 'Página de envíos', value: shippingViews, color: '#34d399', icon: '🚚' },
                { label: 'Cambios y devoluciones', value: returnsViews, color: '#f59e0b', icon: '↩' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</p>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.value / Math.max(shippingViews, returnsViews, 1)) * 100, 100)}%`, background: item.color }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
              {shippingViews === 0 && returnsViews === 0 && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
              )}
            </div>
          </div>
        </div>

        {/* Sofía en números */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl p-5 md:col-span-1" style={{ background: 'rgba(226,185,111,0.06)', border: '1px solid rgba(226,185,111,0.2)' }}>
            <p className="text-xs mb-1" style={{ color: 'rgba(226,185,111,0.6)' }}>✦ SOFÍA EN NÚMEROS</p>
            <p className="text-3xl font-bold mb-1" style={{ color: '#e2b96f' }}>{sofiaConversations}</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>conversaciones esta semana</p>
            <div className="h-px mb-4" style={{ background: 'rgba(226,185,111,0.15)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: '#22c55e' }}>{sofiaConverted}</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>conversiones asistidas por IA</p>
            <div className="h-px mb-4" style={{ background: 'rgba(226,185,111,0.15)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: '#3b82f6' }}>{sofiaConversionRate}%</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>tasa de conversión IA</p>
          </div>

          <div className="rounded-2xl p-6 md:col-span-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Lo que más preguntan</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Objeciones y dudas capturadas por Sofía</p>
            {topObjections.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún — las objeciones se registran al conversar con Sofía</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topObjections.map(([text, count]) => (
                  <span key={text} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                    style={{ background: 'rgba(226,185,111,0.1)', border: '1px solid rgba(226,185,111,0.2)', color: '#e2b96f' }}>
                    {text}
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(226,185,111,0.2)', color: '#e2b96f' }}>{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Abandonos + Reporte semanal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Productos con más abandonos</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Exit intent detectado por página</p>
            {topExits.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topExits.map(([slug, count], i) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{slug.replace(/-/g, ' ')}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                      {count} salidas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Resumen semanal de Sofía</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Generado automáticamente por IA</p>
            {!weeklyReport ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin reporte semanal aún — se genera automáticamente cada lunes</p>
            ) : (
              <div className="space-y-3">
                {weeklyReport.summary_text && (
                  <p className="text-xs leading-relaxed p-3 rounded-xl" style={{ background: 'rgba(226,185,111,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(226,185,111,0.1)' }}>
                    {weeklyReport.summary_text}
                  </p>
                )}
                {weeklyReport.insights?.slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span>{insight.type === 'success' ? '✓' : insight.type === 'warning' ? '⚠' : '→'}</span>
                    <span style={{ color: insight.type === 'success' ? '#22c55e' : insight.type === 'warning' ? '#f59e0b' : '#3b82f6' }}>
                      {insight.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scroll depth + Idle pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Engagement por producto</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Scroll depth promedio — cuánto leen la página</p>
            {avgScrollByProduct.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {avgScrollByProduct.map(({ slug, avg }) => (
                  <div key={slug}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{slug.replace(/-/g, ' ')}</span>
                      <span style={{ color: avg >= 75 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#f87171' }}>{avg}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${avg}%`, background: avg >= 75 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#f87171' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Páginas donde se detienen</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Idle detection — visitantes que se quedan sin interactuar</p>
            {topIdlePages.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topIdlePages.map(([url, count], i) => (
                  <div key={url} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{url}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transcripts de conversaciones */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Conversaciones recientes con Sofía</h2>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Últimas {recentConversations.length} conversaciones — haz clic para ver el transcript</p>
          {recentConversations.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin conversaciones aún</p>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conv: any) => (
                <details key={conv.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                      background: conv.outcome === 'converted' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                      color: conv.outcome === 'converted' ? '#22c55e' : 'rgba(255,255,255,0.4)'
                    }}>
                      {conv.outcome === 'converted' ? '✓ Convertida' : conv.outcome === 'abandoned' ? 'Abandonada' : 'En curso'}
                    </span>
                    <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {conv.messages?.length ?? 0} mensajes
                      {conv.objections?.length > 0 && ` · dudas: ${conv.objections.join(', ')}`}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(conv.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </summary>
                  <div className="px-4 py-3 space-y-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {conv.messages?.map((msg: any, i: number) => (
                      <div key={i} className={`flex gap-2 text-xs ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xs px-3 py-2 rounded-xl" style={{
                          background: msg.role === 'user' ? 'rgba(226,185,111,0.15)' : 'rgba(255,255,255,0.06)',
                          color: msg.role === 'user' ? '#e2b96f' : 'rgba(255,255,255,0.7)',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Sesiones recientes */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Sesiones recientes</h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin sesiones aún — navega la tienda para generar datos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {['Visitor ID', 'Intención', 'Score', 'Duración', 'Convertido', 'Inicio'].map(h => (
                      <th key={h} className="text-left pb-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(s => {
                    const duration = s.ended_at
                      ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
                      : null
                    const durationLabel = duration !== null
                      ? duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`
                      : '—'
                    return (
                      <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="py-3 font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.visitor_id?.slice(0, 8)}...</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${INTENT_COLORS[s.intent_type] ?? '#94a3b8'}22`, color: INTENT_COLORS[s.intent_type] ?? '#94a3b8' }}>
                            {INTENT_LABELS[s.intent_type] ?? s.intent_type}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full" style={{ width: `${s.intent_score ?? 0}%`, background: INTENT_COLORS[s.intent_type] ?? '#94a3b8' }} />
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.intent_score ?? 0}</span>
                          </div>
                        </td>
                        <td className="py-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{durationLabel}</td>
                        <td className="py-3" style={{ color: s.converted ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{s.converted ? '✓ Sí' : '— No'}</td>
                        <td className="py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(s.started_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
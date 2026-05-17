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
    weeklyReport: weeklyReport ?? null,
  }
}

export default async function AdminPage() {
  const data = await getDashboardData()
  const sessions = data.sessions as Session[]
  const events = data.events as SessionEvent[]
  const conversations = data.conversations as Conversation[]
  const weeklyReport = data.weeklyReport as WeeklyReport | null

  const totalSessions = sessions.length
  const converted = sessions.filter(s => s.converted).length
  const conversionRate = totalSessions > 0 ? ((converted / totalSessions) * 100).toFixed(1) : '0'
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.intent_score ?? 0), 0) / totalSessions)
    : 0

  const intentDist = sessions.reduce((acc: Record<string, number>, s) => {
    const type = s.intent_type ?? 'curious'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const productViews = events
    .filter(e => e.type === 'product_view')
    .reduce((acc: Record<string, number>, e) => {
      const slug = (e.payload as any)?.slug ?? 'unknown'
      acc[slug] = (acc[slug] || 0) + 1
      return acc
    }, {})
  const topProducts = Object.entries(productViews).sort(([, a], [, b]) => b - a).slice(0, 5)

  const cartEvents = events.filter(e => e.type === 'add_to_cart').length
  const exitEvents = events.filter(e => e.type === 'exit_intent').length
  const recentSessions = sessions.slice(0, 8)

  // Objections / preguntas frecuentes a Sofía
  const objectionCounts: Record<string, number> = {}
  conversations.forEach(c => {
    const conv = c as any
    conv.objections?.forEach((obj: string) => {
      objectionCounts[obj] = (objectionCounts[obj] || 0) + 1
    })
  })
  const topObjections = Object.entries(objectionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  // Productos con más exit intent
  const exitByProduct: Record<string, number> = {}
  events.filter(e => e.type === 'exit_intent').forEach(e => {
    const slug = (e.payload as any)?.slug ?? (e.payload as any)?.currentProduct ?? 'inicio'
    exitByProduct[slug] = (exitByProduct[slug] || 0) + 1
  })
  const topExits = Object.entries(exitByProduct)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Productos más comparados (desde session_events tipo compare si existe, o desde conversations)
  const compareCounts: Record<string, number> = {}
  conversations.forEach(c => {
    const conv = c as any
    // Buscar mensajes donde la IA mostró compare_products
    conv.messages?.forEach((m: any) => {
      if (m.role === 'assistant' && m.content?.includes('compare')) {
        // fallback: contar por product_id
      }
    })
    if (conv.product_id) {
      compareCounts[conv.product_id] = (compareCounts[conv.product_id] || 0) + 1
    }
  })
  events.filter(e => e.type === 'product_view').forEach(e => {
    const slug = (e.payload as any)?.slug
    if (slug) compareCounts[slug] = (compareCounts[slug] || 0) + 1
  })

  // Tasa de conversión asistida por Sofía
  const sofiaConversations = conversations.length
  const sofiaConverted = conversations.filter(c => (c as any).outcome === 'converted').length

  const INTENT_COLORS: Record<string, string> = {
    curious: '#94a3b8', undecided: '#f59e0b', comparator: '#3b82f6',
    price_sensitive: '#8b5cf6', buyer: '#22c55e',
  }
  const INTENT_LABELS: Record<string, string> = {
    curious: 'Curioso', undecided: 'Indeciso', comparator: 'Comparando',
    price_sensitive: 'Sensible al precio', buyer: 'Listo para comprar',
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1e', color: 'white', fontFamily: 'var(--font-body)' }}>
      <div className="border-b px-8 py-5 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2b96f' }}>Tienda Inteligente</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Dashboard de administración — últimos 7 días</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/productos" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ background: 'rgba(226,185,111,0.15)', border: '1px solid rgba(226,185,111,0.3)', color: '#e2b96f' }}>
            ⚙ Gestionar productos
          </a>
          <a href="/" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
            ← Ver tienda
          </a>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Sesiones totales', value: totalSessions, sub: 'últimos 7 días', color: '#e2b96f' },
            { label: 'Conversiones', value: converted, sub: `${conversionRate}% tasa`, color: '#22c55e' },
            { label: 'Score promedio', value: `${avgScore}/100`, sub: 'intención media', color: '#3b82f6' },
            { label: 'Add to cart', value: cartEvents, sub: `${exitEvents} exit intents`, color: '#8b5cf6' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</p>
              <p className="text-3xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

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

        {/* Sofía en números */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl p-5 md:col-span-1" style={{ background: 'rgba(226,185,111,0.06)', border: '1px solid rgba(226,185,111,0.2)' }}>
            <p className="text-xs mb-1" style={{ color: 'rgba(226,185,111,0.6)' }}>✦ SOFÍA EN NÚMEROS</p>
            <p className="text-3xl font-bold mb-1" style={{ color: '#e2b96f' }}>{sofiaConversations}</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>conversaciones esta semana</p>
            <div className="h-px mb-4" style={{ background: 'rgba(226,185,111,0.15)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: '#22c55e' }}>{sofiaConverted}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>conversiones asistidas por IA</p>
          </div>

          {/* Preguntas / objeciones frecuentes */}
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

        {/* Productos: vistos vs abandonados */}
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

          {/* Reporte semanal IA */}
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

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Sesiones recientes</h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin sesiones aún — navega la tienda para generar datos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {['Visitor ID', 'Intención', 'Score', 'Convertido', 'Inicio'].map(h => (
                      <th key={h} className="text-left pb-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(s => (
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
                      <td className="py-3" style={{ color: s.converted ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{s.converted ? '✓ Sí' : '— No'}</td>
                      <td className="py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(s.started_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
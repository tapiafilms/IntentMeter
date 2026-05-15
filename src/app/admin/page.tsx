// ============================================================
// app/admin/page.tsx
// Dashboard de administración — Tienda Inteligente
// ============================================================
import { createServiceClient } from '@/lib/supabase/server'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

async function getDashboardData() {
  const db = createServiceClient()
  const since7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Sesiones
  const { data: sessions } = await db
    .from('sessions')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .gte('started_at', since7days)
    .order('started_at', { ascending: false })

  // Eventos
  const { data: events } = await db
    .from('session_events')
    .select('type, payload, created_at, session_id')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since7days)

  return {
    sessions: sessions ?? [],
    events: events ?? [],
  }
}

export default async function AdminPage() {
  const { sessions, events } = await getDashboardData()

  // Métricas
  const totalSessions = sessions.length
  const converted = sessions.filter(s => s.converted).length
  const conversionRate = totalSessions > 0 ? ((converted / totalSessions) * 100).toFixed(1) : '0'
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.intent_score ?? 0), 0) / totalSessions)
    : 0

  // Distribución de intent types
  const intentDist = sessions.reduce((acc: Record<string, number>, s) => {
    const type = s.intent_type ?? 'curious'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Top productos vistos
  const productViews = events
    .filter(e => e.type === 'product_view')
    .reduce((acc: Record<string, number>, e) => {
      const slug = (e.payload as any)?.slug ?? 'unknown'
      acc[slug] = (acc[slug] || 0) + 1
      return acc
    }, {})
  const topProducts = Object.entries(productViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Add to cart
  const cartEvents = events.filter(e => e.type === 'add_to_cart').length
  const exitEvents = events.filter(e => e.type === 'exit_intent').length

  // Sesiones recientes
  const recentSessions = sessions.slice(0, 8)

  const INTENT_COLORS: Record<string, string> = {
    curious: '#94a3b8',
    undecided: '#f59e0b',
    comparator: '#3b82f6',
    price_sensitive: '#8b5cf6',
    buyer: '#22c55e',
  }

  const INTENT_LABELS: Record<string, string> = {
    curious: 'Curioso',
    undecided: 'Indeciso',
    comparator: 'Comparando',
    price_sensitive: 'Sensible al precio',
    buyer: 'Listo para comprar',
  }

  function formatPrice(n: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1e', color: 'white', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2b96f' }}>Tienda Inteligente</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Dashboard de administración — últimos 7 días</p>
        </div>
        <a href="/" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
          ← Ver tienda
        </a>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* KPIs */}
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

          {/* Distribución de intención */}
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Distribución de intención</h2>
            {totalSessions === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(intentDist).sort(([,a],[,b]) => b-a).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: INTENT_COLORS[type] ?? 'white' }}>{INTENT_LABELS[type] ?? type}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{count} sesiones</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / totalSessions) * 100}%`,
                          background: INTENT_COLORS[type] ?? '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top productos */}
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Productos más vistos</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map(([slug, count], i) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {slug.replace(/-/g, ' ')}
                      </p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#e2b96f' }}>{count} vistas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                    <th className="text-left pb-3 font-medium">Visitor ID</th>
                    <th className="text-left pb-3 font-medium">Intención</th>
                    <th className="text-left pb-3 font-medium">Score</th>
                    <th className="text-left pb-3 font-medium">Convertido</th>
                    <th className="text-left pb-3 font-medium">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="py-3 font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {s.visitor_id?.slice(0, 8)}...
                      </td>
                      <td className="py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: `${INTENT_COLORS[s.intent_type] ?? '#94a3b8'}22`,
                            color: INTENT_COLORS[s.intent_type] ?? '#94a3b8',
                          }}
                        >
                          {INTENT_LABELS[s.intent_type] ?? s.intent_type}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${s.intent_score ?? 0}%`,
                                background: INTENT_COLORS[s.intent_type] ?? '#94a3b8',
                              }}
                            />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.intent_score ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span style={{ color: s.converted ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                          {s.converted ? '✓ Sí' : '— No'}
                        </span>
                      </td>
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
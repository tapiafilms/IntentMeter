'use client'

import { useState, useEffect, useRef } from 'react'
import type { IntentType, SessionEventType } from '@/lib/supabase/types'

interface LiveEvent {
  id: string
  type: SessionEventType
  label: string
  emoji: string
  timestamp: Date
  delta?: number
}

interface IntentState {
  score: number
  type: IntentType
}

const EVENT_LABELS: Partial<Record<SessionEventType, { label: string; emoji: string }>> = {
  page_view:       { label: 'Visitó una página', emoji: '📄' },
  product_view:    { label: 'Vio un producto', emoji: '👁' },
  product_revisit: { label: 'Volvió a ver un producto', emoji: '🔄' },
  scroll_depth:    { label: 'Scroll en página', emoji: '📜' },
  add_to_cart:     { label: 'Agregó al carrito', emoji: '🛒' },
  remove_from_cart:{ label: 'Quitó del carrito', emoji: '❌' },
  cart_view:       { label: 'Vio el carrito', emoji: '🛍️' },
  checkout_start:  { label: 'Inició checkout', emoji: '💳' },
  exit_intent:     { label: 'Intentó salir', emoji: '🚪' },
  idle_detected:   { label: 'Usuario inactivo', emoji: '💤' },
  search_query:    { label: 'Buscó un producto', emoji: '🔍' },
}

const INTENT_COLORS: Record<IntentType, string> = {
  curious:       '#94a3b8',
  undecided:     '#f59e0b',
  comparator:    '#3b82f6',
  price_sensitive: '#8b5cf6',
  buyer:         '#22c55e',
}

const INTENT_LABELS: Record<IntentType, string> = {
  curious:        'Curioso',
  undecided:      'Indeciso',
  comparator:     'Comparando',
  price_sensitive:'Sensible al precio',
  buyer:          'Listo para comprar',
}

export default function DemoPanel() {
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [intent, setIntent] = useState<IntentState>({ score: 0, type: 'curious' })
  const [lastDelta, setLastDelta] = useState<number>(0)
  const [trigger, setTrigger] = useState<string | null>(null)
  const [prevScore, setPrevScore] = useState(0)
  const eventsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { type, payload, score, intentType } = e.detail

      const delta = score - prevScore
      setPrevScore(score)
      setLastDelta(delta)
      setIntent({ score, type: intentType })

      const meta = EVENT_LABELS[type as SessionEventType]
      if (meta) {
        const newEvent: LiveEvent = {
          id: crypto.randomUUID(),
          type: type as SessionEventType,
          label: type === 'scroll_depth'
            ? `Scroll ${payload?.depth ?? ''}%`
            : meta.label,
          emoji: meta.emoji,
          timestamp: new Date(),
          delta,
        }
        setEvents(prev => [newEvent, ...prev].slice(0, 20))
      }

      // Detectar trigger de Sofía
      if (type === 'exit_intent') setTrigger('🚪 Exit intent — Sofía activada')
      else if (type === 'product_revisit') setTrigger('🔄 Revisita — Sofía activada')
      else if (type === 'idle_detected' && score >= 3) setTrigger('💤 Idle detectado — Sofía activada')
      else if (type === 'cart_view' && score >= 5) setTrigger('🛒 Carrito visto — Sofía activada')
      else if (type === 'product_view' && score >= 20) setTrigger('🎯 Alta intención — Sofía activada')
      else setTrigger(null)
    }

    window.addEventListener('ti:track' as any, handler as any)
    return () => window.removeEventListener('ti:track' as any, handler as any)
  }, [prevScore])

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  if (!isVisible) return (
    <button
      onClick={() => setIsVisible(true)}
      className="fixed bottom-6 left-6 z-50 px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
      style={{ background: '#1a1a2e', color: '#e2b96f', border: '1px solid #e2b96f33' }}
    >
      🧠 Ver panel IA
    </button>
  )

  return (
    <div
      className="fixed bottom-6 left-6 z-50 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: 300,
        background: 'rgba(15, 15, 30, 0.95)',
        border: '1px solid rgba(226, 185, 111, 0.2)',
        backdropFilter: 'blur(12px)',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(226,185,111,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#22c55e' }}
          />
          <span className="text-xs font-semibold tracking-wider" style={{ color: '#e2b96f' }}>
            MOTOR IA — EN VIVO
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/40 hover:text-white/80 transition-colors text-xs"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/40 hover:text-white/80 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Intent score */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">Intención del visitante</span>
              <div className="flex items-center gap-1">
                {lastDelta !== 0 && (
                  <span
                    className="text-xs font-bold"
                    style={{ color: lastDelta > 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {lastDelta > 0 ? `+${lastDelta}` : lastDelta}
                  </span>
                )}
                <span className="text-sm font-bold" style={{ color: '#e2b96f' }}>
                  {intent.score}/100
                </span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div
              className="w-full h-2 rounded-full overflow-hidden mb-2"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${intent.score}%`,
                  background: INTENT_COLORS[intent.type],
                }}
              />
            </div>

            {/* Tipo */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: INTENT_COLORS[intent.type] }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: INTENT_COLORS[intent.type] }}
              >
                {INTENT_LABELS[intent.type]}
              </span>
            </div>
          </div>

          {/* Trigger activo */}
          {trigger && (
            <div
              className="px-4 py-2 text-xs font-medium"
              style={{
                background: 'rgba(226,185,111,0.1)',
                borderBottom: '1px solid rgba(226,185,111,0.15)',
                color: '#e2b96f',
              }}
            >
              {trigger}
            </div>
          )}

          {/* Feed de eventos */}
          <div className="px-4 py-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
            <p className="text-xs text-white/30 mb-2 tracking-wider">EVENTOS RECIENTES</p>
            {events.length === 0 ? (
              <p className="text-xs text-white/20 italic">Esperando actividad...</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map(ev => (
                  <li key={ev.id} className="flex items-center gap-2">
                    <span className="text-sm">{ev.emoji}</span>
                    <span className="text-xs text-white/70 flex-1">{ev.label}</span>
                    {ev.delta !== undefined && ev.delta !== 0 && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: ev.delta > 0 ? '#22c55e' : '#ef4444' }}
                      >
                        {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div ref={eventsEndRef} />
          </div>
        </>
      )}
    </div>
  )
}
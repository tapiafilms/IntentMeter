'use client'

import { useEffect, useState } from 'react'

const PHRASES = [
  'aprende de ti con cada visita.',
  'personaliza tu experiencia en tiempo real.',
  'recuerda lo que te gusta.',
  'se vuelve más tuya cada vez.',
]

export default function AIBanner({ customerName }: { customerName?: string | null }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % PHRASES.length)
        setVisible(true)
      }, 400)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style>{`
        .ai-banner-phrase {
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .ai-banner-phrase-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ai-banner-phrase-hidden {
          opacity: 0;
          transform: translateY(6px);
        }
        @keyframes ai-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        .ai-dot {
          animation: ai-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className="w-full py-5 px-6"
        style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0d0d1a 100%)', borderBottom: '1px solid rgba(159,40,248,0.15)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Izquierda — badge + texto */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(159,40,248,0.15)', border: '1px solid rgba(159,40,248,0.35)' }}
            >
              <span className="ai-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#9f28f8' }} />
              <span className="text-xs font-semibold tracking-widest" style={{ color: '#9f28f8', letterSpacing: '0.12em' }}>
                IA ACTIVA
              </span>
            </div>

            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {customerName
                ? <><span className="text-white font-medium">{customerName}</span>, esta tienda </>
                : 'Esta tienda '}
              <span
                className={`ai-banner-phrase font-medium text-white inline-block ${visible ? 'ai-banner-phrase-visible' : 'ai-banner-phrase-hidden'}`}
              >
                {PHRASES[index]}
              </span>
            </p>
          </div>

          {/* Derecha — propuesta */}
          <p className="text-xs hidden md:block" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Potenciado por Inteligencia Artificial · Experiencia personalizada
          </p>
        </div>
      </div>
    </>
  )
}

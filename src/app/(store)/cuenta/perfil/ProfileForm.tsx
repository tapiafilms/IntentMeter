'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CustomerProfile, CustomerStyle, CustomerOccasion, CustomerColor, CustomerSize } from '@/lib/supabase/types'

const STYLES: { value: CustomerStyle; label: string; emoji: string }[] = [
  { value: 'casual',    label: 'Casual',    emoji: '👖' },
  { value: 'elegante',  label: 'Elegante',  emoji: '✨' },
  { value: 'bohemio',   label: 'Bohemio',   emoji: '🌸' },
  { value: 'deportivo', label: 'Deportivo', emoji: '🏃‍♀️' },
]

const OCCASIONS: { value: CustomerOccasion; label: string }[] = [
  { value: 'dia_a_dia', label: 'Día a día' },
  { value: 'trabajo',   label: 'Trabajo' },
  { value: 'salidas',   label: 'Salidas nocturnas' },
  { value: 'eventos',   label: 'Eventos especiales' },
]

const COLORS: { value: CustomerColor; label: string; swatch: string }[] = [
  { value: 'neutros',  label: 'Neutros',      swatch: '#d4c5b0' },
  { value: 'vivos',    label: 'Colores vivos', swatch: '#e85d4a' },
  { value: 'pasteles', label: 'Pasteles',      swatch: '#f4b8c8' },
  { value: 'oscuros',  label: 'Tonos oscuros', swatch: '#2d1b69' },
]

const SIZES: CustomerSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface Props {
  initialProfile: CustomerProfile | null
  userId: string
}

export default function ProfileForm({ initialProfile, userId }: Props) {
  const router = useRouter()
  const [name, setName]         = useState(initialProfile?.name ?? '')
  const [style, setStyle]       = useState<CustomerStyle | null>(initialProfile?.style ?? null)
  const [occasions, setOccasions] = useState<CustomerOccasion[]>(initialProfile?.occasions ?? [])
  const [colors, setColors]     = useState<CustomerColor[]>(initialProfile?.colors ?? [])
  const [size, setSize]         = useState<CustomerSize | null>(initialProfile?.size ?? null)
  const [loading, setLoading]   = useState(false)
  const [saved, setSaved]       = useState(false)

  function toggleOccasion(val: CustomerOccasion) {
    setOccasions(prev =>
      prev.includes(val) ? prev.filter(o => o !== val) : [...prev, val]
    )
  }

  function toggleColor(val: CustomerColor) {
    setColors(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  async function handleSave() {
    setLoading(true)
    await fetch('/api/cuenta/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, style, occasions, colors, size }),
    })
    setSaved(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 800)
  }

  const chipBase = {
    padding: '8px 16px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    transition: 'all 150ms',
  }

  const chipActive = {
    ...chipBase,
    background: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: '#fff',
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          ¿Cómo te llamamos?
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Estilo */}
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          ¿Qué estilo te define?
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              style={style === s.value ? chipActive : chipBase}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ocasiones */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          ¿Para qué ocasiones compras más?
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Puedes elegir varias
        </p>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map(o => (
            <button
              key={o.value}
              onClick={() => toggleOccasion(o.value)}
              style={occasions.includes(o.value) ? chipActive : chipBase}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colores */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          ¿Qué colores usas más?
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Puedes elegir varios
        </p>
        <div className="flex flex-wrap gap-3">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => toggleColor(c.value)}
              className="flex items-center gap-2"
              style={colors.includes(c.value) ? chipActive : chipBase}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: c.swatch,
                  display: 'inline-block',
                  border: '1px solid rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Talla */}
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          ¿Cuál es tu talla habitual?
        </label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={size === s ? chipActive : chipBase}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !name.trim()}
        className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        {saved ? '¡Guardado! Redirigiendo...' : loading ? 'Guardando...' : 'Guardar preferencias'}
      </button>
    </div>
  )
}

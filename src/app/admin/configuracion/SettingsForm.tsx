'use client'

import { useState } from 'react'
import type { TenantStoreConfig } from '@/lib/supabase/types'

const FIELDS: { key: keyof TenantStoreConfig; label: string; placeholder: string; type?: string }[] = [
  { key: 'name',          label: 'Nombre de la tienda',  placeholder: 'Mi Tienda' },
  { key: 'tagline',       label: 'Slogan',               placeholder: 'Moda para el día a día' },
  { key: 'email',         label: 'Email de contacto',    placeholder: 'hola@mitienda.cl', type: 'email' },
  { key: 'phone',         label: 'Teléfono',             placeholder: '+56 9 1234 5678' },
  { key: 'instagram',     label: 'Instagram (URL)',       placeholder: 'https://instagram.com/mitienda' },
  { key: 'whatsapp',      label: 'WhatsApp (número)',    placeholder: '+56912345678' },
]

export default function SettingsForm({ initial }: { initial: TenantStoreConfig }) {
  const [form, setForm] = useState<TenantStoreConfig>(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function save() {
    setStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      setStatus('ok')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  function set(key: keyof TenantStoreConfig, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: 14,
    outline: 'none',
  } as const

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.05em',
  } as const

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="space-y-5">
        {FIELDS.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label style={labelStyle}>{label.toUpperCase()}</label>
            <input
              type={type ?? 'text'}
              value={form[key] as string}
              onChange={e => set(key, e.target.value)}
              placeholder={placeholder}
              style={inputStyle}
            />
          </div>
        ))}

        {/* Colores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>COLOR PRINCIPAL</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'none', cursor: 'pointer', padding: 2 }}
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                style={{ ...inputStyle, width: 'auto', flex: 1, fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>COLOR ACENTO</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'none', cursor: 'pointer', padding: 2 }}
              />
              <input
                type="text"
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                style={{ ...inputStyle, width: 'auto', flex: 1, fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Preview de colores */}
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: form.primary_color, border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="font-bold text-sm" style={{ color: form.accent_color }}>✦</span>
          <span className="font-semibold text-sm" style={{ color: 'white' }}>{form.name || 'Nombre de la tienda'}</span>
          <span className="text-xs ml-auto px-3 py-1.5 rounded-full font-medium" style={{ background: form.accent_color, color: form.primary_color }}>
            Ver colección →
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="px-6 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#e2b96f', color: '#1a1a2e' }}
        >
          {status === 'saving' ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {status === 'ok' && (
          <span className="text-sm" style={{ color: '#22c55e' }}>✓ Guardado — recarga la tienda para ver los cambios</span>
        )}
        {status === 'error' && (
          <span className="text-sm" style={{ color: '#f87171' }}>{errorMsg}</span>
        )}
      </div>
    </div>
  )
}

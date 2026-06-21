'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenantStoreConfig } from '@/lib/supabase/types'

const FIELDS: { key: keyof TenantStoreConfig; label: string; placeholder: string; type?: string }[] = [
  { key: 'name',      label: 'Nombre de la tienda', placeholder: 'Mi Tienda' },
  { key: 'tagline',   label: 'Slogan',              placeholder: 'Moda para el día a día' },
  { key: 'email',     label: 'Email de contacto',   placeholder: 'hola@mitienda.cl', type: 'email' },
  { key: 'phone',     label: 'Teléfono',            placeholder: '+56 9 1234 5678' },
  { key: 'instagram', label: 'Instagram (URL)',      placeholder: 'https://instagram.com/mitienda' },
  { key: 'whatsapp',  label: 'WhatsApp (número)',   placeholder: '+56912345678' },
]

export default function SettingsForm({ initial }: { initial: TenantStoreConfig }) {
  const [form, setForm] = useState<TenantStoreConfig>(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadLogo(file: File) {
    setUploading(true)
    try {
      const db = createClient()
      const ext = file.name.split('.').pop()
      const path = `logos/logo-${Date.now()}.${ext}`

      const { error: uploadError } = await db.storage
        .from('productos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = db.storage.from('productos').getPublicUrl(path)
      setForm(f => ({ ...f, logo_url: data.publicUrl }))
    } catch (err: any) {
      setErrorMsg(`Error al subir logo: ${err.message}`)
      setStatus('error')
    } finally {
      setUploading(false)
    }
  }

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

        {/* Logo */}
        <div>
          <label style={labelStyle}>LOGO</label>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0"
              style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>✦</span>
              }
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
              >
                {uploading ? 'Subiendo...' : 'Subir logo'}
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => set('logo_url', '')}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                >
                  Quitar logo
                </button>
              )}
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>PNG o SVG recomendado. Máx 2 MB.</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) uploadLogo(file)
              e.target.value = ''
            }}
          />
        </div>

        {/* Campos de texto */}
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
          {([
            { key: 'primary_color', label: 'COLOR PRINCIPAL' },
            { key: 'accent_color',  label: 'COLOR ACENTO' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'none', cursor: 'pointer', padding: 2 }}
                />
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  style={{ ...inputStyle, width: 'auto', flex: 1, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: form.primary_color, border: '1px solid rgba(255,255,255,0.1)' }}>
          {form.logo_url
            ? <img src={form.logo_url} alt="Logo" style={{ height: 32, objectFit: 'contain', maxWidth: 120 }} />
            : <span className="font-bold text-lg" style={{ color: 'white', fontFamily: 'Georgia, serif' }}>{form.name || 'Mi Tienda'}<span style={{ color: form.accent_color }}>.</span></span>
          }
          <span className="text-xs ml-auto px-3 py-1.5 rounded-full font-medium" style={{ background: form.accent_color, color: form.primary_color }}>
            Ver colección →
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={save}
          disabled={status === 'saving' || uploading}
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

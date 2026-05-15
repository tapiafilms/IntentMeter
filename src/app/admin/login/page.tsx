'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }
    router.push('/admin/productos')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0e0e0e', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div style={{
        width: '100%', maxWidth: 380, background: '#161616',
        border: '1px solid #2a2a2a', borderRadius: 12, padding: '32px 28px'
      }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: '#f0ede8', letterSpacing: '-0.02em' }}>
            Tienda.
          </h1>
          <p style={{ fontSize: 12, color: '#555', marginTop: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Panel admin
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="admin@tienda.cl"
              style={{
                background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#f0ede8',
                borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#f0ede8',
                borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#e05a5a', background: '#2a1515', padding: '8px 12px', borderRadius: 6 }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              marginTop: 4, background: '#c9b99a', color: '#1a1410', border: 'none',
              borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit'
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </div>
      </div>
    </div>
  )
}

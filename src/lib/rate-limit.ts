import { NextRequest, NextResponse } from 'next/server'

interface Entry { count: number; reset: number }
const store = new Map<string, Entry>()

export function rateLimit(req: NextRequest, max: number, windowMs: number): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.reset) {
    store.set(ip, { count: 1, reset: now + windowMs })
    return null
  }

  if (entry.count >= max) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.reset - now) / 1000)) } }
    )
  }

  entry.count++
  return null
}

export function requireApiSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET
  if (!secret) return null // no configurado → permite pasar (dev)
  const provided = req.headers.get('x-api-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

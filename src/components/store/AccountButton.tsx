'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  customerName: string | null
}

export default function AccountButton({ customerName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!customerName) {
    return (
      <Link
        href="/cuenta/login"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
      >
        Mi cuenta
      </Link>
    )
  }

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
      >
        <span style={{ color: 'var(--color-accent)' }}>●</span>
        {customerName}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minWidth: 140, zIndex: 100 }}
        >
          <Link
            href="/cuenta/perfil"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:opacity-70"
            style={{ color: 'var(--color-text)' }}
          >
            Mi estilo
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2.5 text-sm hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

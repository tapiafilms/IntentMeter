import { createClient } from '@/lib/supabase/server'
import { getTenant, getStoreConfig } from '@/lib/supabase/queries'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function ConfiguracionPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/admin/login')

  const tenant = await getTenant()
  const storeConfig = getStoreConfig(tenant)

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1e', color: 'white', fontFamily: 'var(--font-body)' }}>
      <div className="border-b px-8 py-5 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2b96f' }}>Configuración de la tienda</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Nombre, colores, datos de contacto</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
            ← Dashboard
          </a>
          <a href="/" className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
            Ver tienda
          </a>
        </div>
      </div>

      <div className="px-8 py-10 max-w-3xl">
        <SettingsForm initial={storeConfig} />
      </div>
    </div>
  )
}

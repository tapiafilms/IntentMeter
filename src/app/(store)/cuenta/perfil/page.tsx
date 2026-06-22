import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCustomerProfile } from '@/lib/supabase/queries'
import ProfileForm from './ProfileForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/cuenta/login')

  const profile = await getCustomerProfile(user.id)

  return (
    <main className="min-h-screen px-4 py-16" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Tu estilo
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--color-text-secondary)' }}>
          Cuéntanos tus preferencias para mostrarte lo que más te va a gustar.
        </p>
        <ProfileForm initialProfile={profile} userId={user.id} />
      </div>
    </main>
  )
}

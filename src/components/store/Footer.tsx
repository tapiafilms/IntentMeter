import Link from 'next/link'
import { getTenant, getStoreConfig } from '@/lib/supabase/queries'

export default async function Footer() {
  const tenant = await getTenant()
  const store = getStoreConfig(tenant)

  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="font-display text-xl font-bold tracking-tight block mb-3">
            {store.name}<span style={{ color: 'var(--color-accent)' }}>.</span>
          </Link>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {store.tagline}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest mb-4"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
            TIENDA
          </p>
          <ul className="space-y-2">
            {['Productos', 'Novedades', 'Ofertas'].map(item => (
              <li key={item}>
                <Link
                  href="/productos"
                  className="text-sm transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest mb-4"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
            AYUDA
          </p>
          <ul className="space-y-2">
            {['Envíos', 'Cambios y devoluciones', 'Contacto'].map(item => (
              <li key={item}>
                <a
                  href="#"
                  className="text-sm transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest mb-4"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
            CONTACTO
          </p>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {store.email && <li><a href={`mailto:${store.email}`} className="hover:opacity-70 transition-opacity">{store.email}</a></li>}
            {store.instagram && <li><a href={store.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">Instagram</a></li>}
            {store.whatsapp && <li><a href={`https://wa.me/${store.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">WhatsApp</a></li>}
            {store.phone && <li>{store.phone}</li>}
          </ul>
        </div>
      </div>

      <div
        className="border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            © {new Date().getFullYear()} {store.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Hecho con IA ✦
          </p>
        </div>
      </div>
    </footer>
  )
}

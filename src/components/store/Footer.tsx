import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="font-display text-xl font-bold tracking-tight block mb-3">
            Tienda<span style={{ color: 'var(--color-accent)' }}>.</span>
          </Link>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Moda consciente para el día a día.
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
            <li>hola@tienda.cl</li>
            <li>Instagram</li>
            <li>WhatsApp</li>
          </ul>
        </div>
      </div>

      <div
        className="border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            © 2026 Tienda Inteligente
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Hecho con IA ✦
          </p>
        </div>
      </div>
    </footer>
  )
}

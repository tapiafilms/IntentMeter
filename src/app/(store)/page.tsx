import Link from 'next/link'
import { getProducts } from '@/lib/supabase/queries'
import ProductCard from '@/components/store/ProductCard'

export default async function HomePage() {
  const products = await getProducts()
  const featured = products.slice(0, 4)

  return (
    <>
      {/* Hero con Video de Fondo */}
      <section className="relative h-[80vh] md:h-[90vh] overflow-hidden flex items-center">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/video-fondo-tienda.mp4" type="video/mp4" />
          </video>
          {/* Overlay para asegurar legibilidad */}
          <div 
            className="absolute inset-0 bg-black/40" 
            style={{ background: 'linear-gradient(to bottom, rgba(26,26,46,0.7) 0%, rgba(26,26,46,0.4) 100%)' }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-sm font-medium tracking-widest mb-6"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.2em' }}>
              NUEVA COLECCIÓN
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Piezas que<br />
              <span style={{ color: 'var(--color-accent)' }}>duran.</span>
            </h1>
            <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Cada prenda seleccionada con cuidado. Diseño atemporal para el día a día.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-sm transition-all hover:scale-105"
                style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
              >
                Ver colección
                <span>→</span>
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-sm border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
              >
                Explorar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-medium tracking-widest mb-2"
                style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
                DESTACADOS
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Lo más nuevo
              </h2>
            </div>
            <Link
              href="/productos"
              className="text-sm font-medium hidden md:flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ver todo <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product, i) => (
              <div key={product.id} className={`animate-fade-up stagger-${i + 1}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Banner propuesta de valor */}
      <section style={{ background: 'var(--color-surface-2)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '✦', title: 'Envío a todo Chile', desc: 'Despacho en 2-5 días hábiles a cualquier región.' },
            { icon: '◈', title: 'Cambios sin drama', desc: '30 días para cambiar talla o color sin preguntas.' },
            { icon: '◇', title: 'Pago seguro', desc: 'Webpay, tarjetas y transferencia bancaria.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-2xl mt-1" style={{ color: 'var(--color-accent)' }}>{item.icon}</span>
              <div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

import Link from 'next/link'
import { getProducts } from '@/lib/supabase/queries'
import ProductCard from '@/components/store/ProductCard'

export default async function HomePage() {
  const products = await getProducts()
  const featured = products.slice(0, 4)

  return (
    <>
      {/* Hero con Fondo Azul y Video Sutil (30% Opacidad) */}
      <section 
        className="relative h-[66vh] overflow-hidden flex items-center"
        style={{ backgroundColor: 'var(--color-brand)' }}
      >
        {/* Video Background con Opacidad Reducida */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover animate-video-fade"
            style={{ opacity: 0.30 }}
          >
            <source src="/video-fondo-tienda.mp4" type="video/mp4" />
          </video>
          {/* Overlay gradiente animado */}
          <div
            className="absolute inset-0 z-10 animate-gradient-color"
            style={{ mixBlendMode: 'color', opacity: 0.55 }}
          />
          {/* Dot grid overlay */}
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            style={{ zIndex: 11, opacity: 0.54 }}
          >
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="black" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotgrid)" />
          </svg>
          {/* Overlay suave para integrar mejor el video con el fondo azul */}
          <div 
            className="absolute inset-0 z-20" 
            style={{ background: 'linear-gradient(to bottom, rgba(26,26,46,0.5) 0%, transparent 100%)' }}
          />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-sm font-medium tracking-widest mb-6"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.2em' }}>
              NUEVA COLECCIÓN
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Piezas que<br />
              <span style={{ color: 'var(--color-accent)' }}>duran.</span>
            </h1>
            <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.95)' }}>
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
              <div key={product.id}>
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
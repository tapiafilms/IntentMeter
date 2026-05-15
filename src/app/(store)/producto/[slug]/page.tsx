import { notFound } from 'next/navigation'
import { getProductBySlug, getProducts } from '@/lib/supabase/queries'
import ProductDetail from '@/components/store/ProductDetail'

interface Props {
  params: Promise<{ slug: string }>
}

// Genera páginas estáticas para todos los productos activos
export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Producto no encontrado' }
  return {
    title: `${product.name} | Tienda Inteligente`,
    description: product.description ?? undefined,
  }
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  return <ProductDetail product={product} />
}

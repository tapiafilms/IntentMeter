// ============================================================
// lib/personalization/filterProducts.ts
// Ordena productos según preferencias del perfil del comprador
// Ver: docs/filtro-personalizacion.md para la lógica completa
// ============================================================
import type { Product } from '@/lib/supabase/types'
import type { CustomerProfile } from '@/lib/supabase/types'

// Mapeo estilo → categorías de producto afines
const STYLE_CATEGORIES: Record<string, string[]> = {
  casual:    ['Casual', 'Jeans', 'Poleras', 'Básicos', 'Ropa cómoda'],
  elegante:  ['Elegante', 'Vestidos', 'Blazers', 'Formal', 'Oficina'],
  bohemio:   ['Bohemio', 'Vestidos', 'Blusas', 'Étnico', 'Flores'],
  deportivo: ['Deportivo', 'Activewear', 'Running', 'Gym'],
}

// Mapeo ocasión → categorías de producto afines
const OCCASION_CATEGORIES: Record<string, string[]> = {
  dia_a_dia: ['Casual', 'Básicos', 'Jeans', 'Poleras'],
  trabajo:   ['Oficina', 'Formal', 'Blazers', 'Elegante'],
  salidas:   ['Vestidos', 'Casual', 'Bohemio', 'Fiesta'],
  eventos:   ['Elegante', 'Vestidos', 'Formal', 'Fiesta'],
}

// Mapeo color → tags de metadata afines
const COLOR_TAGS: Record<string, string[]> = {
  neutros:   ['blanco', 'negro', 'gris', 'beige', 'crema', 'camel'],
  vivos:     ['rojo', 'azul', 'verde', 'amarillo', 'naranja', 'fucsia'],
  pasteles:  ['rosa', 'lila', 'celeste', 'menta', 'melocotón'],
  oscuros:   ['negro', 'azul marino', 'bordo', 'verde oscuro', 'café'],
}

function scoreProduct(product: Product, profile: CustomerProfile): number {
  let score = 0
  const category = (product.category ?? '').toLowerCase()
  const meta = product.metadata as Record<string, unknown>
  const productColors = (
    Array.isArray(meta?.colores) ? meta.colores : [meta?.color ?? '']
  ).map((c: unknown) => String(c).toLowerCase())
  const productStyle = String(meta?.estilo ?? '').toLowerCase()
  const productOccasion = String(meta?.ocasion ?? '').toLowerCase()

  // +3 si la categoría coincide con el estilo preferido
  if (profile.style) {
    const styleCategories = STYLE_CATEGORIES[profile.style] ?? []
    if (styleCategories.some(c => category.includes(c.toLowerCase()))) score += 3
    if (productStyle.includes(profile.style)) score += 2
  }

  // +2 por cada ocasión que coincida
  profile.occasions.forEach(occ => {
    const occCategories = OCCASION_CATEGORIES[occ] ?? []
    if (occCategories.some(c => category.includes(c.toLowerCase()))) score += 2
    if (productOccasion.includes(occ)) score += 1
  })

  // +1 por cada color que coincida
  profile.colors.forEach(pref => {
    const colorTags = COLOR_TAGS[pref] ?? []
    if (productColors.some(pc => colorTags.some(ct => pc.includes(ct)))) score += 1
  })

  return score
}

export function personalizeProducts(products: Product[], profile: CustomerProfile): Product[] {
  const scored = products.map(p => ({ product: p, score: scoreProduct(p, profile) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.product)
}

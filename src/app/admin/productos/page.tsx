'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

type Product = {
  id: string
  tenant_id?: string
  name: string
  slug: string
  description?: string
  price: number
  category?: string
  images?: string[]
  variants?: Variant[]
  metadata?: Record<string, unknown>
  active: boolean
  created_at?: string
}

type Variant = { name: string; value: string; stock: number }
type MenuItem = { label: string; url: string; parent: string }

const CATEGORIES = ['Abrigos', 'Blusas', 'Accesorios', 'Pantalones', 'Vestidos']
const BUCKET = 'productos'
const supabase = createClient()

const fmt = (n: number) => n ? '$' + Number(n).toLocaleString('es-CL') : '—'
const ago = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return new Date(d).toLocaleDateString('es-CL')
}
const toSlug = (s: string) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

// ── Compresión de imagen ──────────────────────────────
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas error')), 'image/webp', quality)
    }
    img.onerror = reject
    img.src = url
  })
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const show = (msg: string, type = '') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }
  return { toast, show }
}

export default function AdminPage() {
  const router = useRouter()
  const { toast, show } = useToast()
  const [section, setSection] = useState('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, cats: 0, orders: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const [modal, setModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Partial<Product>>({})
  const [editImages, setEditImages] = useState<string[]>([])
  const [editVariants, setEditVariants] = useState<Variant[]>([])
  const [editActive, setEditActive] = useState(true)
  const [newImgUrl, setNewImgUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    const list = (data || []) as Product[]
    setProducts(list)
    setFilteredProducts(list)
    const cats = new Set(list.map(p => p.category).filter(Boolean))
    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true })
    setStats({ total: list.length, active: list.filter(p => p.active).length, cats: cats.size, orders: count ?? 0 })
    setLoading(false)
  }, [])

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
    setOrders((data || []) as Record<string, unknown>[])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    if (section === 'orders' && orders.length === 0) loadOrders()
    if (section === 'menu' && menuItems.length === 0) loadMenu()
  }, [section])

  useEffect(() => {
    let list = products
    if (searchQ) list = list.filter(p => p.name?.toLowerCase().includes(searchQ.toLowerCase()) || p.slug?.toLowerCase().includes(searchQ.toLowerCase()))
    if (catFilter) list = list.filter(p => p.category === catFilter)
    if (statusFilter === 'active') list = list.filter(p => p.active)
    if (statusFilter === 'inactive') list = list.filter(p => !p.active)
    setFilteredProducts(list)
  }, [searchQ, catFilter, statusFilter, products])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  function openNew() {
    setEditProduct({})
    setEditImages([])
    setEditVariants([])
    setEditActive(true)
    setModal(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setEditImages(p.images || [])
    setEditVariants(p.variants || [])
    setEditActive(p.active)
    setModal(true)
  }

  // ── Subida de imagen con compresión ───────────────────
  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []

    for (const file of Array.from(files)) {
      try {
        // Comprimir a WebP máx 1200px, 80% calidad
        const compressed = await compressImage(file)
        const originalKB = Math.round(file.size / 1024)
        const compressedKB = Math.round(compressed.size / 1024)

        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, compressed, { contentType: 'image/webp', upsert: false })

        if (error) { show(`Error subiendo ${file.name}: ${error.message}`, 'error'); continue }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
        urls.push(urlData.publicUrl)
        show(`✓ ${file.name} — ${originalKB}KB → ${compressedKB}KB (WebP)`, 'success')
      } catch {
        show(`Error procesando ${file.name}`, 'error')
      }
    }

    setEditImages(imgs => [...imgs, ...urls])
    setUploading(false)
  }

  async function saveProduct() {
  if (!editProduct.name) { show('El nombre es obligatorio', 'error'); return }
  setSaving(true)
  const payload = {
    tenant_id: process.env.NEXT_PUBLIC_TENANT_ID,
    name: editProduct.name,
    slug: editProduct.slug || toSlug(editProduct.name),
    price: Number(editProduct.price) || 0,
    description: editProduct.description || '',
    category: editProduct.category || '',
    images: editImages,
    variants: editVariants,
    active: editActive,
  }

  let err, savedId: string | undefined

  if (editProduct.id) {
    // FIX 1: agrega .eq('tenant_id', ...) para mayor seguridad
    ({ error: err } = await supabase
      .from('products')
      .update(payload)
      .eq('id', editProduct.id)
      .eq('tenant_id', process.env.NEXT_PUBLIC_TENANT_ID!)
    )
    savedId = editProduct.id
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single()
    err = insertErr
    savedId = inserted?.id
  }

  setSaving(false)
  if (err) { show('Error: ' + err.message, 'error'); return }

  show(editProduct.id ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success')
  setModal(false)
  loadProducts()

  // FIX 2: revalidar caché de Next.js para que los cambios sean visibles
  fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: payload.slug }),
  }).catch(() => {}) // silencioso si falla

  // Embedding en segundo plano (sin cambios)
  if (savedId && (payload.name || payload.description)) {
    const text = [payload.name, payload.description, payload.category].filter(Boolean).join(' — ')
    fetch('/api/embeddings/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: savedId, text }),
    }).then(r => r.json()).then(r => {
      if (r.ok) show(`Embedding generado ✓ (${r.dimensions} dimensiones)`, 'success')
    }).catch(() => {})
  }
}

  async function deleteProduct() {
    if (!editProduct.id) return
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('products').delete().eq('id', editProduct.id)
    if (error) { show('Error: ' + error.message, 'error'); return }
    show('Producto eliminado', '')
    setModal(false)
    loadProducts()
  }

  function loadMenu() {
    const saved = localStorage.getItem('admin_menu')
    setMenuItems(saved ? JSON.parse(saved) : [
      { label: 'Inicio', url: '/', parent: '' },
      { label: 'Productos', url: '/productos', parent: '' },
      { label: 'Ropa', url: '/productos?categoria=Ropa', parent: 'Productos' },
      { label: 'Accesorios', url: '/productos?categoria=Accesorios', parent: 'Productos' },
    ])
  }

  function saveMenu() {
    localStorage.setItem('admin_menu', JSON.stringify(menuItems))
    show('Menú guardado ✓', 'success')
  }

  const s = {
    shell: { display: 'flex', height: '100vh', overflow: 'hidden', background: '#0e0e0e', fontFamily: 'DM Sans, sans-serif', color: '#f0ede8', fontSize: 13 } as React.CSSProperties,
    sidebar: { width: 220, background: '#161616', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    topbar: { padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', background: '#161616', flexShrink: 0 },
    content: { flex: 1, overflowY: 'auto' as const, padding: 24 },
    navItem: (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', color: active ? '#f0ede8' : '#8a8580', fontSize: 13, background: active ? '#262626' : 'transparent', marginBottom: 1 }),
    btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, border: 'none',
      background: variant === 'primary' ? '#c9b99a' : 'transparent',
      color: variant === 'primary' ? '#1a1410' : variant === 'danger' ? '#e05a5a' : '#8a8580',
      ...(variant !== 'primary' ? { border: `1px solid ${variant === 'danger' ? '#5a2a2a' : '#333'}` } : {}),
    }),
    input: { background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#f0ede8', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: '100%', outline: 'none' } as React.CSSProperties,
    panel: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
    stat: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px 18px', flex: 1 } as React.CSSProperties,
    th: { padding: '10px 14px', textAlign: 'left' as const, fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 400, borderBottom: '1px solid #2a2a2a' },
    td: { padding: '11px 14px', borderBottom: '1px solid #1e1e1e', color: '#8a8580', verticalAlign: 'middle' as const },
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Productos', badge: stats.total },
    { id: 'categories', label: 'Categorías' },
    { id: 'orders', label: 'Órdenes', badge: stats.orders },
    { id: 'menu', label: 'Menú' },
  ]

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1e1e1e', border: `1px solid ${toast.type === 'success' ? '#2a5a3a' : toast.type === 'error' ? '#5a2a2a' : '#333'}`, color: toast.type === 'success' ? '#4caf7d' : toast.type === 'error' ? '#e05a5a' : '#f0ede8', padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 9999, maxWidth: 340 }}>{toast.msg}</div>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleImageUpload(e.target.files)}
      />

      {/* MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#161616', border: '1px solid #333', borderRadius: 12, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#161616' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{editProduct.id ? editProduct.name : 'Nuevo producto'}</span>
              <button onClick={() => setModal(false)} style={{ ...s.btn('ghost'), padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Nombre', key: 'name', placeholder: 'Nombre del producto' },
                  { label: 'Slug (URL)', key: 'slug', placeholder: 'nombre-del-producto' },
                  { label: 'Precio (CLP)', key: 'price', placeholder: '49900', type: 'number' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={f.type || 'text'} style={s.input} placeholder={f.placeholder}
                      value={(editProduct[f.key as keyof Product] as string) || ''}
                      onChange={e => {
                        const val = e.target.value
                        setEditProduct(p => ({ ...p, [f.key]: val, ...(f.key === 'name' && !p.id ? { slug: toSlug(val) } : {}) }))
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</label>
                  <select style={s.input} value={editProduct.category || ''} onChange={e => setEditProduct(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {[...new Set([...CATEGORIES, ...products.map(p => p.category).filter(Boolean) as string[]])].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</label>
                  <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Descripción del producto..." value={editProduct.description || ''} onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              {/* ── Imágenes ── */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Imágenes
                  <span style={{ marginLeft: 8, color: '#3a5a3a', fontWeight: 400 }}>— compresión automática a WebP</span>
                </label>

                {/* Zona de drop */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files) }}
                  style={{ border: '1.5px dashed #333', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#1a1a1a', marginBottom: 10, transition: 'border-color 0.15s' }}
                >
                  {uploading ? (
                    <div style={{ color: '#c9b99a', fontSize: 12 }}>⏳ Comprimiendo y subiendo...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
                      <div style={{ fontSize: 12, color: '#8a8580' }}>Arrastra imágenes aquí o <span style={{ color: '#c9b99a' }}>haz clic para seleccionar</span></div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>JPG, PNG, WEBP · Se comprimen automáticamente a WebP ≤200KB</div>
                    </>
                  )}
                </div>

                {/* Grid de imágenes subidas */}
                {editImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 8 }}>
                    {editImages.map((url, i) => (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'hidden', position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <button onClick={() => setEditImages(imgs => imgs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#e05a5a', cursor: 'pointer', fontSize: 10 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* URL manual como alternativa */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input type="text" style={{ ...s.input, fontSize: 11 }} placeholder="O pega una URL externa..." value={newImgUrl} onChange={e => setNewImgUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newImgUrl.trim()) { setEditImages(i => [...i, newImgUrl.trim()]); setNewImgUrl('') } }} />
                  <button style={{ ...s.btn('ghost'), whiteSpace: 'nowrap', fontSize: 11 }} onClick={() => { if (newImgUrl.trim()) { setEditImages(i => [...i, newImgUrl.trim()]); setNewImgUrl('') } }}>+ URL</button>
                </div>
              </div>

              {/* ── Variantes ── */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Variantes</label>
                {editVariants.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 32px', gap: 6, marginBottom: 6 }}>
                    <input style={s.input} placeholder="Nombre (Talla)" value={v.name} onChange={e => setEditVariants(vs => vs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input style={s.input} placeholder="Valor (M)" value={v.value} onChange={e => setEditVariants(vs => vs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                    <input type="number" style={s.input} placeholder="Stock" value={v.stock} onChange={e => setEditVariants(vs => vs.map((x, j) => j === i ? { ...x, stock: Number(e.target.value) } : x))} />
                    <button onClick={() => setEditVariants(vs => vs.filter((_, j) => j !== i))} style={{ ...s.btn('ghost'), padding: '4px 8px' }}>✕</button>
                  </div>
                ))}
                <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 10px' }} onClick={() => setEditVariants(vs => [...vs, { name: '', value: '', stock: 0 }])}>+ Agregar variante</button>
              </div>

              {/* ── Toggle activo ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setEditActive(a => !a)} style={{ width: 36, height: 20, background: editActive ? '#4caf7d' : '#262626', borderRadius: 20, position: 'relative', cursor: 'pointer', border: `1px solid ${editActive ? '#4caf7d' : '#333'}`, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', width: 14, height: 14, background: editActive ? 'white' : '#555', borderRadius: '50%', top: 2, left: editActive ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#8a8580' }}>{editActive ? 'Activo (visible en tienda)' : 'Inactivo (oculto)'}</span>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {editProduct.id && <button onClick={deleteProduct} style={{ ...s.btn('danger'), marginRight: 'auto' }}>Eliminar producto</button>}
              <button onClick={() => setModal(false)} style={s.btn('ghost')}>Cancelar</button>
              <button onClick={saveProduct} disabled={saving || uploading} style={{ ...s.btn('primary'), opacity: saving || uploading ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar producto'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.shell}>
        {/* SIDEBAR */}
        <div style={s.sidebar}>
          <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 16, fontWeight: 400, letterSpacing: '-0.02em' }}>Tienda.</div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'DM Mono, monospace', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Panel admin</div>
          </div>
          <nav style={{ padding: '10px 8px', flex: 1 }}>
            {navItems.map(item => (
              <div key={item.id} style={s.navItem(section === item.id)} onClick={() => setSection(item.id)}>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{ background: '#262626', color: '#555', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontFamily: 'DM Mono, monospace' }}>{item.badge}</span>
                )}
              </div>
            ))}
          </nav>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2a2a' }}>
            <a href="https://intent-meter.vercel.app" target="_blank" rel="noreferrer" style={{ ...s.navItem(false), textDecoration: 'none', display: 'flex' }}>↗ Ver tienda en vivo</a>
            <div style={s.navItem(false)} onClick={handleLogout}>← Cerrar sesión</div>
          </div>
        </div>

        {/* MAIN */}
        <div style={s.main}>
          <div style={s.topbar}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {{ dashboard: 'Dashboard', products: 'Productos', categories: 'Categorías', orders: 'Órdenes', menu: 'Menú' }[section]}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {section === 'products' && <button style={s.btn('primary')} onClick={openNew}>+ Nuevo producto</button>}
              {section === 'menu' && <button style={s.btn('primary')} onClick={saveMenu}>Publicar menú</button>}
            </div>
          </div>

          <div style={s.content}>

            {/* DASHBOARD */}
            {section === 'dashboard' && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Productos', val: stats.total, sub: 'en catálogo' },
                    { label: 'Activos', val: stats.active, sub: 'publicados' },
                    { label: 'Categorías', val: stats.cats, sub: 'únicas' },
                    { label: 'Órdenes', val: stats.orders, sub: 'registradas' },
                  ].map(s2 => (
                    <div key={s2.label} style={s.stat}>
                      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s2.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 300, fontFamily: 'DM Mono, monospace' }}>{loading ? '—' : s2.val}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s2.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={s.panel}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Últimos productos agregados</div>
                  {loading ? <div style={{ color: '#555', padding: '20px 0' }}>Cargando...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['Producto', 'Categoría', 'Precio', 'Estado', 'Creado'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {products.slice(0, 8).map(p => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { openEdit(p) }}>
                            <td style={s.td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.images?.[0] ? <img src={p.images[0]} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #2a2a2a' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: '#262626', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◇</div>}
                              <span style={{ color: '#f0ede8' }}>{p.name}</span>
                            </div></td>
                            <td style={s.td}>{p.category || '—'}</td>
                            <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(p.price)}</td>
                            <td style={s.td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: p.active ? '#1a3025' : '#262626', color: p.active ? '#4caf7d' : '#555' }}>{p.active ? '● Activo' : '○ Inactivo'}</span></td>
                            <td style={{ ...s.td, fontSize: 11 }}>{ago(p.created_at!)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* PRODUCTOS */}
            {section === 'products' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input style={{ ...s.input, flex: 1 }} placeholder="Buscar por nombre o slug..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                  <select style={{ ...s.input, width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">Todas las categorías</option>
                    {[...new Set(products.map(p => p.category).filter(Boolean) as string[])].sort().map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select style={{ ...s.input, width: 120 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
                <div style={s.panel}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Productos ({filteredProducts.length})</div>
                  {loading ? <div style={{ color: '#555' }}>Cargando...</div> : filteredProducts.length === 0 ? <div style={{ color: '#555' }}>Sin resultados</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['Producto', 'Slug', 'Categoría', 'Precio', 'Variantes', 'Estado', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredProducts.map(p => (
                          <tr key={p.id}>
                            <td style={s.td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.images?.[0] ? <img src={p.images[0]} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #2a2a2a', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: '#262626', border: '1px solid #2a2a2a', flexShrink: 0 }} />}
                              <span style={{ color: '#f0ede8' }}>{p.name}</span>
                            </div></td>
                            <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{p.slug}</td>
                            <td style={s.td}>{p.category || '—'}</td>
                            <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(p.price)}</td>
                            <td style={{ ...s.td, fontSize: 11 }}>{p.variants?.length ? p.variants.map(v => v.value || v.name).join(', ') : '—'}</td>
                            <td style={s.td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: p.active ? '#1a3025' : '#262626', color: p.active ? '#4caf7d' : '#555' }}>{p.active ? '● Activo' : '○ Inactivo'}</span></td>
                            <td style={s.td}><button style={{ ...s.btn('ghost'), padding: '4px 10px', fontSize: 11 }} onClick={() => openEdit(p)}>Editar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* CATEGORÍAS */}
            {section === 'categories' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Categorías activas</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Categoría', 'Productos', 'Slug'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {Object.entries(
                      products.reduce((acc, p) => { if (p.category) acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                      <tr key={cat}>
                        <td style={{ ...s.td, color: '#f0ede8' }}>{cat}</td>
                        <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{count}</td>
                        <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{toSlug(cat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ÓRDENES */}
            {section === 'orders' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Órdenes ({orders.length})</div>
                {orders.length === 0 ? <div style={{ color: '#555' }}>Sin órdenes aún</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['ID', 'Total', 'Estado', 'Fecha'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {orders.map((o: Record<string, unknown>) => (
                        <tr key={o.id as string}>
                          <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{(o.id as string)?.slice(0, 8)}...</td>
                          <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(Number(o.total || o.amount))}</td>
                          <td style={s.td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: o.status === 'completed' ? '#1a3025' : '#262620', color: o.status === 'completed' ? '#4caf7d' : '#d4a843' }}>{o.status as string || '—'}</span></td>
                          <td style={{ ...s.td, fontSize: 11 }}>{ago(o.created_at as string)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* MENÚ */}
            {section === 'menu' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ítems del menú</div>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>Edita el menú de navegación de tu tienda.</p>
                {menuItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: item.parent ? '#1a1a1a' : '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 6, marginLeft: item.parent ? 24 : 0 }}>
                    {item.parent && <span style={{ fontSize: 11, color: '#555' }}>↳</span>}
                    <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: '#555', fontFamily: 'DM Mono, monospace', marginRight: 8 }}>{item.url}</span>
                    <button onClick={() => setMenuItems(ms => ms.filter((_, j) => j !== i))} style={{ ...s.btn('ghost'), padding: '3px 8px', fontSize: 11 }}>✕</button>
                  </div>
                ))}
                <div style={{ marginTop: 16, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Agregar ítem</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <input style={s.input} placeholder="Etiqueta (ej. Ofertas)" id="mi-label" />
                    <input style={s.input} placeholder="URL (ej. /ofertas)" id="mi-url" />
                    <select style={s.input} id="mi-parent">
                      <option value="">Nivel raíz</option>
                      {menuItems.filter(m => !m.parent).map(m => <option key={m.label}>{m.label}</option>)}
                    </select>
                  </div>
                  <button style={s.btn('ghost')} onClick={() => {
                    const label = (document.getElementById('mi-label') as HTMLInputElement).value.trim()
                    const url = (document.getElementById('mi-url') as HTMLInputElement).value.trim()
                    const parent = (document.getElementById('mi-parent') as HTMLSelectElement).value
                    if (!label || !url) { show('Completa etiqueta y URL', 'error'); return }
                    setMenuItems(ms => [...ms, { label, url, parent }])
                    ;(document.getElementById('mi-label') as HTMLInputElement).value = ''
                    ;(document.getElementById('mi-url') as HTMLInputElement).value = ''
                  }}>+ Agregar</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

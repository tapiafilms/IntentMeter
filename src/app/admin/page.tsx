'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!
const BUCKET = 'productos'
const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────
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
type Variant  = { name: string; value: string; stock: number }
type MenuItem  = { label: string; url: string; parent: string }
type Category  = { id?: string; name: string; slug: string; image_url: string; sort_order: number; active: boolean }
type AnalyticsData = {
  sessions: any[]
  events: any[]
  conversations: any[]
  recentConversations: any[]
  scrollEvents: any[]
  idleEvents: any[]
  weeklyReport: any | null
}
type StoreConfig = {
  name: string; tagline: string; logo_url: string
  email: string; phone: string; instagram: string; whatsapp: string
  primary_color: string; accent_color: string
  theme: 'light' | 'dark'
}

const DEFAULT_CONFIG: StoreConfig = {
  name: 'Mi Tienda', tagline: '', logo_url: '', email: '',
  phone: '', instagram: '', whatsapp: '',
  primary_color: '#1a1a2e', accent_color: '#e2b96f',
  theme: 'light',
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number) => n ? '$' + Number(n).toLocaleString('es-CL') : '—'
const ago = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return new Date(d).toLocaleDateString('es-CL')
}
const toSlug = (s: string) => s.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas error')), 'image/webp', quality)
    }
    img.onerror = reject; img.src = url
  })
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const show = (msg: string, type = '') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800) }
  return { toast, show }
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  shell:   { display: 'flex', height: '100vh', overflow: 'hidden', background: '#0e0e0e', fontFamily: 'DM Sans, sans-serif', color: '#f0ede8', fontSize: 13 } as React.CSSProperties,
  sidebar: { width: 220, background: '#161616', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
  main:    { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  topbar:  { padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', background: '#161616', flexShrink: 0 },
  content: { flex: 1, overflowY: 'auto' as const, padding: 24 },
  nav: (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', color: active ? '#f0ede8' : '#8a8580', fontSize: 13, background: active ? '#262626' : 'transparent', marginBottom: 1 }),
  btn: (v: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, border: 'none', background: v === 'primary' ? '#c9b99a' : 'transparent', color: v === 'primary' ? '#1a1410' : v === 'danger' ? '#e05a5a' : '#8a8580', ...(v !== 'primary' ? { border: `1px solid ${v === 'danger' ? '#5a2a2a' : '#333'}` } : {}) }),
  input:   { background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#f0ede8', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: '100%', outline: 'none' } as React.CSSProperties,
  panel:   { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  stat:    { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px 18px', flex: 1 } as React.CSSProperties,
  th:      { padding: '10px 14px', textAlign: 'left' as const, fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 400, borderBottom: '1px solid #2a2a2a' },
  td:      { padding: '11px 14px', borderBottom: '1px solid #1e1e1e', color: '#8a8580', verticalAlign: 'middle' as const },
  label:   { display: 'block', fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 },
}

export default function AdminPage() {
  const router = useRouter()
  const { toast, show } = useToast()

  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // Productos
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, cats: 0, orders: 0 })

  // Modal producto
  const [modal, setModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Partial<Product>>({})
  const [editImages, setEditImages] = useState<string[]>([])
  const [editVariants, setEditVariants] = useState<Variant[]>([])
  const [editActive, setEditActive] = useState(true)
  const [editStyle, setEditStyle] = useState<string>('')
  const [editOccasions, setEditOccasions] = useState<string[]>([])
  const [editColors, setEditColors] = useState<string[]>([])
  const [newImgUrl, setNewImgUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Órdenes
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])

  // Menú
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  // Categorías
  const [categories, setCategories] = useState<Category[]>([])
  const [catModal, setCatModal] = useState(false)
  const [editCat, setEditCat] = useState<Partial<Category>>({})
  const [catUploading, setCatUploading] = useState(false)
  const [catSaving, setCatSaving] = useState(false)
  const catImgRef = useRef<HTMLInputElement>(null)

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Configuración
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG)
  const [configSaving, setConfigSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Load ─────────────────────────────────────────────────────
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

  const loadMenu = useCallback(async () => {
    const { data } = await supabase.from('nav_items').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true })
    setMenuItems((data || []) as MenuItem[])
  }, [])

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true })
    setCategories((data || []) as Category[])
  }, [])

  const loadAnalytics = useCallback(async () => {
    if (analytics) return
    setAnalyticsLoading(true)
    const res = await fetch('/api/admin/analytics')
    if (res.ok) setAnalytics(await res.json())
    setAnalyticsLoading(false)
  }, [analytics])

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (!res.ok) return
    const { config: cfg } = await res.json()
    if (cfg?.store) setConfig({ ...DEFAULT_CONFIG, ...cfg.store })
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => {
    if (section === 'categories') loadCategories()
    if (section === 'orders'    && orders.length === 0) loadOrders()
    if (section === 'menu'      && menuItems.length === 0) loadMenu()
    if (section === 'analytics') loadAnalytics()
    if (section === 'settings') loadConfig()
  }, [section])

  useEffect(() => {
    let list = products
    if (searchQ) list = list.filter(p => p.name?.toLowerCase().includes(searchQ.toLowerCase()) || p.slug?.toLowerCase().includes(searchQ.toLowerCase()))
    if (catFilter) list = list.filter(p => p.category === catFilter)
    if (statusFilter === 'active') list = list.filter(p => p.active)
    if (statusFilter === 'inactive') list = list.filter(p => !p.active)
    setFilteredProducts(list)
  }, [searchQ, catFilter, statusFilter, products])

  // ── Auth ──────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // ── Productos ─────────────────────────────────────────────────
  function openNew() { setEditProduct({}); setEditImages([]); setEditVariants([]); setEditActive(true); setEditStyle(''); setEditOccasions([]); setEditColors([]); setModal(true) }
  function openEdit(p: Product) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    setEditProduct(p); setEditImages(p.images || []); setEditVariants(p.variants || []); setEditActive(p.active)
    setEditStyle((meta.estilo as string) || '')
    setEditOccasions((meta.ocasion as string[]) || [])
    setEditColors((meta.colores as string[]) || [])
    setModal(true)
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file)
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        const { error } = await supabase.storage.from(BUCKET).upload(filename, compressed, { contentType: 'image/webp', upsert: false })
        if (error) { show(`Error subiendo ${file.name}: ${error.message}`, 'error'); continue }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
        urls.push(urlData.publicUrl)
        show(`✓ ${file.name} subido`, 'success')
      } catch { show(`Error procesando ${file.name}`, 'error') }
    }
    setEditImages(imgs => [...imgs, ...urls])
    setUploading(false)
  }

  async function saveProduct() {
    if (!editProduct.name) { show('El nombre es obligatorio', 'error'); return }
    setSaving(true)
    const metadata = { ...(editProduct.metadata || {}), estilo: editStyle || null, ocasion: editOccasions, colores: editColors }
    const payload = { tenant_id: TENANT_ID, name: editProduct.name, slug: editProduct.slug || toSlug(editProduct.name), price: Number(editProduct.price) || 0, description: editProduct.description || '', category: editProduct.category || '', images: editImages, variants: editVariants, active: editActive, metadata }
    let err, savedId: string | undefined
    if (editProduct.id) {
      ;({ error: err } = await supabase.from('products').update(payload).eq('id', editProduct.id).eq('tenant_id', TENANT_ID))
      savedId = editProduct.id
    } else {
      const { data: inserted, error: insertErr } = await supabase.from('products').insert(payload).select('id').single()
      err = insertErr; savedId = inserted?.id
    }
    setSaving(false)
    if (err) { show('Error: ' + err.message, 'error'); return }
    show(editProduct.id ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success')
    setModal(false)
    loadProducts()
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: payload.slug }) }).catch(() => {})
    if (savedId) {
      const text = [payload.name, payload.description, payload.category].filter(Boolean).join(' — ')
      fetch('/api/embeddings/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: savedId, text }) })
        .then(r => r.json()).then(r => { if (r.ok) show(`Embedding generado ✓`, 'success') }).catch(() => {})
    }
  }

  async function deleteProduct() {
    if (!editProduct.id || !confirm('¿Eliminar este producto?')) return
    const { error } = await supabase.from('products').delete().eq('id', editProduct.id)
    if (error) { show('Error: ' + error.message, 'error'); return }
    show('Producto eliminado', ''); setModal(false); loadProducts()
  }

  // ── Categorías ────────────────────────────────────────────────
  function openNewCat() { setEditCat({ name: '', slug: '', image_url: '', sort_order: categories.length, active: true }); setCatModal(true) }
  function openEditCat(cat: Category) { setEditCat(cat); setCatModal(true) }

  async function uploadCatImage(file: File) {
    setCatUploading(true)
    try {
      const compressed = await compressImage(file, 800, 0.85)
      const filename = `categorias/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
      const { error } = await supabase.storage.from(BUCKET).upload(filename, compressed, { contentType: 'image/webp', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      setEditCat(c => ({ ...c, image_url: data.publicUrl }))
    } catch (err: any) { show('Error al subir imagen: ' + err.message, 'error') }
    finally { setCatUploading(false) }
  }

  async function saveCat() {
    if (!editCat.name) { show('El nombre es obligatorio', 'error'); return }
    setCatSaving(true)
    const payload = {
      tenant_id: TENANT_ID,
      name: editCat.name,
      slug: editCat.slug || toSlug(editCat.name!),
      image_url: editCat.image_url || '',
      sort_order: editCat.sort_order ?? categories.length,
      active: editCat.active ?? true,
    }
    let error
    if (editCat.id) {
      ;({ error } = await supabase.from('categories').update(payload).eq('id', editCat.id))
    } else {
      ;({ error } = await supabase.from('categories').insert(payload))
    }
    setCatSaving(false)
    if (error) { show('Error: ' + error.message, 'error'); return }
    show(editCat.id ? 'Categoría actualizada ✓' : 'Categoría creada ✓', 'success')
    setCatModal(false)
    loadCategories()
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: null }) }).catch(() => {})
  }

  async function deleteCat() {
    if (!editCat.id || !confirm('¿Eliminar esta categoría?')) return
    const { error } = await supabase.from('categories').delete().eq('id', editCat.id)
    if (error) { show('Error: ' + error.message, 'error'); return }
    show('Categoría eliminada', '')
    setCatModal(false)
    loadCategories()
  }

  async function moveCat(id: string, dir: -1 | 1) {
    const idx = categories.findIndex(c => c.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= categories.length) return
    const updated = [...categories]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    setCategories(updated)
    await Promise.all(updated.map((c, i) => supabase.from('categories').update({ sort_order: i }).eq('id', c.id!)))
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: null }) }).catch(() => {})
  }

  // ── Menú ──────────────────────────────────────────────────────
  async function saveMenu() {
    await supabase.from('nav_items').delete().eq('tenant_id', TENANT_ID)
    if (menuItems.length > 0) {
      const { error } = await supabase.from('nav_items').insert(menuItems.map((item, i) => ({ tenant_id: TENANT_ID, label: item.label, url: item.url, parent: item.parent, sort_order: i })))
      if (error) { show('Error guardando menú: ' + error.message, 'error'); return }
    }
    show('Menú publicado ✓', 'success')
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: null }) }).catch(() => {})
  }

  // ── Configuración ─────────────────────────────────────────────
  async function uploadLogo(file: File) {
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      setConfig(c => ({ ...c, logo_url: data.publicUrl }))
    } catch (err: any) { show('Error al subir logo: ' + err.message, 'error') }
    finally { setLogoUploading(false) }
  }

  async function saveConfig() {
    setConfigSaving(true)
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store: config }) })
    const data = await res.json()
    setConfigSaving(false)
    if (!res.ok) { show('Error: ' + data.error, 'error'); return }
    show('Configuración guardada ✓', 'success')
  }

  // ── Nav ───────────────────────────────────────────────────────
  const SECTIONS: { id: string; label: string; badge?: number }[] = [
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'products',   label: 'Productos', badge: stats.total },
    { id: 'categories', label: 'Categorías' },
    { id: 'orders',     label: 'Órdenes', badge: stats.orders },
    { id: 'analytics',  label: 'Analytics IA' },
    { id: 'menu',       label: 'Menú' },
    { id: 'settings',   label: 'Configuración' },
  ]

  const SECTION_TITLE: Record<string, string> = { dashboard: 'Dashboard', products: 'Productos', categories: 'Categorías', orders: 'Órdenes', analytics: 'Analytics IA', menu: 'Menú', settings: 'Configuración' }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1e1e1e', border: `1px solid ${toast.type === 'success' ? '#2a5a3a' : toast.type === 'error' ? '#5a2a2a' : '#333'}`, color: toast.type === 'success' ? '#4caf7d' : toast.type === 'error' ? '#e05a5a' : '#f0ede8', padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 9999, maxWidth: 340 }}>{toast.msg}</div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />
      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
      <input ref={catImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadCatImage(f); e.target.value = '' }} />

      {/* MODAL CATEGORÍA */}
      {catModal && (
        <div onClick={e => e.target === e.currentTarget && setCatModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#161616', border: '1px solid #333', borderRadius: 12, width: '100%', maxWidth: 480 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{editCat.id ? 'Editar categoría' : 'Nueva categoría'}</span>
              <button onClick={() => setCatModal(false)} style={{ ...s.btn('ghost'), padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Imagen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div onClick={() => catImgRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 10, border: '1.5px dashed #333', background: '#1a1a1a', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editCat.image_url ? <img src={editCat.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#444', fontSize: 22 }}>📷</span>}
                </div>
                <div>
                  <button style={s.btn('ghost')} onClick={() => catImgRef.current?.click()} disabled={catUploading}>{catUploading ? 'Subiendo...' : 'Subir imagen'}</button>
                  <p style={{ fontSize: 10, color: '#555', marginTop: 6 }}>Aparece como fondo en el hero de la tienda</p>
                </div>
              </div>
              {/* Nombre */}
              <div>
                <label style={s.label}>Nombre</label>
                <input style={s.input} placeholder="Ej: Vestidos" value={editCat.name || ''} onChange={e => { const name = e.target.value; setEditCat(c => ({ ...c, name, ...(!c.id ? { slug: toSlug(name) } : {}) })) }} />
              </div>
              {/* Slug */}
              <div>
                <label style={s.label}>Slug (URL)</label>
                <input style={s.input} placeholder="vestidos" value={editCat.slug || ''} onChange={e => setEditCat(c => ({ ...c, slug: e.target.value }))} />
              </div>
              {/* Activo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setEditCat(c => ({ ...c, active: !c.active }))} style={{ width: 36, height: 20, background: editCat.active ? '#4caf7d' : '#262626', borderRadius: 20, position: 'relative', cursor: 'pointer', border: `1px solid ${editCat.active ? '#4caf7d' : '#333'}`, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', width: 14, height: 14, background: editCat.active ? 'white' : '#555', borderRadius: '50%', top: 2, left: editCat.active ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#8a8580' }}>{editCat.active ? 'Activa (visible en tienda)' : 'Inactiva (oculta)'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {editCat.id && <button onClick={deleteCat} style={{ ...s.btn('danger'), marginRight: 'auto' }}>Eliminar</button>}
              <button onClick={() => setCatModal(false)} style={s.btn('ghost')}>Cancelar</button>
              <button onClick={saveCat} disabled={catSaving || catUploading} style={{ ...s.btn('primary'), opacity: catSaving ? 0.6 : 1 }}>{catSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
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
                    <label style={s.label}>{f.label}</label>
                    <input type={f.type || 'text'} style={s.input} placeholder={f.placeholder}
                      value={(editProduct[f.key as keyof Product] as string) || ''}
                      onChange={e => { const val = e.target.value; setEditProduct(p => ({ ...p, [f.key]: val, ...(f.key === 'name' && !p.id ? { slug: toSlug(val) } : {}) })) }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={s.label}>Categoría</label>
                  <select style={s.input} value={editProduct.category || ''} onChange={e => setEditProduct(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {[...new Set(products.map(p => p.category).filter(Boolean) as string[])].sort().map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
                  <label style={s.label}>Descripción</label>
                  <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Descripción..." value={editProduct.description || ''} onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              {/* Imágenes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...s.label, marginBottom: 8 }}>Imágenes</label>
                <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files) }}
                  style={{ border: '1.5px dashed #333', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: '#1a1a1a', marginBottom: 10 }}>
                  {uploading ? <div style={{ color: '#c9b99a', fontSize: 12 }}>Subiendo...</div> : <>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
                    <div style={{ fontSize: 12, color: '#8a8580' }}>Arrastra o <span style={{ color: '#c9b99a' }}>haz clic</span></div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>JPG, PNG, WEBP · Se comprimen a WebP</div>
                  </>}
                </div>
                {editImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 8 }}>
                    {editImages.map((url, i) => (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'hidden', position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setEditImages(imgs => imgs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#e05a5a', cursor: 'pointer', fontSize: 10 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" style={{ ...s.input, fontSize: 11 }} placeholder="O pega una URL externa..." value={newImgUrl} onChange={e => setNewImgUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newImgUrl.trim()) { setEditImages(i => [...i, newImgUrl.trim()]); setNewImgUrl('') } }} />
                  <button style={{ ...s.btn('ghost'), whiteSpace: 'nowrap', fontSize: 11 }} onClick={() => { if (newImgUrl.trim()) { setEditImages(i => [...i, newImgUrl.trim()]); setNewImgUrl('') } }}>+ URL</button>
                </div>
              </div>

              {/* Variantes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...s.label, marginBottom: 8 }}>Variantes</label>
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

              {/* Personalización */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...s.label, marginBottom: 8 }}>Personalización (para recomendaciones)</label>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#8a8580', marginBottom: 6 }}>ESTILO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['casual', 'elegante', 'bohemio', 'deportivo'].map(opt => (
                      <button key={opt} onClick={() => setEditStyle(prev => prev === opt ? '' : opt)}
                        style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${editStyle === opt ? '#c9b99a' : '#333'}`, background: editStyle === opt ? '#c9b99a22' : 'transparent', color: editStyle === opt ? '#c9b99a' : '#8a8580', textTransform: 'capitalize' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#8a8580', marginBottom: 6 }}>OCASIÓN (puede ser varias)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['dia_a_dia', 'Día a día'], ['trabajo', 'Trabajo'], ['salidas', 'Salidas'], ['eventos', 'Eventos']].map(([val, label]) => (
                      <button key={val} onClick={() => setEditOccasions(prev => prev.includes(val) ? prev.filter(o => o !== val) : [...prev, val])}
                        style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${editOccasions.includes(val) ? '#c9b99a' : '#333'}`, background: editOccasions.includes(val) ? '#c9b99a22' : 'transparent', color: editOccasions.includes(val) ? '#c9b99a' : '#8a8580' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: '#8a8580', marginBottom: 6 }}>COLORES (puede ser varios)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['neutros', 'Neutros', '#d4c5b0'], ['vivos', 'Vivos', '#e85d4a'], ['pasteles', 'Pasteles', '#f4b8c8'], ['oscuros', 'Oscuros', '#2d1b69']].map(([val, label, swatch]) => (
                      <button key={val} onClick={() => setEditColors(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val])}
                        style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, border: `1.5px solid ${editColors.includes(val) ? '#c9b99a' : '#333'}`, background: editColors.includes(val) ? '#c9b99a22' : 'transparent', color: editColors.includes(val) ? '#c9b99a' : '#8a8580' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: swatch, display: 'inline-block', flexShrink: 0 }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setEditActive(a => !a)} style={{ width: 36, height: 20, background: editActive ? '#4caf7d' : '#262626', borderRadius: 20, position: 'relative', cursor: 'pointer', border: `1px solid ${editActive ? '#4caf7d' : '#333'}`, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', width: 14, height: 14, background: editActive ? 'white' : '#555', borderRadius: '50%', top: 2, left: editActive ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#8a8580' }}>{editActive ? 'Activo (visible en tienda)' : 'Inactivo (oculto)'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {editProduct.id && <button onClick={deleteProduct} style={{ ...s.btn('danger'), marginRight: 'auto' }}>Eliminar</button>}
              <button onClick={() => setModal(false)} style={s.btn('ghost')}>Cancelar</button>
              <button onClick={saveProduct} disabled={saving || uploading} style={{ ...s.btn('primary'), opacity: saving || uploading ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.shell}>
        {/* SIDEBAR */}
        <div style={s.sidebar}>
          <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 16, fontWeight: 400, letterSpacing: '-0.02em' }}>{config.name || 'Mi Tienda'}</div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'DM Mono, monospace', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Panel admin</div>
          </div>
          <nav style={{ padding: '10px 8px', flex: 1 }}>
            {SECTIONS.map(item => (
              <div key={item.id} style={s.nav(section === item.id)} onClick={() => setSection(item.id)}>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{ background: '#262626', color: '#555', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontFamily: 'DM Mono, monospace' }}>{item.badge}</span>
                )}
              </div>
            ))}
          </nav>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2a2a' }}>
            <a href="/" target="_blank" rel="noreferrer" style={{ ...s.nav(false), textDecoration: 'none', display: 'flex' }}>↗ Ver tienda</a>
            <div style={s.nav(false)} onClick={handleLogout}>← Cerrar sesión</div>
          </div>
        </div>

        {/* MAIN */}
        <div style={s.main}>
          <div style={s.topbar}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{SECTION_TITLE[section]}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {section === 'products'   && <button style={s.btn('primary')} onClick={openNew}>+ Nuevo producto</button>}
              {section === 'categories' && <button style={s.btn('primary')} onClick={openNewCat}>+ Nueva categoría</button>}
              {section === 'menu'      && <button style={s.btn('primary')} onClick={saveMenu}>Publicar menú</button>}
              {section === 'settings'  && <button style={s.btn('primary')} onClick={saveConfig} disabled={configSaving}>{configSaving ? 'Guardando...' : 'Guardar cambios'}</button>}
            </div>
          </div>

          <div style={s.content}>

            {/* ── DASHBOARD ── */}
            {section === 'dashboard' && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Productos',   val: stats.total,  sub: 'en catálogo' },
                    { label: 'Activos',     val: stats.active, sub: 'publicados' },
                    { label: 'Categorías',  val: stats.cats,   sub: 'únicas' },
                    { label: 'Órdenes',     val: stats.orders, sub: 'registradas' },
                  ].map(st => (
                    <div key={st.label} style={s.stat}>
                      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{st.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 300, fontFamily: 'DM Mono, monospace' }}>{loading ? '—' : st.val}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{st.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={s.panel}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Últimos productos</div>
                  {loading ? <div style={{ color: '#555' }}>Cargando...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['Producto', 'Categoría', 'Precio', 'Estado', 'Creado'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {products.slice(0, 8).map(p => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { openEdit(p); setSection('products') }}>
                            <td style={s.td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.images?.[0] ? <img src={p.images[0]} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #2a2a2a' }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: '#262626', border: '1px solid #2a2a2a' }} />}
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

            {/* ── PRODUCTOS ── */}
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
                              {p.images?.[0] ? <img src={p.images[0]} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #2a2a2a', flexShrink: 0 }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: '#262626', border: '1px solid #2a2a2a', flexShrink: 0 }} />}
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

            {/* ── CATEGORÍAS ── */}
            {section === 'categories' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Categorías ({categories.length})</div>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>El orden aquí define el orden en el hero de la tienda. Usa las flechas para reordenar.</p>
                {categories.length === 0 ? (
                  <div style={{ color: '#555', padding: '20px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>◇</div>
                    <div>Sin categorías aún — crea la primera con el botón de arriba</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['', 'Categoría', 'Slug', 'Estado', 'Orden', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {categories.map((cat, i) => (
                        <tr key={cat.id}>
                          <td style={{ ...s.td, width: 44 }}>
                            {cat.image_url
                              ? <img src={cat.image_url} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid #2a2a2a' }} />
                              : <div style={{ width: 36, height: 36, borderRadius: 6, background: '#262626', border: '1px solid #2a2a2a' }} />
                            }
                          </td>
                          <td style={{ ...s.td, color: '#f0ede8' }}>{cat.name}</td>
                          <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{cat.slug}</td>
                          <td style={s.td}>
                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: cat.active ? '#1a3025' : '#262626', color: cat.active ? '#4caf7d' : '#555' }}>
                              {cat.active ? '● Activa' : '○ Inactiva'}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => moveCat(cat.id!, -1)} disabled={i === 0} style={{ ...s.btn('ghost'), padding: '2px 7px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                              <button onClick={() => moveCat(cat.id!, 1)} disabled={i === categories.length - 1} style={{ ...s.btn('ghost'), padding: '2px 7px', opacity: i === categories.length - 1 ? 0.3 : 1 }}>↓</button>
                            </div>
                          </td>
                          <td style={s.td}>
                            <button style={{ ...s.btn('ghost'), padding: '4px 10px', fontSize: 11 }} onClick={() => openEditCat(cat)}>Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ÓRDENES ── */}
            {section === 'orders' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Órdenes ({orders.length})</div>
                {orders.length === 0 ? <div style={{ color: '#555' }}>Sin órdenes aún</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['ID', 'Total', 'Estado', 'Fecha'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id as string}>
                          <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{(o.id as string)?.slice(0, 8)}...</td>
                          <td style={{ ...s.td, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(Number(o.total || 0))}</td>
                          <td style={s.td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: o.status === 'completed' ? '#1a3025' : '#262620', color: o.status === 'completed' ? '#4caf7d' : '#d4a843' }}>{o.status as string || '—'}</span></td>
                          <td style={{ ...s.td, fontSize: 11 }}>{ago(o.created_at as string)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {section === 'analytics' && (() => {
              if (analyticsLoading || !analytics) return <div style={{ color: '#555', padding: 40, textAlign: 'center' }}>Cargando analytics...</div>

              const { sessions, events, conversations, recentConversations, scrollEvents, idleEvents, weeklyReport } = analytics
              const total = sessions.length
              const converted = sessions.filter((s: any) => s.converted).length
              const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'
              const avgScore = total > 0 ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.intent_score ?? 0), 0) / total) : 0
              const withDur = sessions.filter((s: any) => s.ended_at && s.started_at)
              const avgDurSec = withDur.length > 0 ? Math.round(withDur.reduce((sum: number, s: any) => sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000, 0) / withDur.length) : 0
              const avgDur = avgDurSec >= 60 ? `${Math.floor(avgDurSec / 60)}m ${avgDurSec % 60}s` : `${avgDurSec}s`

              const intentDist = sessions.reduce((acc: Record<string, number>, s: any) => { acc[s.intent_type ?? 'curious'] = (acc[s.intent_type ?? 'curious'] || 0) + 1; return acc }, {})
              const INTENT_COLORS: Record<string, string> = { curious: '#94a3b8', undecided: '#f59e0b', comparator: '#3b82f6', price_sensitive: '#8b5cf6', buyer: '#22c55e' }
              const INTENT_LABELS: Record<string, string> = { curious: 'Curioso', undecided: 'Indeciso', comparator: 'Comparando', price_sensitive: 'Sensible al precio', buyer: 'Listo para comprar' }

              const productViews = events.filter((e: any) => e.type === 'product_view').reduce((acc: Record<string, number>, e: any) => { const slug = e.payload?.slug ?? 'unknown'; acc[slug] = (acc[slug] || 0) + 1; return acc }, {})
              const topProducts = Object.entries(productViews).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5) as [string, number][]

              const cartAdds    = events.filter((e: any) => e.type === 'add_to_cart').length
              const cartRemoves = events.filter((e: any) => e.type === 'remove_from_cart').length
              const exitEvents  = events.filter((e: any) => e.type === 'exit_intent').length
              const totalViews  = events.filter((e: any) => e.type === 'product_view').length

              const sofiaTotal     = conversations.length
              const sofiaConverted = conversations.filter((c: any) => c.outcome === 'converted').length
              const sofiaRate      = sofiaTotal > 0 ? ((sofiaConverted / sofiaTotal) * 100).toFixed(0) : '0'

              const objCounts: Record<string, number> = {}
              conversations.forEach((c: any) => c.objections?.forEach((o: string) => { objCounts[o] = (objCounts[o] || 0) + 1 }))
              const topObjections = Object.entries(objCounts).sort(([, a], [, b]) => b - a).slice(0, 8) as [string, number][]

              const topSearches = Object.entries(
                events.filter((e: any) => e.type === 'search_query').reduce((acc: Record<string, number>, e: any) => { const q = e.payload?.query ?? '?'; acc[q] = (acc[q] || 0) + 1; return acc }, {})
              ).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 8) as [string, number][]

              const funnelMax = total || 1
              const funnel = [
                { label: 'Sesiones',          val: total,     color: '#e2b96f' },
                { label: 'Vistas producto',   val: totalViews, color: '#3b82f6' },
                { label: 'Add to cart',       val: cartAdds,  color: '#8b5cf6' },
                { label: 'Conversiones',      val: converted, color: '#22c55e' },
              ]

              return (
                <>
                  {/* KPIs */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Sesiones', val: total,    sub: 'últimos 7 días', color: '#e2b96f' },
                      { label: 'Conversiones', val: converted, sub: `${convRate}% tasa`, color: '#22c55e' },
                      { label: 'Score promedio', val: `${avgScore}/100`, sub: 'intención media', color: '#3b82f6' },
                      { label: 'Duración media', val: avgDur, sub: `${withDur.length} sesiones`, color: '#f59e0b' },
                    ].map(k => (
                      <div key={k.label} style={s.stat}>
                        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: k.color }}>{k.val}</div>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* KPIs secundarios */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Vistas producto', val: totalViews, color: '#60a5fa' },
                      { label: 'Add to cart',     val: cartAdds,   color: '#a78bfa' },
                      { label: 'Remove cart',     val: cartRemoves, color: '#f87171' },
                      { label: 'Exit intents',    val: exitEvents,  color: '#fb923c' },
                    ].map(k => (
                      <div key={k.label} style={{ ...s.stat, flex: 'none', minWidth: 120 }}>
                        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: k.color }}>{k.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Funnel */}
                    <div style={s.panel}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Funnel de conversión</div>
                      <p style={{ fontSize: 11, color: '#555', marginBottom: 14 }}>Dónde se cae la gente</p>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                        {funnel.map((f, i) => {
                          const pct = (f.val / funnelMax) * 100
                          const drop = i > 0 && funnel[i-1].val > 0 ? (((funnel[i-1].val - f.val) / funnel[i-1].val) * 100).toFixed(0) : null
                          return (
                            <div key={f.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                              {drop && <span style={{ fontSize: 10, color: '#f87171' }}>−{drop}%</span>}
                              <div style={{ width: '100%', background: '#1e1e1e', borderRadius: 6, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <div style={{ width: '100%', background: f.color, opacity: 0.8, height: `${Math.max(pct, 4)}%`, borderRadius: 6 }} />
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: f.color }}>{f.val}</span>
                              <span style={{ fontSize: 9, color: '#555', textAlign: 'center', letterSpacing: '0.04em' }}>{f.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Intención */}
                    <div style={s.panel}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14 }}>Distribución de intención</div>
                      {total === 0 ? <div style={{ color: '#555', fontSize: 12 }}>Sin datos aún</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {Object.entries(intentDist).sort(([, a], [, b]) => (b as number) - (a as number)).map(([type, count]) => (
                            <div key={type}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: INTENT_COLORS[type] ?? 'white' }}>{INTENT_LABELS[type] ?? type}</span>
                                <span style={{ color: '#555' }}>{count as number}</span>
                              </div>
                              <div style={{ width: '100%', height: 6, background: '#1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: INTENT_COLORS[type] ?? '#94a3b8', width: `${((count as number) / total) * 100}%`, borderRadius: 4 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Top productos */}
                    <div style={s.panel}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14 }}>Productos más vistos</div>
                      {topProducts.length === 0 ? <div style={{ color: '#555', fontSize: 12 }}>Sin datos</div> : topProducts.map(([slug, count], i) => (
                        <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: '#555', width: 14 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 12, color: '#f0ede8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slug.replace(/-/g, ' ')}</span>
                          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#e2b96f' }}>{count}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sofía */}
                    <div style={s.panel}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14 }}>✦ Sofía en números</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Conversaciones', val: sofiaTotal, color: '#e2b96f' },
                          { label: 'Conversiones asistidas', val: sofiaConverted, color: '#22c55e' },
                          { label: 'Tasa de conversión IA', val: `${sofiaRate}%`, color: '#3b82f6' },
                        ].map(k => (
                          <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#555' }}>{k.label}</span>
                            <span style={{ fontSize: 18, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: k.color }}>{k.val}</span>
                          </div>
                        ))}
                      </div>
                      {topObjections.length > 0 && (
                        <>
                          <div style={{ borderTop: '1px solid #2a2a2a', margin: '14px 0' }} />
                          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Objeciones frecuentes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {topObjections.map(([text, count]) => (
                              <span key={text} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(226,185,111,0.08)', border: '1px solid rgba(226,185,111,0.15)', color: '#e2b96f' }}>
                                {text} <span style={{ opacity: 0.6 }}>·{count}</span>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Búsquedas */}
                  {topSearches.length > 0 && (
                    <div style={{ ...s.panel, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Qué buscan los visitantes</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {topSearches.map(([query, count]) => (
                          <span key={query} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                            {query} <span style={{ opacity: 0.6 }}>·{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reporte semanal */}
                  {weeklyReport && (
                    <div style={{ ...s.panel, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Resumen semanal de Sofía</div>
                      {weeklyReport.summary_text && <p style={{ fontSize: 12, color: '#8a8580', lineHeight: 1.6, marginBottom: 12 }}>{weeklyReport.summary_text}</p>}
                      {weeklyReport.insights?.slice(0, 3).map((ins: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6 }}>
                          <span style={{ color: ins.type === 'success' ? '#4caf7d' : ins.type === 'warning' ? '#f59e0b' : '#3b82f6' }}>{ins.type === 'success' ? '✓' : ins.type === 'warning' ? '⚠' : '→'}</span>
                          <span style={{ color: '#8a8580' }}>{ins.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Conversaciones recientes */}
                  <div style={s.panel}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Conversaciones recientes con Sofía</div>
                    <p style={{ fontSize: 11, color: '#555', marginBottom: 14 }}>Últimas {recentConversations.length} — haz clic para ver el transcript</p>
                    {recentConversations.length === 0 ? <div style={{ color: '#555', fontSize: 12 }}>Sin conversaciones aún</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {recentConversations.map((conv: any) => (
                          <details key={conv.id} style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
                            <summary style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: '#1e1e1e', listStyle: 'none' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: conv.outcome === 'converted' ? '#1a3025' : '#262626', color: conv.outcome === 'converted' ? '#4caf7d' : '#555' }}>
                                {conv.outcome === 'converted' ? '✓ Convertida' : conv.outcome === 'abandoned' ? 'Abandonada' : 'En curso'}
                              </span>
                              <span style={{ flex: 1, fontSize: 11, color: '#555' }}>{conv.messages?.length ?? 0} mensajes{conv.objections?.length > 0 && ` · ${conv.objections.join(', ')}`}</span>
                              <span style={{ fontSize: 11, color: '#444' }}>{new Date(conv.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </summary>
                            <div style={{ padding: 14, background: '#111', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {conv.messages?.map((msg: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                  <div style={{ maxWidth: '70%', padding: '6px 10px', borderRadius: 8, fontSize: 11, background: msg.role === 'user' ? 'rgba(226,185,111,0.12)' : '#1e1e1e', color: msg.role === 'user' ? '#e2b96f' : '#8a8580', border: '1px solid #2a2a2a' }}>
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}

            {/* ── MENÚ ── */}
            {section === 'menu' && (
              <div style={s.panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ítems del menú</div>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>Edita el menú de navegación de tu tienda.</p>
                {menuItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: item.parent ? '#1a1a1a' : '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 6, marginLeft: item.parent ? 24 : 0 }}>
                    {item.parent && <span style={{ fontSize: 11, color: '#555' }}>↳</span>}
                    <span style={{ flex: 1 }}>{item.label}</span>
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
                    const url   = (document.getElementById('mi-url')   as HTMLInputElement).value.trim()
                    const parent = (document.getElementById('mi-parent') as HTMLSelectElement).value
                    if (!label || !url) { show('Completa etiqueta y URL', 'error'); return }
                    setMenuItems(ms => [...ms, { label, url, parent }])
                    ;(document.getElementById('mi-label') as HTMLInputElement).value = ''
                    ;(document.getElementById('mi-url')   as HTMLInputElement).value = ''
                  }}>+ Agregar</button>
                </div>
              </div>
            )}

            {/* ── CONFIGURACIÓN ── */}
            {section === 'settings' && (
              <div style={{ maxWidth: 560 }}>
                {/* Logo */}
                <div style={{ ...s.panel, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, border: '1px solid #2a2a2a', background: '#1e1e1e', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {config.logo_url ? <img src={config.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /> : <span style={{ color: '#333', fontSize: 24 }}>✦</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Logo</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={s.btn('ghost')} onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>{logoUploading ? 'Subiendo...' : 'Subir logo'}</button>
                      {config.logo_url && <button style={s.btn('danger')} onClick={() => setConfig(c => ({ ...c, logo_url: '' }))}>Quitar</button>}
                    </div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>PNG, SVG o WebP · Máx 2 MB</div>
                  </div>
                </div>

                {/* Campos */}
                <div style={s.panel}>
                  <div style={{ display: 'grid', gap: 14 }}>
                    {([
                      { key: 'name',      label: 'Nombre de la tienda', placeholder: 'Mi Tienda' },
                      { key: 'tagline',   label: 'Slogan',              placeholder: 'Tu tienda online' },
                      { key: 'email',     label: 'Email de contacto',   placeholder: 'hola@mitienda.cl' },
                      { key: 'phone',     label: 'Teléfono',            placeholder: '+56 9 1234 5678' },
                      { key: 'instagram', label: 'Instagram (URL)',      placeholder: 'https://instagram.com/mitienda' },
                      { key: 'whatsapp',  label: 'WhatsApp (número)',   placeholder: '+56912345678' },
                    ] as const).map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label style={s.label}>{label}</label>
                        <input style={s.input} placeholder={placeholder} value={config[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tema */}
                <div style={s.panel}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14 }}>Tema del sitio</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['light', 'dark'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setConfig(c => ({ ...c, theme: t }))}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                          border: config.theme === t ? '2px solid #e2b96f' : '2px solid #2a2a2a',
                          background: config.theme === t ? '#1f1f1f' : '#181818',
                          color: config.theme === t ? '#e2b96f' : '#666',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          transition: 'all 0.15s',
                        }}
                      >
                        {t === 'light' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colores */}
                <div style={s.panel}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14 }}>Colores</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {([
                      { key: 'primary_color', label: 'Color principal' },
                      { key: 'accent_color',  label: 'Color acento' },
                    ] as const).map(({ key, label }) => (
                      <div key={key}>
                        <label style={s.label}>{label}</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={config[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                            style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid #2a2a2a', background: 'none', cursor: 'pointer', padding: 2 }} />
                          <input style={{ ...s.input, fontFamily: 'DM Mono, monospace', fontSize: 12 }} value={config[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Preview */}
                  <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: config.primary_color, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {config.logo_url
                      ? <img src={config.logo_url} style={{ height: 28, objectFit: 'contain', maxWidth: 100 }} />
                      : <span style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>{config.name || 'Mi Tienda'}<span style={{ color: config.accent_color }}>.</span></span>
                    }
                    <span style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: config.accent_color, color: config.primary_color }}>Ver colección →</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

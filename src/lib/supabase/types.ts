// ============================================================
// lib/supabase/types.ts
// Tipos TypeScript para todas las tablas de la base de datos
// ============================================================

export type IntentType = 'curious' | 'undecided' | 'buyer' | 'price_sensitive' | 'comparator'
export type ConversationOutcome = 'ongoing' | 'converted' | 'abandoned'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
export type TriggerRule = 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'R07'

export type SessionEventType =
  | 'page_view' | 'product_view' | 'product_revisit' | 'scroll_depth'
  | 'add_to_cart' | 'remove_from_cart' | 'cart_view'
  | 'checkout_start' | 'checkout_abandon'
  | 'shipping_view' | 'returns_view' | 'search_query'
  | 'exit_intent' | 'idle_detected'

// ── Tenant ────────────────────────────────────────────────────
export interface TenantStoreConfig {
  name: string
  tagline: string
  logo_url: string
  email: string
  phone: string
  instagram: string
  whatsapp: string
  primary_color: string
  accent_color: string
  theme: 'light' | 'dark'
}

export interface TenantConfig {
  store: TenantStoreConfig
  widget: {
    tone: 'friendly' | 'formal' | 'playful'
    position: 'bottom-right' | 'bottom-left'
    primary_color: string
    assistant_name: string
    active_hours: { start: number; end: number }
  }
  rules: {
    R01_revisits: number
    R02_score_threshold: number
    R06_idle_seconds: number
    R07_score_threshold: number
  }
  ai: {
    max_turns: number
    conversation_timeout_minutes: number
  }
}

export interface Tenant {
  id: string
  name: string
  slug: string
  config: TenantConfig
  active: boolean
  created_at: string
}

// ── Product ───────────────────────────────────────────────────
export interface ProductVariant {
  name: string
  stock: number
  sku: string
  price_modifier?: number
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  price: number
  category: string | null
  variants: ProductVariant[]
  images: string[]
  metadata: Record<string, unknown>
  active: boolean
  created_at: string
}

// ── Order ─────────────────────────────────────────────────────
export interface OrderItem {
  product_id: string
  product_name: string
  variant: string
  qty: number
  price: number
}

export interface Order {
  id: string
  tenant_id: string
  visitor_id: string
  items: OrderItem[]
  subtotal: number
  shipping_cost: number
  total: number
  status: OrderStatus
  customer_email: string | null
  shipping_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ── Session ───────────────────────────────────────────────────
export interface Session {
  id: string
  tenant_id: string
  visitor_id: string
  intent_score: number
  intent_type: IntentType
  converted: boolean
  order_id: string | null
  started_at: string
  ended_at: string | null
  metadata: Record<string, unknown>
}

// ── Session Event ─────────────────────────────────────────────
export interface SessionEvent {
  id: string
  tenant_id: string
  session_id: string
  type: SessionEventType
  payload: Record<string, unknown>
  created_at: string
}

// ── Conversation ──────────────────────────────────────────────
export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  tenant_id: string
  session_id: string
  product_id: string | null
  messages: ConversationMessage[]
  trigger_type: TriggerRule
  objections: string[]
  outcome: ConversationOutcome
  created_at: string
  updated_at: string
}

// ── Weekly Report ─────────────────────────────────────────────
export interface TopObjection {
  text: string
  count: number
  products: string[]
}

export interface AbandonedProduct {
  product_id: string
  name: string
  views: number
  purchases: number
  rate: number
}

export interface ReportInsight {
  type: 'warning' | 'opportunity' | 'success'
  message: string
  action: string
}

export interface WeeklyReport {
  id: string
  tenant_id: string
  week_start: string
  sessions_total: number
  ai_interventions: number
  conversions_assisted: number
  ai_assisted_revenue: number
  conversion_uplift: number | null
  top_objections: TopObjection[]
  top_abandoned_products: AbandonedProduct[]
  insights: ReportInsight[]
  summary_text: string | null
  created_at: string
}

// ── Customer Profile ──────────────────────────────────────────
export type CustomerStyle    = 'casual' | 'elegante' | 'bohemio' | 'deportivo'
export type CustomerOccasion = 'dia_a_dia' | 'trabajo' | 'salidas' | 'eventos'
export type CustomerColor    = 'neutros' | 'vivos' | 'pasteles' | 'oscuros'
export type CustomerSize     = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface CustomerProfile {
  id: string
  user_id: string
  tenant_id: string
  name: string
  style: CustomerStyle | null
  occasions: CustomerOccasion[]
  colors: CustomerColor[]
  size: CustomerSize | null
  created_at: string
  updated_at: string
}

// ── Supabase Database type (para tipado del cliente) ──────────
export interface Database {
  public: {
    Tables: {
      tenants:        { Row: Tenant;        Insert: Partial<Tenant>;        Update: Partial<Tenant> }
      products:       { Row: Product;       Insert: Partial<Product>;       Update: Partial<Product> }
      orders:         { Row: Order;         Insert: Partial<Order>;         Update: Partial<Order> }
      sessions:       { Row: Session;       Insert: Partial<Session>;       Update: Partial<Session> }
      session_events: { Row: SessionEvent;  Insert: Partial<SessionEvent>;  Update: Partial<SessionEvent> }
      conversations:  { Row: Conversation;  Insert: Partial<Conversation>;  Update: Partial<Conversation> }
      weekly_reports: { Row: WeeklyReport;  Insert: Partial<WeeklyReport>;  Update: Partial<WeeklyReport> }
    }
  }
}

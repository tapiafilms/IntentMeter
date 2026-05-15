-- ============================================================
-- Tienda Inteligente — Migración inicial completa
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Habilitar extensión para UUIDs y vectores
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLA: tenants
-- Cada cliente (tienda) del sistema
-- ============================================================
CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  config      jsonb NOT NULL DEFAULT '{
    "widget": {
      "tone": "friendly",
      "position": "bottom-right",
      "primary_color": "#1F4E79",
      "assistant_name": "Asistente",
      "active_hours": {"start": 0, "end": 24}
    },
    "rules": {
      "R01_revisits": 3,
      "R02_score_threshold": 40,
      "R06_idle_seconds": 45,
      "R07_score_threshold": 70
    },
    "ai": {
      "max_turns": 10,
      "conversation_timeout_minutes": 5
    }
  }',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: products
-- Catálogo de productos por tenant
-- ============================================================
CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  price       numeric(12,2) NOT NULL,
  category    text,
  variants    jsonb NOT NULL DEFAULT '[]',
  -- Ejemplo variants: [{"name":"Talla M","stock":5,"sku":"PROD-M"},...]
  images      text[] NOT NULL DEFAULT '{}',
  metadata    jsonb NOT NULL DEFAULT '{}',
  -- Ejemplo metadata: {"material":"algodón","cuidados":"lavar a mano"}
  embedding   vector(1536),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- ============================================================
-- TABLA: orders
-- Órdenes de compra
-- ============================================================
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id      text NOT NULL,
  items           jsonb NOT NULL DEFAULT '[]',
  -- Ejemplo items: [{"product_id":"...","variant":"M","qty":1,"price":45000}]
  subtotal        numeric(12,2) NOT NULL,
  shipping_cost   numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  -- pending | paid | shipped | delivered | cancelled
  customer_email  text,
  shipping_data   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: sessions
-- Cada visita de un usuario — campos derivados/resumen
-- ============================================================
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id   text NOT NULL,
  intent_score integer NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  intent_type  text NOT NULL DEFAULT 'curious',
  -- curious | undecided | buyer | price_sensitive | comparator
  converted    boolean NOT NULL DEFAULT false,
  order_id     uuid REFERENCES orders(id),
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  metadata     jsonb NOT NULL DEFAULT '{}'
);

-- ============================================================
-- TABLA: session_events
-- Eventos raw de cada sesión (separado de sessions para performance)
-- ============================================================
CREATE TABLE session_events (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- page_view | product_view | product_revisit | scroll_depth |
  -- add_to_cart | remove_from_cart | cart_view | checkout_start |
  -- checkout_abandon | shipping_view | returns_view |
  -- search_query | exit_intent | idle_detected
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices críticos para performance de analítica
CREATE INDEX idx_session_events_tenant_type
  ON session_events (tenant_id, type);

CREATE INDEX idx_session_events_session
  ON session_events (session_id);

CREATE INDEX idx_session_events_tenant_date
  ON session_events (tenant_id, created_at DESC);

-- ============================================================
-- TABLA: conversations
-- Conversaciones IA ↔ visitante
-- ============================================================
CREATE TABLE conversations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id   uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id),
  messages     jsonb NOT NULL DEFAULT '[]',
  -- [{role: "assistant"|"user", content: "...", timestamp: "..."}]
  trigger_type text NOT NULL,
  -- R01 | R02 | R03 | R04 | R05 | R06 | R07
  objections   text[] NOT NULL DEFAULT '{}',
  outcome      text NOT NULL DEFAULT 'ongoing',
  -- ongoing | converted | abandoned
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_tenant_date
  ON conversations (tenant_id, created_at DESC);

CREATE INDEX idx_conversations_session
  ON conversations (session_id);

-- ============================================================
-- TABLA: weekly_reports
-- Reportes generados automáticamente cada lunes
-- ============================================================
CREATE TABLE weekly_reports (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_start              date NOT NULL,
  sessions_total          integer NOT NULL DEFAULT 0,
  ai_interventions        integer NOT NULL DEFAULT 0,
  conversions_assisted    integer NOT NULL DEFAULT 0,
  ai_assisted_revenue     numeric(12,2) NOT NULL DEFAULT 0,
  conversion_uplift       numeric(5,2),
  top_objections          jsonb NOT NULL DEFAULT '[]',
  -- [{text: "duda de talla", count: 89, products: ["Vestido M"]}]
  top_abandoned_products  jsonb NOT NULL DEFAULT '[]',
  -- [{product_id: "...", name: "...", views: 340, rate: 0.965}]
  insights                jsonb NOT NULL DEFAULT '[]',
  -- [{type: "warning", message: "El costo de envío...", action: "..."}]
  summary_text            text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, week_start)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Cada tenant solo ve sus propios datos
-- ============================================================
ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports  ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso completo desde service_role (tu backend)
-- Las políticas de usuario se agregan cuando implementes auth para el admin

CREATE POLICY "service_role_all" ON tenants
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON products
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON orders
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON sessions
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON session_events
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON conversations
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all" ON weekly_reports
  FOR ALL TO service_role USING (true);

-- Política pública para productos activos (la tienda los necesita sin auth)
CREATE POLICY "public_read_products" ON products
  FOR SELECT TO anon
  USING (active = true);

-- ============================================================
-- TENANT INICIAL (para desarrollo)
-- Cambia el slug y nombre según tu primer cliente
-- ============================================================
INSERT INTO tenants (name, slug) VALUES
  ('Mi Primera Tienda', 'mi-primera-tienda');

-- Guarda el ID que te devuelva para ponerlo en NEXT_PUBLIC_TENANT_ID
SELECT id, slug FROM tenants WHERE slug = 'mi-primera-tienda';

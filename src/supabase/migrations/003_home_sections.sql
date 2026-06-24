-- ============================================================
-- Migración 003 — Secciones del home
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

CREATE TABLE home_sections (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- 'featured' | 'collections'
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  config      jsonb NOT NULL DEFAULT '{}',
  -- featured:    { title, subtitle }
  -- collections: { title, items: [{name, href, image, tags}] }
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, type)
);

ALTER TABLE home_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON home_sections
  FOR ALL TO service_role USING (true);

CREATE POLICY "public_read_home_sections" ON home_sections
  FOR SELECT TO anon
  USING (true);

-- Secciones por defecto para el tenant inicial
-- Reemplaza el UUID con el ID real de tu tenant
-- INSERT INTO home_sections (tenant_id, type, enabled, sort_order, config) VALUES
--   ('<TENANT_ID>', 'featured', true, 1, '{"title": "Seleccionado para ti", "subtitle": ""}'),
--   ('<TENANT_ID>', 'collections', true, 2, '{
--     "title": "Colecciones",
--     "items": [
--       {"name": "Mujer",     "href": "/productos?categoria=mujer",      "image": "/coleccion-mujer.jpg", "tags": ["Mujer"]},
--       {"name": "Hombre",    "href": "/productos?categoria=hombre",     "image": "/coleccion-hombre.jpg","tags": ["Hombre"]},
--       {"name": "Niños",     "href": "/productos?categoria=ninos",      "image": null,                   "tags": ["Niños"]},
--       {"name": "Accesorios","href": "/productos?categoria=accesorios", "image": null,                   "tags": ["Accesorios"]},
--       {"name": "Lo Nuevo",  "href": "/productos?nuevo=true",           "image": null,                   "tags": ["Nuevos"]}
--     ]
--   }');

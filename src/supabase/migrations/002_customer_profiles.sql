-- ============================================================
-- Migración 002 — Perfiles de compradores
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

CREATE TABLE customer_profiles (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  style      text,
  -- casual | elegante | bohemio | deportivo
  occasions  text[] NOT NULL DEFAULT '{}',
  -- dia_a_dia | trabajo | salidas | eventos
  colors     text[] NOT NULL DEFAULT '{}',
  -- neutros | vivos | pasteles | oscuros
  size       text,
  -- XS | S | M | L | XL | XXL
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- El usuario solo ve y edita su propio perfil
CREATE POLICY "customer_own_profile" ON customer_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- El backend puede leer todos los perfiles
CREATE POLICY "service_role_all" ON customer_profiles
  FOR ALL TO service_role USING (true);

#!/bin/bash
# ============================================================
# Tienda Inteligente — Setup inicial
# Ejecutar en tu máquina local
# ============================================================

echo "→ Creando proyecto Next.js..."
npx create-next-app@latest tienda-inteligente \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

cd tienda-inteligente

echo "→ Instalando dependencias..."
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @floating-ui/react \
  zustand \
  swr \
  clsx \
  date-fns \
  openai

npm install -D \
  supabase \
  @types/node

echo "→ Estructura de carpetas creada."
echo "✓ Setup listo. Continúa con el paso 2: variables de entorno."

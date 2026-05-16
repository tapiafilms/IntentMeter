# Embeddings Semánticos — Documentación Técnica
## Proyecto: Tienda Inteligente / IntentMeter

---

## ¿Qué son los embeddings y para qué sirven?

Un embedding es una representación matemática del significado de un texto, expresada como un vector de números. Dos textos con significado similar producen vectores cercanos entre sí en el espacio matemático.

En términos prácticos para esta tienda:

- "Vestido negro elegante para noche" y "traje oscuro formal para eventos" producirán vectores muy cercanos, aunque no compartan ninguna palabra.
- Esto permite **búsqueda semántica** (el cliente busca "algo para una boda" y encuentra productos relevantes aunque ninguno diga "boda").
- También permite **recomendaciones reales** ("otros productos similares a este") basadas en significado, no en categoría.

La tabla `products` en Supabase ya tiene la columna `embedding` de tipo `vector`, lo que indica que esta funcionalidad estaba planificada desde el diseño original del proyecto.

---

## Implementación actual: Transformers.js (sin costo)

### ¿Qué es?
Transformers.js es una librería open source que permite correr modelos de lenguaje directamente en Node.js (en el servidor de Vercel), sin llamadas a APIs externas y sin costo por uso.

### Modelo utilizado
`Xenova/all-MiniLM-L6-v2` — modelo liviano de 22MB, optimizado para embeddings de oraciones. Produce vectores de 384 dimensiones.

### Flujo implementado
1. El dueño guarda o edita un producto en `/admin/productos`
2. El admin llama al endpoint `POST /api/embeddings/generate`
3. El endpoint toma `name + description + category` del producto
4. Genera el embedding con Transformers.js en el servidor
5. Guarda el vector en la columna `embedding` de Supabase
6. Con los embeddings almacenados, la función `match_products` de Supabase (pgvector) permite búsqueda semántica en tiempo real

### Ventajas
- **Costo cero** — no hay llamadas a APIs externas
- **Sin límites de uso** — funciona para cualquier volumen de productos
- **Privacidad** — los textos de los productos no salen del servidor
- **Sin API keys** — no hay dependencias externas que gestionar

### Limitaciones
- El modelo es menos preciso que OpenAI para textos muy complejos o en múltiples idiomas
- La primera carga del modelo tarda ~3 segundos en frío (Vercel cold start)
- Vectores de 384 dimensiones vs 1536 de OpenAI (menos resolución semántica)

---

## Migración futura a OpenAI (recomendado al conseguir cliente comprador)

### ¿Por qué migrar?
Cuando el proyecto tenga un cliente pagador, la inversión en OpenAI embeddings es mínima y la mejora en precisión es significativa:

| | Transformers.js | OpenAI |
|---|---|---|
| Costo | $0 | ~$0.00002 / producto |
| Dimensiones | 384 | 1536 |
| Precisión | Buena | Excelente |
| Idioma | Inglés/Español básico | Multilingüe avanzado |
| Cold start | ~3s | ~200ms |

Para un catálogo de 500 productos, el costo total de generar todos los embeddings con OpenAI sería **menos de $0.01 USD**.

### Pasos para migrar (1-2 horas de trabajo)

**1. Crear API key de OpenAI**
- Ir a https://platform.openai.com/api-keys
- Crear una nueva key
- Agregarla a Vercel como variable de entorno: `OPENAI_API_KEY`

**2. Instalar el SDK**
```bash
npm install openai
```

**3. Cambiar el endpoint `/api/embeddings/generate`**

Reemplazar el bloque de Transformers.js:
```ts
// ANTES — Transformers.js (384 dimensiones)
import { pipeline } from '@xenova/transformers'
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
const output = await extractor(text, { pooling: 'mean', normalize: true })
const embedding = Array.from(output.data)
```

Por OpenAI:
```ts
// DESPUÉS — OpenAI (1536 dimensiones)
import OpenAI from 'openai'
const openai = new OpenAI()
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
})
const embedding = response.data[0].embedding
```

**4. Actualizar la columna en Supabase**

La columna `embedding` actualmente debe estar configurada para 384 dimensiones. Al migrar a OpenAI hay que actualizarla a 1536:

```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE products 
  ALTER COLUMN embedding TYPE vector(1536);

-- Regenerar todos los embeddings existentes
-- (correr el script de regeneración masiva)
```

**5. Regenerar embeddings de productos existentes**

Crear un script que itere sobre todos los productos y regenere los embeddings con el nuevo modelo. Esto se hace una sola vez.

---

## Funcionalidades que se habilitan con embeddings

### 1. Búsqueda semántica
El cliente escribe "algo elegante para una reunión de trabajo" y el sistema encuentra los productos más relevantes por significado, no por palabras clave.

### 2. Recomendaciones "Productos similares"
En la página de cada producto, mostrar los 3-4 productos con embedding más cercano usando la función `match_products` de pgvector en Supabase.

### 3. Contexto para el asistente de ventas con IA
Al chatear con el asistente, el sistema busca semánticamente los productos más relevantes para la consulta del usuario y se los pasa como contexto al modelo de lenguaje, mejorando drásticamente la calidad de las respuestas.

### 4. Análisis de catálogo
Detectar automáticamente productos duplicados o muy similares, identificar vacíos en el catálogo, sugerir categorías.

---

## Estado actual del proyecto

- [x] Columna `embedding vector` en tabla `products` — ✓ ya existe
- [x] Extensión pgvector en Supabase — ✓ habilitada
- [ ] Endpoint `/api/embeddings/generate` — pendiente implementar
- [ ] Generación automática al guardar producto — pendiente
- [ ] Función `match_products` en Supabase — pendiente crear
- [ ] UI de búsqueda semántica — pendiente
- [ ] UI de productos similares — pendiente

---

*Documento generado el 15 de mayo de 2026*
*Stack: Next.js 16 · Supabase · Vercel · Transformers.js → OpenAI*

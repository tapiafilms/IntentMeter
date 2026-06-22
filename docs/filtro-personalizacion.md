# Filtro de personalización — "Lo más nuevo"

## Cómo funciona

Cuando un comprador inicia sesión y tiene perfil completo, la sección "Lo más nuevo" reordena los productos según sus preferencias declaradas. No filtra (no esconde productos), solo prioriza — así el comprador siempre ve catálogo completo, pero lo más relevante aparece primero.

## Flujo

```
1. page.tsx obtiene todos los productos (orden: más recientes primero)
2. Si hay sesión → obtiene customer_profile del usuario
3. Si hay perfil → llama personalizeProducts(products, profile)
4. FeaturedCarousel recibe los productos reordenados + nombre del cliente
```

## Sistema de puntos (scorer)

Cada producto recibe un score según cuánto coincide con el perfil:

| Señal                                        | Puntos |
|----------------------------------------------|--------|
| Categoría del producto coincide con estilo   | +3     |
| metadata.estilo coincide con estilo          | +2     |
| Categoría coincide con una ocasión preferida | +2 c/u |
| metadata.ocasion coincide con ocasión        | +1 c/u |
| metadata.colores coincide con color preferido| +1 c/u |

Los productos se ordenan de mayor a menor score. Empates mantienen el orden original (más reciente primero).

## Campos del perfil

| Campo      | Valores posibles                                         |
|------------|----------------------------------------------------------|
| `style`    | `casual` / `elegante` / `bohemio` / `deportivo`          |
| `occasions`| `dia_a_dia` / `trabajo` / `salidas` / `eventos` (array) |
| `colors`   | `neutros` / `vivos` / `pasteles` / `oscuros` (array)    |
| `size`     | `XS` / `S` / `M` / `L` / `XL` / `XXL`                  |

> `size` no se usa en el filtro actual — está guardado para filtrar variantes de stock en futuras versiones.

## Mapeos estilo → categorías

```
casual    → Casual, Jeans, Poleras, Básicos, Ropa cómoda
elegante  → Elegante, Vestidos, Blazers, Formal, Oficina
bohemio   → Bohemio, Vestidos, Blusas, Étnico, Flores
deportivo → Deportivo, Activewear, Running, Gym
```

## Mapeos ocasión → categorías

```
dia_a_dia → Casual, Básicos, Jeans, Poleras
trabajo   → Oficina, Formal, Blazers, Elegante
salidas   → Vestidos, Casual, Bohemio, Fiesta
eventos   → Elegante, Vestidos, Formal, Fiesta
```

## Mapeos color → tags de metadata

```
neutros   → blanco, negro, gris, beige, crema, camel
vivos     → rojo, azul, verde, amarillo, naranja, fucsia
pasteles  → rosa, lila, celeste, menta, melocotón
oscuros   → negro, azul marino, bordo, verde oscuro, café
```

## Cómo etiquetar productos en el admin

Para que el filtro funcione, los productos deben tener datos en el campo `metadata`. Ejemplo:

```json
{
  "estilo": "casual",
  "ocasion": "dia_a_dia",
  "colores": ["blanco", "beige"],
  "material": "algodón"
}
```

Sin metadata, el producto igual aparece en el carrusel — solo con score 0, es decir, al final.

## Comportamiento sin sesión

Si el visitante no está logueado (o no tiene perfil), `personalizeProducts` no se llama y los productos se muestran en orden de creación (más recientes primero), igual que antes.

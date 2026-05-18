import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/supabase/queries'

interface ChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context: {
    intentType: string
    intentScore: number
    currentProduct?: string
    triggerReason: string
    activeComparison?: string[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatBody = await req.json()
    const { messages, context } = body

    const products = await getProducts()
    const catalog = products.map(p => ({
      nombre: p.name,
      slug: p.slug,
      categoria: p.category,
      precio: p.price,
      descripcion: p.description?.slice(0, 100),
    }))

    const catalogStr = JSON.stringify(catalog)
    const systemPrompt = [
      'Eres Sofia, asesora de moda de una tienda chilena online. Eres amable, directa y cercana.',
      'Tu objetivo es ayudar a la clienta a encontrar la prenda perfecta y concretar su compra.',
      '',
      'CATALOGO DISPONIBLE:',
      catalogStr,
      '',
      'CONTEXTO DEL VISITANTE:',
      'Nivel de intencion: ' + context.intentType + ' (score: ' + context.intentScore + '/100)',
      'Razon de apertura: ' + context.triggerReason,
      context.currentProduct ? 'Producto que esta viendo: ' + context.currentProduct : '',
      context.activeComparison?.length
        ? 'COMPARATIVA ACTIVA: La usuaria acaba de ver estas opciones simultaneas: ' + context.activeComparison.join(', ') + '. Su siguiente mensaje elige una de ellas.'
        : '',
      '',
      'REGLAS:',
      '- Responde SIEMPRE en espanol chileno, calido y cercano',
      '- Maximo 2-3 oraciones por respuesta',
      '- Si recomiendas UN producto especifico, usa redirect_to con su slug',
      '- Si el usuario pide comparar, ver opciones o no sabe cual elegir, usa compare_products con 2 a 4 slugs relevantes',
      '- Solo redirige cuando estes segura que es lo que busca, no en cada mensaje',
      '- Envio: 2-5 dias habiles a todo Chile',
      '- Cambios: 30 dias sin preguntas',
      '- Si el score es mayor a 60, se mas proactiva en cerrar la venta',
      '- Termina siempre con una pregunta o llamada a la accion',
      '- Si hay COMPARATIVA ACTIVA y el usuario elige una opcion, responde SIEMPRE con redirect_to al slug correcto, NUNCA vuelvas a usar compare_products',
      '- Si el usuario confirma que quiere agregar al carrito y ya estas en el producto correcto, responde con ask_add_to_cart: true y redirect_to con el slug del producto actual',
      '',
      'FORMATO DE RESPUESTA - responde SIEMPRE con JSON puro sin markdown:',
      'Ejemplo normal: {"message": "tu respuesta", "redirect_to": null, "ask_add_to_cart": false, "compare_products": null}',
      'Ejemplo comparativa: {"message": "Aqui te muestro mis favoritos!", "redirect_to": null, "ask_add_to_cart": false, "compare_products": ["slug-1", "slug-2", "slug-3"]}',
      'Ejemplo redireccion: {"message": "Te llevo a verlo", "redirect_to": "slug-producto", "ask_add_to_cart": true, "compare_products": null}',
    ].join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text ?? '{}'

    let message = 'Lo siento, hubo un problema. Puedo ayudarte en algo mas?'
    let redirect_to: string | null = null
    let ask_add_to_cart = false
    let compare_products: string[] | null = null

    try {
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        message = parsed.message ?? message
        redirect_to = parsed.redirect_to && parsed.redirect_to !== 'null' ? parsed.redirect_to : null
        ask_add_to_cart = parsed.ask_add_to_cart === true
        compare_products = Array.isArray(parsed.compare_products) && parsed.compare_products.length >= 2
          ? parsed.compare_products.slice(0, 4)
          : null
      } else {
        message = clean
      }
    } catch {
      message = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').replace(/\{[\s\S]*\}/g, '').trim()
    }

    return NextResponse.json({ message, redirect_to, ask_add_to_cart, compare_products })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json(
      { message: 'Lo siento, tuve un problema tecnico.' },
      { status: 500 }
    )
  }
}
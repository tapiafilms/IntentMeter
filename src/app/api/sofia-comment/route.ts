// ============================================================
// app/api/sofia-comment/route.ts
// Genera un comentario corto y personalizado de Sofía
// para mostrar en la franja sobre la galería del producto
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, description, category } = await req.json()
    if (!name) return NextResponse.json({ comment: null }, { status: 400 })

    const prompt = [
      `Eres Sofía, asesora de moda chilena. Estás mirando este producto:`,
      `Nombre: ${name}`,
      category ? `Categoría: ${category}` : '',
      description ? `Descripción: ${description.slice(0, 150)}` : '',
      ``,
      `Escribe UN comentario muy corto (máximo 12 palabras) sobre la prenda, como si le hablaras a una amiga.`,
      `Debe ser entusiasta, cercano y terminar con una pregunta corta tipo "¿no te parece?" o "¿lo notas?".`,
      `Solo devuelve el texto del comentario, sin comillas, sin explicaciones, sin JSON.`,
    ].filter(Boolean).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const comment = data.content?.[0]?.text?.trim() ?? null

    return NextResponse.json({ comment })
  } catch (err) {
    console.error('[sofia-comment]', err)
    return NextResponse.json({ comment: null }, { status: 500 })
  }
}
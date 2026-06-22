import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAdminLogin   = path === '/admin/login'
  const isAdminPage    = path.startsWith('/admin/productos')
  const isPerfilPage   = path === '/cuenta/perfil'
  const isCuentaLogin  = path === '/cuenta/login'
  const isCuentaReg    = path === '/cuenta/registro'

  // Admin: sin sesión → redirige a login admin
  if (!user && isAdminPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Admin: con sesión en login → redirige al panel
  if (user && isAdminLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/productos'
    return NextResponse.redirect(url)
  }

  // Cuenta: perfil requiere sesión de comprador
  if (!user && isPerfilPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/cuenta/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/login',
    '/admin/productos/:path*',
    '/cuenta/login',
    '/cuenta/registro',
    '/cuenta/perfil',
  ],
}
import { cookies } from 'next/headers'

// Credenciales — mover a env vars en producción
const ADMIN_USER = process.env.ADMIN_USER || 'verdura'
const ADMIN_PASS = process.env.ADMIN_PASS || 'verdura2026'
const SESSION_TOKEN = 'verdura-admin-session'

// POST /api/admin/auth — login
export async function POST(request) {
  const body = await request.json()
  const { username, password } = body

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Token simple basado en timestamp + secret
    const token = Buffer.from(`${ADMIN_USER}:${Date.now()}`).toString('base64')
    const cookieStore = await cookies()
    cookieStore.set(SESSION_TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })
    return Response.json({ ok: true })
  }

  return Response.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 })
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_TOKEN)
  return Response.json({ ok: true })
}

// GET /api/admin/auth — verificar sesión
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_TOKEN)
  if (token?.value) {
    return Response.json({ authenticated: true })
  }
  return Response.json({ authenticated: false }, { status: 401 })
}

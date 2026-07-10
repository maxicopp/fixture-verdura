import { cookies, headers } from 'next/headers'
import {
  generateToken,
  verifyToken,
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
} from '../../../lib/auth'
import { NextRequest } from 'next/server'

const SESSION_TOKEN = 'verdura-admin-session'

const ADMIN_USER = process.env.ADMIN_USER
const ADMIN_PASS = process.env.ADMIN_PASS

// POST /api/admin/auth — login
export async function POST(request: NextRequest) {
  if (!ADMIN_USER || !ADMIN_PASS) {
    console.error('❌ ADMIN_USER y ADMIN_PASS no configurados en variables de entorno')
    return Response.json({ ok: false, error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(ip)) {
    return Response.json(
      { ok: false, error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { username, password } = body

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = generateToken(ADMIN_USER)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    clearAttempts(ip)
    return Response.json({ ok: true })
  }

  recordFailedAttempt(ip)
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
  const token = cookieStore.get(SESSION_TOKEN)?.value

  if (verifyToken(token)) {
    return Response.json({ authenticated: true })
  }
  return Response.json({ authenticated: false }, { status: 401 })
}

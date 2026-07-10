import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_TOKEN = 'verdura-admin-session'
const TOKEN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASS

// Rate limiting en memoria (se resetea con cada deploy, suficiente para protección básica)
const loginAttempts = new Map() // ip/key -> { count, lastAttempt }
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

/**
 * Genera un token firmado con HMAC-SHA256
 */
export function generateToken(username) {
  if (!TOKEN_SECRET) {
    throw new Error('ADMIN_PASS o ADMIN_SECRET no configurado en variables de entorno')
  }
  const payload = `${username}:${Date.now()}`
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64')}.${signature}`
}

/**
 * Verifica que un token sea válido (firmado correctamente y no expirado)
 */
export function verifyToken(token) {
  if (!token || !TOKEN_SECRET) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [payloadB64, signature] = parts

  // Verificar firma
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(Buffer.from(payloadB64, 'base64').toString())
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
    return false
  }

  // Verificar expiración (8 horas)
  try {
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const timestamp = parseInt(payload.split(':')[1], 10)
    const maxAge = 8 * 60 * 60 * 1000 // 8 horas en ms
    if (Date.now() - timestamp > maxAge) return false
  } catch {
    return false
  }

  return true
}

/**
 * Verifica si el request actual está autenticado
 */
export async function isAuthed() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_TOKEN)?.value
  return verifyToken(token)
}

/**
 * Middleware: retorna Response 401 si no está autenticado, o null si OK
 */
export async function requireAuth() {
  if (!(await isAuthed())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

/**
 * Rate limiting para login. Retorna true si debe bloquearse.
 */
export function isRateLimited(identifier) {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  if (!record) return false

  // Limpiar si pasó la ventana
  if (now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.delete(identifier)
    return false
  }

  return record.count >= MAX_ATTEMPTS
}

/**
 * Registrar un intento de login fallido
 */
export function recordFailedAttempt(identifier) {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  if (!record || now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now })
  } else {
    record.count++
    record.lastAttempt = now
  }
}

/**
 * Limpiar intentos tras login exitoso
 */
export function clearAttempts(identifier) {
  loginAttempts.delete(identifier)
}

/**
 * Validar que un valor sea un entero >= 0
 */
export function isValidGoals(value) {
  if (value == null) return false
  const num = Number(value)
  return Number.isInteger(num) && num >= 0 && num <= 99
}

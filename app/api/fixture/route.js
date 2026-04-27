import { promises as fs } from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'public', 'data.json')

export async function GET() {
  const raw = await fs.readFile(DATA_PATH, 'utf-8')
  return Response.json(JSON.parse(raw))
}

export async function POST(request) {
  const body = await request.json()
  await fs.writeFile(DATA_PATH, JSON.stringify(body, null, 2), 'utf-8')
  return Response.json({ ok: true })
}

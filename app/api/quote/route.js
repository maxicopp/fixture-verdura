import frases from '../../../public/frases.json'

export async function GET() {
  const frase = frases[Math.floor(Math.random() * frases.length)]
  return Response.json({ text: frase.text, author: frase.author })
}

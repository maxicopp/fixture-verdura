import frases from '../../../public/frases.json'

interface Frase {
  text: string
  author: string
}

export async function GET() {
  const frase = (frases as Frase[])[Math.floor(Math.random() * frases.length)]
  return Response.json({ text: frase.text, author: frase.author })
}

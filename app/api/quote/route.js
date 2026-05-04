export async function GET() {
  try {
    // 1. Obtener frase random de dummyjson
    const quoteRes = await fetch('https://dummyjson.com/quotes/random', {
      cache: 'no-store',
    })
    if (!quoteRes.ok) throw new Error('dummyjson error')
    const { quote, author } = await quoteRes.json()

    // 2. Traducir al español con MyMemory
    const translateRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(quote)}&langpair=en|es`,
      { cache: 'no-store' }
    )
    if (!translateRes.ok) throw new Error('MyMemory error')
    const translateData = await translateRes.json()
    const translated = translateData.responseData?.translatedText || quote

    return Response.json({ text: translated, author })
  } catch {
    return Response.json(
      { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' },
      { status: 200 }
    )
  }
}

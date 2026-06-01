import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: '⚽ Torneo Copa Verdura Apertura 2026',
  description: 'Fixture y posiciones del torneo',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

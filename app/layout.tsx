import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import ThemeToggle from './components/ThemeToggle'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '⚽ Torneo Copa Verdura',
  description: 'Fixture, posiciones y estadísticas del torneo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeToggle />
        {children}
        <Analytics />
      </body>
    </html>
  )
}

import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import ThemeToggle from './components/ThemeToggle'

export const metadata = {
  title: '⚽ Torneo Copa Verdura',
  description: 'Fixture, posiciones y estadísticas del torneo',
}

export default function RootLayout({ children }) {
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

import { Suspense } from 'react'
import TorneoApp from './components/TorneoApp'

function AppSkeleton() {
  return (
    <div className="app sk-app" aria-busy="true">
      <div className="sk-header">
        <span className="sk sk-rounded" style={{ height: 28, width: 240, display: 'inline-block' }} />
        <span className="sk sk-rounded" style={{ height: 14, width: 200, display: 'inline-block' }} />
        <span className="sk sk-rounded" style={{ height: 8, width: '60%', maxWidth: 360, display: 'inline-block' }} />
      </div>
      <div className="sk-nav">
        {[120, 80, 100, 80].map((w, i) => (
          <span key={i} className="sk sk-nav-btn" style={{ width: w }} />
        ))}
      </div>
      <div className="sk-content">
        <div className="sk-standings-table" style={{ padding: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sk-player-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="sk sk-circle" style={{ width: 32, height: 32, display: 'inline-block' }} />
              <span className="sk sk-rounded" style={{ height: 12, width: `${60 + i * 8}px`, display: 'inline-block' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <TorneoApp />
    </Suspense>
  )
}

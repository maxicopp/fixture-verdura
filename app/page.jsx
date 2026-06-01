import { Suspense } from 'react'
import TorneoApp from './components/TorneoApp'

export default function Home() {
  return (
    <Suspense fallback={<div className="app"><div className="loading">Cargando torneo...</div></div>}>
      <TorneoApp />
    </Suspense>
  )
}

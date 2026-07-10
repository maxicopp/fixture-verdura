import { NextRequest } from 'next/server'
import { dbAll, initSchema } from '../../lib/db'

// GET /api/head-to-head?p1=Max&p2=Gayco
export async function GET(request: NextRequest) {
  await initSchema()
  const { searchParams } = new URL(request.url)
  const p1 = searchParams.get('p1')
  const p2 = searchParams.get('p2')

  if (!p1 || !p2) {
    return Response.json({ error: 'Se requieren p1 y p2' }, { status: 400 })
  }

  const matches = await dbAll(`
    SELECT m.home, m.away, m.home_goals, m.away_goals, m.round, m.stage,
           t.id as tournament_id, t.season, t.year, t.name as tournament_name, t.type as tournament_type
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.played = 1
      AND ((m.home = ? AND m.away = ?) OR (m.home = ? AND m.away = ?))
    ORDER BY t.year DESC, t.id DESC, m.round DESC
  `, [p1, p2, p2, p1])

  let p1Wins = 0, p2Wins = 0, draws = 0, p1Goals = 0, p2Goals = 0

  const matchList = matches.map(m => {
    const p1IsHome = m.home === p1
    const p1G = p1IsHome ? m.home_goals as number : m.away_goals as number
    const p2G = p1IsHome ? m.away_goals as number : m.home_goals as number

    p1Goals += p1G
    p2Goals += p2G
    if (p1G > p2G) p1Wins++
    else if (p2G > p1G) p2Wins++
    else draws++

    const tournamentLabel = m.tournament_type === 'league'
      ? m.season as string
      : `${m.tournament_name} ${m.season}`

    return {
      tournament: tournamentLabel,
      tournamentId: m.tournament_id,
      tournamentType: m.tournament_type,
      round: m.round,
      stage: m.stage,
      p1Goals: p1G,
      p2Goals: p2G,
      p1IsHome,
    }
  })

  return Response.json({ p1, p2, total: matches.length, p1Wins, p2Wins, draws, p1Goals, p2Goals, matches: matchList })
}

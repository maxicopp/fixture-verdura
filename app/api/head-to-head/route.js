import { dbAll, initSchema } from '../../lib/db'

// GET /api/head-to-head?p1=Max&p2=Gayco
export async function GET(request) {
  await initSchema()
  const { searchParams } = new URL(request.url)
  const p1 = searchParams.get('p1')
  const p2 = searchParams.get('p2')

  if (!p1 || !p2) {
    return Response.json({ error: 'Se requieren p1 y p2' }, { status: 400 })
  }

  const matches = await dbAll(`
    SELECT m.home, m.away, m.home_goals, m.away_goals, m.round,
           t.id as tournament_id, t.season, t.year, t.name as tournament_name
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.played = 1
      AND ((m.home = ? AND m.away = ?) OR (m.home = ? AND m.away = ?))
    ORDER BY t.year ASC, t.id ASC, m.round ASC
  `, [p1, p2, p2, p1])

  let p1Wins = 0, p2Wins = 0, draws = 0, p1Goals = 0, p2Goals = 0

  const matchList = matches.map(m => {
    const p1IsHome = m.home === p1
    const p1G = p1IsHome ? m.home_goals : m.away_goals
    const p2G = p1IsHome ? m.away_goals : m.home_goals

    p1Goals += p1G
    p2Goals += p2G
    if (p1G > p2G) p1Wins++
    else if (p2G > p1G) p2Wins++
    else draws++

    return {
      tournament: `${m.season} ${m.year}`,
      tournamentId: m.tournament_id,
      round: m.round,
      p1Goals: p1G,
      p2Goals: p2G,
      p1IsHome,
    }
  })

  return Response.json({ p1, p2, total: matches.length, p1Wins, p2Wins, draws, p1Goals, p2Goals, matches: matchList })
}

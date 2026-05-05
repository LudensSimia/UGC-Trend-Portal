import { NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/serverAuth'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

const supabase = createSupabaseServerClient()

function getPlaceId(url: string) {
  const match = url.match(/games\/(\d+)/)
  return match ? match[1] : null
}

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req)
  if (unauthorized) return unauthorized

  const { data: games, error } = await supabase.from('games').select('*')

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  for (const game of games) {
    if (game.platform !== 'roblox') continue

    const placeId = getPlaceId(game.url)
    if (!placeId) continue

    try {
      const universeRes = await fetch(
        `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
      )
      const universeData = await universeRes.json()
      const universeId = universeData.universeId

      const gameRes = await fetch(
        `https://games.roblox.com/v1/games?universeIds=${universeId}`
      )
      const gameData = await gameRes.json()

      const g = gameData.data?.[0]

      if (!g) continue

      await supabase.from('game_metrics').insert({
        game_id: game.id,
        date: new Date().toISOString().split('T')[0],
        current_players: g.playing,
        visits: g.visits,
        favorites: g.favoritedCount
      })
    } catch (err) {
      console.error('Error updating game:', game.title, err)
    }
  }

  return NextResponse.json({ success: true })
}

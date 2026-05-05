import { NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/serverAuth'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

const supabase = createSupabaseServerClient()

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req)
  if (unauthorized) return unauthorized

  try {
    const chartRes = await fetch(
      'https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId=11111111-1111-1111-1111-111111111111&sortId=top-trending&device=computer&country=us'
    )

    const chartData = await chartRes.json()

    if (!chartData.games || chartData.games.length === 0) {
      return NextResponse.json(
        { error: 'No games returned from Roblox chart API', raw: chartData },
        { status: 500 }
      )
    }

    const chartGames = chartData.games
    const universeIds = chartGames.map((game: any) => game.universeId)

    const detailsRes = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`
    )

    const detailsData = await detailsRes.json()
    const detailedGames = detailsData.data || []

    const thumbnailsRes = await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=512x512&format=Png&isCircular=false`
    )

    const thumbnailsData = await thumbnailsRes.json()
    const thumbnails = thumbnailsData.data || []

    let imported = 0

    for (let i = 0; i < chartGames.length; i++) {
      const chartGame = chartGames[i]

      const detailedGame = detailedGames.find(
        (game: any) => String(game.id) === String(chartGame.universeId)
      )

      const thumbnail = thumbnails.find(
        (item: any) => String(item.targetId) === String(chartGame.universeId)
      )

      const upVotes = chartGame.totalUpVotes ?? detailedGame?.upVotes ?? null
      const downVotes = chartGame.totalDownVotes ?? detailedGame?.downVotes ?? null

      const likeRatio =
        upVotes !== null && downVotes !== null && upVotes + downVotes > 0
          ? upVotes / (upVotes + downVotes)
          : null

      const { data: savedGame, error: gameError } = await supabase
        .from('games')
        .upsert(
          {
            platform: 'roblox',
            title: chartGame.name,
            url: `https://www.roblox.com/games/${chartGame.rootPlaceId}`,
            source: 'roblox_top_trending',
            chart_rank: i + 1,
            roblox_universe_id: String(chartGame.universeId),
            roblox_place_id: String(chartGame.rootPlaceId),
            creator: detailedGame?.creator?.name ?? null,
            description: detailedGame?.description ?? null,
            genre: detailedGame?.genre ?? null,
            max_players: detailedGame?.maxPlayers ?? null,
            created_roblox_at: detailedGame?.created ?? null,
            updated_roblox_at: detailedGame?.updated ?? null,
            thumbnail_url: thumbnail?.imageUrl ?? null,
            raw_top_trending: chartGame,
            raw_game_details: detailedGame ?? null
          },
          {
            onConflict: 'roblox_universe_id'
          }
        )
        .select()
        .single()

      if (gameError || !savedGame) {
        console.error('Game save error:', gameError)
        continue
      }

      const { error: metricsError } = await supabase
        .from('game_metrics')
        .insert({
          game_id: savedGame.id,
          date: new Date().toISOString().split('T')[0],
          chart_rank: i + 1,
          source: 'roblox_top_trending',
          current_players: chartGame.playerCount,
          visits: detailedGame?.visits ?? null,
          favorites: detailedGame?.favoritedCount ?? null,
          up_votes: upVotes,
          down_votes: downVotes,
          like_ratio: likeRatio,
          raw_metric_snapshot: {
            chartGame,
            detailedGame: detailedGame ?? null,
            thumbnail: thumbnail ?? null
          }
        })

      if (metricsError) {
        console.error('Metric save error:', metricsError)
        continue
      }

      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      totalReturnedByRoblox: chartGames.length
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

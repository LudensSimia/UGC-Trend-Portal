import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SESSION_ID = '11111111-1111-1111-1111-111111111111'
const DEVICE = 'computer'
const COUNTRY = 'us'

export async function GET() {
  try {
    const sortsRes = await fetch(
      `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${SESSION_ID}&device=${DEVICE}&country=${COUNTRY}`
    )

    const sortsData = await sortsRes.json()
    const sorts = sortsData.sorts || []

    let totalImported = 0

    for (const sort of sorts) {
      if (sort.contentType !== 'Games') continue
      if (!sort.sortId) continue

      const sortId = sort.sortId
      const sortName = sort.sortDisplayName

      const contentRes = await fetch(
        `https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId=${SESSION_ID}&sortId=${sortId}&device=${DEVICE}&country=${COUNTRY}`
      )

      const contentData = await contentRes.json()
      const games = contentData.games || []

      if (games.length === 0) continue

      const universeIds = games.map((game: any) => game.universeId)

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

      for (let i = 0; i < games.length; i++) {
        const chartGame = games[i]

        const detailedGame = detailedGames.find(
          (game: any) => String(game.id) === String(chartGame.universeId)
        )

        const thumbnail = thumbnails.find(
          (item: any) => String(item.targetId) === String(chartGame.universeId)
        )

        const upVotes = chartGame.totalUpVotes ?? null
        const downVotes = chartGame.totalDownVotes ?? null

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
            { onConflict: 'roblox_universe_id' }
          )
          .select()
          .single()

        if (gameError || !savedGame) {
          console.error('Game save error:', gameError)
          continue
        }

        const { error: snapshotError } = await supabase
          .from('roblox_chart_snapshots')
          .insert({
            sort_id: sortId,
            sort_name: sortName,
            chart_rank: i + 1,
            universe_id: String(chartGame.universeId),
            root_place_id: String(chartGame.rootPlaceId),
            game_id: savedGame.id,
            current_players: chartGame.playerCount,
            up_votes: upVotes,
            down_votes: downVotes,
            like_ratio: likeRatio,
            raw_chart_item: chartGame,
            raw_game_details: detailedGame ?? null,
            raw_thumbnail: thumbnail ?? null
          })

        if (snapshotError) {
          console.error('Snapshot error:', snapshotError)
          continue
        }

        totalImported++
      }
    }

    return NextResponse.json({
      success: true,
      totalImported
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

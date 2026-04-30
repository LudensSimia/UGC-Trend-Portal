import { NextResponse } from 'next/server'

function getPlaceId(url: string) {
  const match = url.match(/games\/(\d+)/)
  return match ? match[1] : null
}

export async function POST(req: Request) {
  const { url } = await req.json()

  const placeId = getPlaceId(url)

  if (!placeId) {
    return NextResponse.json({ error: 'Invalid Roblox URL' }, { status: 400 })
  }

  const universeRes = await fetch(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
  )

  const universeData = await universeRes.json()
  const universeId = universeData.universeId

  const gameRes = await fetch(
    `https://games.roblox.com/v1/games?universeIds=${universeId}`
  )

  const gameData = await gameRes.json()

  return NextResponse.json({
    placeId,
    universeId,
    game: gameData.data?.[0]
  })
}
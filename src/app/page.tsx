'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const loadGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        title,
        platform,
        url,
        created_at,
        game_metrics (
          date,
          current_players,
          visits,
          favorites
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    const formattedGames = data.map((game: any) => {
      const latestMetric = game.game_metrics?.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]

      return {
        ...game,
        latestMetric
      }
    })

    setGames(formattedGames)
  }

  useEffect(() => {
    loadGames()
  }, [])

  const refreshMetrics = async (game: any) => {
    setLoadingId(game.id)

    const res = await fetch('/api/roblox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: game.url })
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(data)
      setLoadingId(null)
      return
    }

    const { error } = await supabase.from('game_metrics').insert({
      game_id: game.id,
      date: new Date().toISOString().split('T')[0],
      current_players: data.game.playing,
      visits: data.game.visits,
      favorites: data.game.favoritedCount
    })

    if (error) {
      console.error(error)
    }

    await loadGames()
    setLoadingId(null)
  }

  return (
    <main style={{ padding: 32, maxWidth: 900 }}>
      <h1>UGC Trend Portal</h1>

      <h2>Tracked Games</h2>

      {games.map((game) => (
        <div
          key={game.id}
          style={{
            border: '1px solid #ddd',
            padding: 16,
            marginBottom: 16,
            borderRadius: 8
          }}
        >
          <h3>{game.title}</h3>

          <p>
            <strong>Platform:</strong> {game.platform}
          </p>

          <p>
            <strong>Current Players:</strong>{' '}
            {game.latestMetric?.current_players?.toLocaleString() || 'No data'}
          </p>

          <p>
            <strong>Visits:</strong>{' '}
            {game.latestMetric?.visits?.toLocaleString() || 'No data'}
          </p>

          <p>
            <strong>Favorites:</strong>{' '}
            {game.latestMetric?.favorites?.toLocaleString() || 'No data'}
          </p>

          <p>
            <strong>Last Updated:</strong>{' '}
            {game.latestMetric?.date || 'No metrics yet'}
          </p>
{game.game_metrics && game.game_metrics.length > 0 && (
  <div style={{ width: '100%', height: 250, marginTop: 20 }}>
    <h4>Current Players Over Time</h4>

    <ResponsiveContainer>
      <LineChart
        data={[...game.game_metrics].sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )}
      >
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="current_players"
          stroke="#0070f3"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}

         <button
  onClick={() => refreshMetrics(game)}
  disabled={loadingId === game.id}
  style={{
    marginTop: 12,
    padding: '10px 16px',
    backgroundColor: loadingId === game.id ? '#aaa' : '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600
  }}
>
  {loadingId === game.id ? 'Refreshing...' : '🔄 Refresh Metrics'}
</button>

          <br />

          <a href={game.url} target="_blank">
            Open game
          </a>
        </div>
      ))}
    </main>
  )
}
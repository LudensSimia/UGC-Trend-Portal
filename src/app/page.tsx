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
        chart_rank,
        source,
        game_metrics (
          date,
          current_players,
          visits,
          favorites
        )
      `)
      .eq('source', 'roblox_top_trending')
      .order('chart_rank', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    const formattedGames = data.map((game: any) => {
      const sortedMetrics = [...(game.game_metrics || [])].sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const latestMetric = sortedMetrics[sortedMetrics.length - 1]

      return {
        ...game,
        game_metrics: sortedMetrics,
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
    <main style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>🔥 Top 25 Roblox Trending</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Ranked from Roblox Top Trending and tracked over time by current players.
      </p>

      {games.map((game) => (
        <div
          key={game.id}
          style={{
            border: '1px solid #ddd',
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <h2 style={{ marginBottom: 8 }}>
            #{game.chart_rank} — {game.title}
          </h2>

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
            <div style={{ width: '100%', height: 260, marginTop: 24 }}>
              <h3>Current Players Over Time</h3>

              <ResponsiveContainer>
                <LineChart data={game.game_metrics}>
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
              marginTop: 16,
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

          <a
            href={game.url}
            target="_blank"
            style={{
              display: 'inline-block',
              marginTop: 12
            }}
          >
            Open game
          </a>
        </div>
      ))}
    </main>
  )
}
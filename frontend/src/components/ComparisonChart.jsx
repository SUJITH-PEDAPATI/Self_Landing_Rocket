/**
 * ComparisonChart.jsx
 * Reads from the /api/results/* endpoints served by FastAPI.
 * Data source: results/episode_results.csv and model_comparison_summary.csv
 * These are the actual CSV files produced by src/compare_models.py.
 */

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts'

const API = 'http://localhost:8000'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(4,6,13,0.92)',
      border: '1px solid rgba(56,190,255,0.3)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</b>
        </p>
      ))}
    </div>
  )
}

export default function ComparisonChart() {
  const [summary, setSummary] = useState([])
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/results/summary`).then(r => r.json()),
      fetch(`${API}/api/results/episodes`).then(r => r.json()),
    ])
      .then(([s, e]) => {
        setSummary(s.rows.map(r => ({
          model:        r.model === 'Baseline_PPO' ? 'Baseline' : 'Shaped',
          mean_reward:  parseFloat(r.mean_reward),
          std_reward:   parseFloat(r.std_reward),
          success_rate: parseFloat(r.success_rate) * 100,
          episodes:     parseInt(r.episodes),
        })))
        setEpisodes(e.rows.map(r => ({
          ep:     parseInt(r.episode),
          model:  r.model,
          reward: parseFloat(r.reward),
          landed: r.stable_touchdown === 'True',
        })))
        setLoading(false)
      })
      .catch(() => { setError('Backend offline — run the server first.'); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ padding: 'var(--s5)', color: 'var(--text-muted)', fontSize: 12 }}>
      Loading comparison data…
    </div>
  )

  if (error) return (
    <div style={{ padding: 'var(--s5)', color: 'var(--text-muted)', fontSize: 12 }}>{error}</div>
  )

  if (!summary.length) return (
    <div style={{ padding: 'var(--s5)', color: 'var(--text-muted)', fontSize: 12 }}>
      No results yet — run <code style={{ color: 'var(--cyan)' }}>python -m src.compare_models</code>
    </div>
  )

  // Episode rewards by model for the line chart
  const baseline = episodes.filter(e => e.model === 'Baseline_PPO')
  const shaped   = episodes.filter(e => e.model === 'Reward_Shaped_PPO')
  const lineData = Array.from({ length: Math.max(baseline.length, shaped.length) }, (_, i) => ({
    ep:       i + 1,
    Baseline: baseline[i]?.reward ?? null,
    Shaped:   shaped[i]?.reward ?? null,
  }))

  return (
    <div style={{ padding: 'var(--s4) var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div className="panel-title" style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.14em' }}>
        MODEL COMPARISON — {summary[0]?.episodes} EPISODES EACH
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
        {summary.map(s => (
          <div key={s.model} className="panel">
            <div className="panel-title">{s.model}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: s.model === 'Shaped' ? 'var(--cyan)' : 'var(--text-primary)', margin: '4px 0 2px' }}>
              {s.mean_reward.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
              mean reward
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>σ {s.std_reward.toFixed(1)}</span>
              <span style={{ color: s.success_rate >= 80 ? 'var(--accent)' : 'var(--warn)' }}>
                {s.success_rate.toFixed(0)}% landed
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart — mean reward */}
      <div className="panel">
        <div className="panel-title">Mean Reward Comparison</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={summary} barSize={36} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,190,255,0.08)" />
            <XAxis dataKey="model" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="mean_reward" name="Mean Reward" fill="#3d6fff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart — per-episode rewards */}
      <div className="panel">
        <div className="panel-title">Episode Rewards</div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={lineData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,190,255,0.08)" />
            <XAxis dataKey="ep" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            <ReferenceLine y={200} stroke="rgba(56,190,255,0.15)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Baseline" stroke="#3d6fff" strokeWidth={2} dot={{ r: 3, fill: '#3d6fff' }} connectNulls />
            <Line type="monotone" dataKey="Shaped"   stroke="#38beff" strokeWidth={2} dot={{ r: 3, fill: '#38beff' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Success rate bar */}
      <div className="panel">
        <div className="panel-title">Stable Touchdown Rate</div>
        {summary.map(s => (
          <div key={s.model} style={{ marginBottom: 'var(--s3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{s.model}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: s.success_rate >= 80 ? 'var(--accent)' : 'var(--warn)' }}>
                {s.success_rate.toFixed(0)}%
              </span>
            </div>
            <div className="reward-bar-wrap" style={{ height: 8 }}>
              <div
                className="reward-bar-fill"
                style={{
                  width: `${s.success_rate}%`,
                  background: s.model === 'Shaped' ? 'linear-gradient(90deg,#00b47c,#00e5a0)' : 'linear-gradient(90deg,#1a4fff,#38beff)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

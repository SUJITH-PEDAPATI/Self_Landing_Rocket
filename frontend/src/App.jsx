
import { useState, Suspense, lazy } from 'react'
import { useSimulation } from './hooks/useSimulation'
import ControlPanel from './components/ControlPanel'
import TelemetryPanel from './components/TelemetryPanel'

// Lazy-load heavy 3D scene so the app shell renders immediately
const LunarScene = lazy(() => import('./components/LunarScene'))
const ComparisonChart = lazy(() => import('./components/ComparisonChart'))

// Status label map
const STATUS_LABEL = {
  idle:       'Standby',
  connecting: 'Connecting…',
  running:    'Simulation Running',
  done:       'Mission Complete',
  error:      'Connection Error',
}

export default function App() {
  const [selectedModel, setSelectedModel] = useState('PPO_LandLunar_v3')
  const [episodes, setEpisodes]           = useState(3)
  const [showComparison, setShowComparison] = useState(false)

  const { status, telemetry, episodeHistory, trailRef, start, stop } = useSimulation()

  const isRunning = status === 'running' || status === 'connecting'

  const handleStart = () => start(selectedModel, episodes)

  return (
    <div className="app-shell">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-brand">
          <span className="icon">🚀</span>
          Rocket Landing AI
          <span className="tag">PPO · LunarLander-v3</span>
        </div>

        <div className="header-status">
          <button
            id="btn-toggle-comparison"
            onClick={() => setShowComparison(s => !s)}
            style={{
              background: showComparison ? 'rgba(56,190,255,0.12)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: showComparison ? 'var(--cyan)' : 'var(--text-secondary)',
              padding: '3px 10px',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              transition: 'all 0.18s',
            }}
          >
            {showComparison ? '▲ Hide Comparison' : '▼ Model Comparison'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`status-dot ${status}`} />
            <span>{STATUS_LABEL[status] ?? status}</span>
          </div>
        </div>
      </header>

      {/* ── Left sidebar ────────────────────────────────────────────── */}
      <ControlPanel
        status={status}
        selectedModel={selectedModel}
        episodes={episodes}
        onModelChange={setSelectedModel}
        onEpisodeChange={setEpisodes}
        onStart={handleStart}
        onStop={stop}
        episodeHistory={episodeHistory}
      />

      {/* ── 3-D scene ───────────────────────────────────────────────── */}
      <main className="scene-area">
        <Suspense fallback={
          <div className="idle-overlay">
            <div className="idle-icon">🌑</div>
            <p>Loading 3D scene…</p>
          </div>
        }>
          <LunarScene
            telemetry={telemetry}
            trailRef={trailRef}
            isRunning={isRunning}
          />
        </Suspense>

        {/* HUD overlay chips */}
        {isRunning && (
          <div className="scene-overlay">
            <div className="hud-chip">
              EP <b>{telemetry.episode}</b>
            </div>
            <div className="hud-chip">
              ALT <b>{telemetry.y !== null ? telemetry.y.toFixed(2) : '—'}</b>
            </div>
            <div className="hud-chip">
              RWD <b>{telemetry.totalReward !== null ? telemetry.totalReward.toFixed(0) : '—'}</b>
            </div>
          </div>
        )}

        {/* Idle prompt */}
        {status === 'idle' && telemetry.x === null && (
          <div className="idle-overlay">
            <div className="idle-icon">🌑</div>
            <p>Select a model and press Launch Simulation</p>
          </div>
        )}

        {/* Comparison chart overlay */}
        {showComparison && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '55%',
            background: 'rgba(4,6,13,0.92)',
            borderTop: '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
            overflowY: 'auto',
          }}>
            <Suspense fallback={<div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading charts…</div>}>
              <ComparisonChart />
            </Suspense>
          </div>
        )}
      </main>

      {/* ── Right telemetry panel ────────────────────────────────────── */}
      <TelemetryPanel telemetry={telemetry} status={status} />
    </div>
  )
}

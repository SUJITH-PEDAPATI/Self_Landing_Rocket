
const MODELS = [
  {
    id: 'PPO_LandLunar_v3',
    label: 'Baseline PPO',
    sub: 'No reward shaping · wind off',
  },
  {
    id: 'PPO_time_penalty',
    label: 'Reward-Shaped PPO',
    sub: 'Time penalty wrapper · wind off',
  },
]

export default function ControlPanel({ status, selectedModel, episodes, onModelChange, onEpisodeChange, onStart, onStop, episodeHistory }) {
  const isRunning = status === 'running' || status === 'connecting'

  return (
    <div className="sidebar scroll">
      {/* Model selection */}
      <div className="panel">
        <div className="panel-title">Agent Model</div>
        {MODELS.map(m => (
          <label key={m.id} className={`model-option ${selectedModel === m.id ? 'selected' : ''}`}>
            <input
              type="radio"
              name="model"
              value={m.id}
              checked={selectedModel === m.id}
              onChange={() => onModelChange(m.id)}
              disabled={isRunning}
            />
            <div>
              <div className="model-option-label">{m.label}</div>
              <div className="model-option-sub">{m.sub}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Episode count */}
      <div className="panel">
        <div className="panel-title">Simulation Config</div>
        <div className="field-row">
          <span className="field-label">Episodes</span>
          <input
            id="episode-count"
            type="number"
            min={1}
            max={20}
            value={episodes}
            onChange={e => onEpisodeChange(Number(e.target.value))}
            disabled={isRunning}
            className="field-input"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="panel">
        <div className="panel-title">Controls</div>
        {!isRunning ? (
          <button
            id="btn-start-sim"
            className="btn btn-primary"
            onClick={onStart}
            disabled={status === 'connecting'}
          >
            ▶ Launch Simulation
          </button>
        ) : (
          <button id="btn-stop-sim" className="btn btn-danger" onClick={onStop}>
            ■ Stop
          </button>
        )}
        {status === 'done' && (
          <p style={{ marginTop: 'var(--s3)', fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>
            ✓ Simulation complete
          </p>
        )}
        {status === 'error' && (
          <p style={{ marginTop: 'var(--s3)', fontSize: 12, color: 'var(--danger)', textAlign: 'center' }}>
            ✗ Connection error — is the backend running?
          </p>
        )}
      </div>

      {/* Episode history */}
      {episodeHistory.length > 0 && (
        <div className="panel">
          <div className="panel-title">Episode Log</div>
          <div className="ep-list">
            {[...episodeHistory].reverse().map(ep => (
              <div key={ep.episode} className={`ep-row ${ep.stableTouchdown ? 'landed' : 'crashed'}`}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>EP {ep.episode}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {ep.totalReward.toFixed(0)}
                </span>
                <span className={`ep-badge ${ep.stableTouchdown ? 'landed' : 'crashed'}`}>
                  {ep.stableTouchdown ? '✓ LND' : '✗ FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


const ACTION_LABELS = ['IDLE', 'L-ENG', 'MAIN', 'R-ENG']
const ACTION_CLASSES = ['', 'active', 'main active', 'active']

function Gauge({ label, value, unit = '', digits = 3 }) {
  const v = value === null || value === undefined ? '---' : value.toFixed(digits)
  const isPos = value !== null && value > 0
  const isNeg = value !== null && value < 0
  return (
    <div className={`telem-cell ${isPos ? 'positive' : ''} ${isNeg ? 'negative' : ''}`}>
      <div className="tc-label">{label}</div>
      <div className="tc-value">{v}{value !== null && unit}</div>
    </div>
  )
}

export default function TelemetryPanel({ telemetry, status }) {
  const {
    x, y, vx, vy, angle, angularV,
    legLeft, legRight, action,
    totalReward, episode, step,
  } = telemetry

  const angleDeg = angle !== null ? (angle * 180 / Math.PI) : null
  const rewardBarW = Math.min(100, Math.max(0, ((totalReward + 100) / 400) * 100))

  return (
    <div className="telemetry-col scroll">
      {/* Header */}
      <div className="panel">
        <div className="panel-title">Mission Status</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Episode</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {episode || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Step</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {step || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Episode Reward</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            color: totalReward > 100 ? 'var(--accent)' : totalReward < 0 ? 'var(--danger)' : 'var(--text-primary)'
          }}>
            {totalReward !== null ? totalReward.toFixed(1) : '—'}
          </span>
        </div>
        <div className="reward-bar-wrap">
          <div className="reward-bar-fill" style={{ width: `${rewardBarW}%` }} />
        </div>
      </div>

      {/* Position & velocity */}
      <div className="panel">
        <div className="panel-title">Position</div>
        <div className="telem-grid">
          <Gauge label="X POS" value={x} digits={3} />
          <Gauge label="ALTITUDE" value={y} digits={3} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Velocity</div>
        <div className="telem-grid">
          <Gauge label="V HORIZ" value={vx} digits={3} />
          <Gauge label="V VERT"  value={vy} digits={3} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Orientation</div>
        <div className="telem-grid">
          <Gauge label="ANGLE °"   value={angleDeg} digits={1} />
          <Gauge label="ANG VEL"  value={angularV}  digits={3} />
        </div>
      </div>

      {/* Leg contact */}
      <div className="panel">
        <div className="panel-title">Leg Contact</div>
        <div className="leg-row">
          <div className={`leg-indicator ${legLeft ? 'contact' : ''}`}>
            {legLeft ? '● LEFT' : '○ LEFT'}
          </div>
          <div className={`leg-indicator ${legRight ? 'contact' : ''}`}>
            {legRight ? '● RIGHT' : '○ RIGHT'}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="panel">
        <div className="panel-title">Engine Command</div>
        <div className="action-display">
          {ACTION_LABELS.map((lbl, i) => (
            <div
              key={i}
              className={`action-btn ${i === 2 ? 'main' : ''} ${action === i ? ACTION_CLASSES[i] : ''}`}
            >
              {lbl}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

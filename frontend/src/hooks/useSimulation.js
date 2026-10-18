/**
 * useSimulation.js
 * ─────────────────
 * Custom hook that manages the WebSocket connection to the FastAPI backend.
 *
 * Message protocol (from server.py):
 *   Client → { model, episodes }
 *   Server → { type: "step" | "episode_end" | "done" | "error", ...fields }
 *
 * Observation layout (obs array, 8 values):
 *   [0] x           horizontal position
 *   [1] y           altitude
 *   [2] vx          horizontal velocity
 *   [3] vy          vertical velocity
 *   [4] angle       lander angle (radians)
 *   [5] angular_v   angular velocity
 *   [6] leg_left    left leg contact (0/1)
 *   [7] leg_right   right leg contact (0/1)
 */

import { useState, useRef, useCallback } from 'react'

const WS_URL = 'ws://localhost:8000/ws/simulate'

const INITIAL_TELEM = {
  x: null, y: null,
  vx: null, vy: null,
  angle: null, angularV: null,
  legLeft: false, legRight: false,
  action: null,
  reward: 0,
  totalReward: 0,
  episode: 0,
  step: 0,
}

export function useSimulation() {
  const [status, setStatus]           = useState('idle')   // idle|connecting|running|done|error
  const [telemetry, setTelemetry]     = useState(INITIAL_TELEM)
  const [episodeHistory, setEpisodeHistory] = useState([])
  const wsRef = useRef(null)
  const trailRef = useRef([])           // raw position history for 3-D trail

  const start = useCallback((model, episodes) => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    trailRef.current = []
    setEpisodeHistory([])
    setTelemetry(INITIAL_TELEM)
    setStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('running')
      ws.send(JSON.stringify({ model, episodes }))
    }

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data)

      if (msg.type === 'step') {
        const [x, y, vx, vy, angle, angularV, legL, legR] = msg.obs
        const telem = {
          x, y, vx, vy, angle, angularV,
          legLeft:  legL > 0.5,
          legRight: legR > 0.5,
          action:      msg.action,
          reward:      msg.reward,
          totalReward: msg.total_reward,
          episode:     msg.episode,
          step:        msg.step,
        }
        setTelemetry(telem)
        // keep last 120 positions for trail
        trailRef.current = [...trailRef.current.slice(-119), { x, y }]
      }

      if (msg.type === 'episode_end') {
        setEpisodeHistory(h => [...h, {
          episode:        msg.episode,
          totalReward:    msg.total_reward,
          steps:          msg.steps,
          stableTouchdown: msg.stable_touchdown,
        }])
      }

      if (msg.type === 'done')  setStatus('done')
      if (msg.type === 'error') setStatus('error')
    }

    ws.onerror  = () => setStatus('error')
    ws.onclose  = () => {
      wsRef.current = null
      setStatus(s => s === 'running' || s === 'connecting' ? 'idle' : s)
    }
  }, [])

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('idle')
  }, [])

  return { status, telemetry, episodeHistory, trailRef, start, stop }
}

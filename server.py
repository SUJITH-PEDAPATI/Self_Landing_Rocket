
import asyncio
import json
import os
from pathlib import Path

import gymnasium as gym
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from stable_baselines3 import PPO

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Rocket Landing AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
RESULTS_DIR = BASE_DIR / "results"

AVAILABLE_MODELS = {
    "PPO_LandLunar_v3": str(MODELS_DIR / "PPO_LandLunar_v3.zip"),
    "PPO_time_penalty": str(MODELS_DIR / "PPO_time_penalty.zip"),
}


# ── REST endpoints ────────────────────────────────────────────────────────────

@app.get("/api/models")
def list_models():
    """Return the list of available model identifiers."""
    return {
        "models": [
            {"id": k, "path": v, "available": os.path.exists(v)}
            for k, v in AVAILABLE_MODELS.items()
        ]
    }


@app.get("/api/results/episodes")
def get_episode_results():
    """Return episode_results.csv as JSON (if it exists)."""
    csv_path = RESULTS_DIR / "episode_results.csv"
    if not csv_path.exists():
        return {"rows": []}
    rows = []
    with open(csv_path, encoding="utf-8") as f:
        import csv
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return {"rows": rows}


@app.get("/api/results/summary")
def get_summary():
    """Return model_comparison_summary.csv as JSON (if it exists)."""
    csv_path = RESULTS_DIR / "model_comparison_summary.csv"
    if not csv_path.exists():
        return {"rows": []}
    rows = []
    with open(csv_path, encoding="utf-8") as f:
        import csv
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return {"rows": rows}


# ── WebSocket simulation endpoint ─────────────────────────────────────────────

def _make_env():
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=False,
        render_mode=None,
    )


@app.websocket("/ws/simulate")
async def simulate(websocket: WebSocket):
    await websocket.accept()
    env = None

    try:
        raw = await websocket.receive_text()
        config = json.loads(raw)
        model_id = config.get("model", "PPO_LandLunar_v3")
        num_episodes = int(config.get("episodes", 5))

        model_path = AVAILABLE_MODELS.get(model_id)
        if model_path is None or not os.path.exists(model_path):
            await websocket.send_json({"type": "error", "message": f"Model not found: {model_id}"})
            return

        model = PPO.load(model_path)
        env = _make_env()

        for episode in range(1, num_episodes + 1):
            obs, _ = env.reset(seed=episode)
            total_reward = 0.0
            step = 0
            terminated = truncated = False

            while not (terminated or truncated):
                action, _ = model.predict(observation=obs, deterministic=True)
                action_int = int(action)
                obs, reward, terminated, truncated, _ = env.step(action_int)
                total_reward += float(reward)
                step += 1

                await websocket.send_json({
                    "type": "step",
                    "episode": episode,
                    "step": step,
                    "obs": obs.tolist(),
                    "action": action_int,
                    "reward": float(reward),
                    "total_reward": total_reward,
                    "terminated": bool(terminated),
                    "truncated": bool(truncated),
                })

                # Yield control so the event loop can send data
                await asyncio.sleep(0.02)

            # Check stable landing using the same logic as compare_models.py
            speed = float(np.sqrt(obs[2] ** 2 + obs[3] ** 2))
            stable_touchdown = (
                bool(terminated)
                and float(obs[6]) > 0.5
                and float(obs[7]) > 0.5
                and speed < 0.5
                and abs(float(obs[4])) < 0.2
            )

            await websocket.send_json({
                "type": "episode_end",
                "episode": episode,
                "total_reward": total_reward,
                "steps": step,
                "stable_touchdown": stable_touchdown,
            })

        await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        if env is not None:
            env.close()

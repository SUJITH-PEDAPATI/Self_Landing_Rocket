"""
compare_models.py
-----------------
Side-by-side evaluation of the baseline PPO model and the reward-shaped PPO model.

Usage (from project root):
    python -m src.compare_models
"""

import os
import numpy as np
import gymnasium as gym
from stable_baselines3 import PPO


# ── Environment factory ───────────────────────────────────────────────────────

def make_env(render_mode: str | None = None) -> gym.Env:
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=True,
        wind_power=15.0,
        turbulence_power=1.5,
        render_mode=render_mode,
    )


# ── Evaluation helper ─────────────────────────────────────────────────────────

def evaluate_model(model: PPO, num_episodes: int = 10, seed_offset: int = 0) -> list[float]:
    """
    Run `num_episodes` deterministic episodes and return per-episode rewards.

    Uses the correct SB3 inference pattern:
        action, _ = model.predict(obs, deterministic=True)   # NOT model.step()
        obs, reward, terminated, truncated, info = env.step(action)
    """
    env = make_env(render_mode=None)
    rewards: list[float] = []

    for ep in range(num_episodes):
        obs, _ = env.reset(seed=seed_offset + ep)
        total_reward = 0.0
        terminated = truncated = False

        while not (terminated or truncated):
            # ✅ Correct SB3 PPO inference
            action, _states = model.predict(observation=obs, deterministic=True)
            obs, reward, terminated, truncated, _ = env.step(action)
            total_reward += reward

        rewards.append(total_reward)

    env.close()
    return rewards


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    BASELINE_PATH = os.path.join("models", "PPO_LandLunar_v3.zip")
    SHAPED_PATH   = os.path.join("models", "PPO_time_penalty.zip")
    NUM_EPISODES  = 10

    models: dict[str, str] = {
        "Baseline (no shaping)": BASELINE_PATH,
        "Reward-shaped (time penalty)": SHAPED_PATH,
    }

    results: dict[str, list[float]] = {}

    for name, path in models.items():
        if not os.path.exists(path):
            print(f"⚠  Skipping '{name}' — model not found at: {path}")
            continue
        print(f"\nEvaluating: {name}")
        model = PPO.load(path)
        episode_rewards = evaluate_model(model, num_episodes=NUM_EPISODES, seed_offset=100)
        results[name] = episode_rewards
        for i, r in enumerate(episode_rewards, 1):
            print(f"  Episode {i:2d}: {r:>9.2f}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("COMPARISON SUMMARY")
    print("=" * 50)
    print(f"{'Model':<35} {'Mean':>8}  {'Std':>8}  {'Min':>8}  {'Max':>8}")
    print("-" * 50)
    for name, rewards in results.items():
        arr = np.array(rewards)
        print(
            f"{name:<35} "
            f"{arr.mean():>8.2f}  "
            f"{arr.std():>8.2f}  "
            f"{arr.min():>8.2f}  "
            f"{arr.max():>8.2f}"
        )

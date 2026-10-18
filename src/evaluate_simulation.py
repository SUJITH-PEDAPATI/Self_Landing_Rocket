"""
evaluate_simulation.py
-----------------------
Watch a trained agent land in a pop-up window.

Usage (from project root):
    python -m src.evaluate_simulation                         # baseline model
    python -m src.evaluate_simulation --model PPO_time_penalty  # shaped model
"""

import argparse
import os
import gymnasium as gym
from stable_baselines3 import PPO


def make_env(render_mode="human"):
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=False,   # Match training environment
        render_mode=render_mode,
    )


def run_simulation(model_path: str, num_episodes: int = 5):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at: {model_path}")

    model = PPO.load(model_path)
    print(f"Loaded model: {model_path}")

    env = make_env(render_mode="human")

    try:
        for episode in range(num_episodes):
            observation, _ = env.reset(seed=episode)
            total_reward = 0.0
            terminated = truncated = False

            while not (terminated or truncated):
                action, _ = model.predict(observation=observation, deterministic=True)
                observation, reward, terminated, truncated, _ = env.step(action)
                total_reward += reward

            print(f"Episode {episode + 1}/{num_episodes} | Reward: {total_reward:.2f}")
    finally:
        env.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default="PPO_LandLunar_v3",
        help="Model filename (without .zip) inside the models/ folder",
    )
    parser.add_argument("--episodes", type=int, default=5)
    args = parser.parse_args()

    model_path = os.path.join("models", args.model + ".zip")
    run_simulation(model_path=model_path, num_episodes=args.episodes)

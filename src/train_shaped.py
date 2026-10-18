"""
train_shaped.py
---------------
Train a PPO agent with a time-penalty reward wrapper on LunarLander-v3.
Wind is disabled to match the baseline environment in train_agent.py.

Usage (from project root):
    python -m src.train_shaped
"""

import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from src.reward_wrapper import RewardWrapper
import os


def make_env(render_mode=None):
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=False,   # Match baseline: no wind
        render_mode=render_mode,
    )


if __name__ == "__main__":
    MODEL_DIR = "models"
    os.makedirs(MODEL_DIR, exist_ok=True)

    penalty = 0.01  # Subtract this much reward every timestep

    vec_env = make_vec_env(
        make_env,
        n_envs=4,
        wrapper_class=RewardWrapper,
        wrapper_kwargs={"penalty": penalty},
    )

    model = PPO("MlpPolicy", vec_env, verbose=1)
    model.learn(total_timesteps=500_000)

    MODEL_PATH = os.path.join(MODEL_DIR, "PPO_time_penalty")
    model.save(MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")

    vec_env.close()

import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
import os


def make_env(render_mode=None):
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=False,   # Baseline: no wind
        render_mode=render_mode,
    )


if __name__ == "__main__":
    MODEL_DIR = "models"
    os.makedirs(MODEL_DIR, exist_ok=True)

    vec_env = make_vec_env(make_env, n_envs=4)

    model = PPO("MlpPolicy", vec_env, verbose=1)
    model.learn(total_timesteps=500_000)

    MODEL_PATH = os.path.join(MODEL_DIR, "PPO_LandLunar_v3")
    model.save(MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")

    vec_env.close()
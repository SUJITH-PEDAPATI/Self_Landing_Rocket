import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from src.reward_wrapper import RewardWrapper
import os

def make_env(render_mode = None):
    return gym.make(
        "LunarLander-v3",
        continuous = False,
        gravity = -10.0,
        enable_wind = True,
        wind_power = 15.0,
        turbulence_power = 1.5,
        render_mode = render_mode
    )


if __name__ == "__main__":
    MODEL_DIR = "models"
    os.makedirs(MODEL_DIR,exist_ok = True)
    penalty = 0.01
    
    vec_env = make_vec_env(
        make_env,
        n_envs=4,
        wrapper_class= RewardWrapper,
        wrapper_kwargs= {"penalty": penalty}
    )

    wrapped_model = PPO("MlpPolicy", vec_env, verbose = 1)
    wrapped_model.learn(total_timesteps=1_000_000)
    
    MODEL_PATH = os.path.join(MODEL_DIR, "PPO_time_penalty")
    wrapped_model.save(MODEL_PATH)
    print(f"Model Saved to Path: {MODEL_PATH}")

    vec_env.close()



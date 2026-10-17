import gymnasium as gym
from stable_baselines3 import PPO
import time
import os


def make_env(render_mode="human"):
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity=-10.0,
        enable_wind=True,
        wind_power=15.0,
        turbulence_power=1.5,
        render_mode=render_mode,
    )


def run_simulation(model_path: str, num_episodes: int = 10, render: bool = True):
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at: {model_path}")
    
    model = PPO.load(model_path)
    print(f"Model loaded from: {model_path}")

    render_mode = "human" if render else None
    env = make_env(render_mode=render_mode)

    try:
        for episode in range(num_episodes):
            observation, info = env.reset(seed=episode)
            total_reward = 0.0
            terminated = False
            truncated = False

            print(f"\nEpisode: {episode + 1}/{num_episodes}")
            while not (terminated or truncated):
                
                action, _states = model.predict(observation=observation, deterministic=True)
                observation, reward, terminated, truncated, info = env.step(action)
                total_reward += reward
                if render:
                    time.sleep(0.01)

            print(f"  Episode Reward : {total_reward:.2f}")
            print(f"  Terminated={terminated}  Truncated={truncated}")
    finally:
        env.close()


if __name__ == "__main__":
    MODEL_PATH = "models/PPO_time_penalty.zip"
    run_simulation(model_path=MODEL_PATH, num_episodes=10, render=True)

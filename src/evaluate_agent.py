import gymnasium as gym
from stable_baselines3 import PPO
import os
import numpy as np

def make_env(render_mode = "human"):
    return gym.make(
        "LunarLander-v3",
        continuous= False,
        gravity = -10.0,
        enable_wind = True,
        wind_power = 15.0,
        turbulence_power = 1.5,
        render_mode = render_mode
    )

if __name__ == "__main__":
    ## Loading the PPO Model
    MODEL_PATH = r"models\PPO_LandLunar_v3.zip"
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found in: {MODEL_PATH}")

    model = PPO.load(MODEL_PATH)
    print(f"Model loaded SuccessFully from: {MODEL_PATH}")
    env = make_env()

    NUM_EPISODES = 10
    episode_rewards = []
    for episodes in range(NUM_EPISODES):
        observation,info = env.reset()

        terminated = False
        trunacated = False
        total_reward = 0.0

        while not (terminated or trunacated):
            ## Prediction of the action from the current observation
            action,_states = model.predict(observation=observation,deterministic=True)
            observation,rewards,terminated,trunacated,info = (env.step(action=action))
            total_reward += rewards

        episode_rewards.append(total_reward)
        print(f"Episode: {episodes+1}/{NUM_EPISODES}")
        print(f"Reward: {total_reward:.2f}")

    
    mean_reward = np.mean(episode_rewards)
    print("\nEvaluation Results")
    print("------------------")
    print(f"Number of episodes: {NUM_EPISODES}")
    print(f"Mean reward: {mean_reward:.2f}")

    env.close()
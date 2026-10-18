import gymnasium as gym
import numpy as np
import os
import csv
from stable_baselines3 import PPO

MODELS = {
    "Baseline_PPO":"models/PPO_LandLunar_v3",
    "Reward_Shaped_PPO":"models/PPO_time_penalty"
}

EPISODES = 10

def make_env(render_mode = None):
    return gym.make(
        "LunarLander-v3",
        enable_wind = False,
        render_mode = render_mode
    )

def evaluate(model_name,model_path):
    env = make_env()
    model = PPO.load(model_path)
    episode_rewards = []
    episode_results = []
    success = 0

    try:
        for episode in range(EPISODES):
            observation,info = env.reset(seed=episode)
            total_reward = 0
            terminated = False
            truncated = False

            while not (terminated or truncated):
                action,_states = model.predict(
                    observation = observation,
                    deterministic = True
                )
                observation,rewards,terminated,truncated,info = (env.step(action=action))
                total_reward += rewards

            speed = np.sqrt(observation[2]**2 + observation[3]**2)
            landed = (
                terminated
                and observation[6] > 0.5
                and observation[7] > 0.5
                and speed < 0.5
                and abs(observation[4]) < 0.2
            )

            if landed: success += 1
            episode_rewards.append(total_reward)
            episode_results.append({
                "model": model_name,
                "episode": episode + 1,
                "seed": episode,
                "reward": round(float(total_reward), 2),
                "stable_touchdown": landed,
            })

            print(
                f"Episode {episode + 1}: "
                f"Reward = {total_reward:.2f}, "
                f"Stable touchdown = {landed}"
            )
    finally:
        env.close()
    return {
        "episodes": episode_results,
        "mean_reward": float(np.mean(episode_rewards)),
        "std_reward": float(np.std(episode_rewards)),
        "successes": success,
        "success_rate": success / EPISODES,
    }


if __name__ == "__main__":
    os.makedirs("results", exist_ok=True)

    all_results = []
    summary_results = []

    for name, path in MODELS.items():
        print(f"\n{'=' * 35}\n{name}\n{'=' * 35}")

        result = evaluate(name, path)
        all_results.extend(result["episodes"])

        summary_results.append({
            "model": name,
            "episodes": EPISODES,
            "mean_reward": round(result["mean_reward"], 2),
            "std_reward": round(result["std_reward"], 2),
            "stable_touchdowns": result["successes"],
            "success_rate": round(result["success_rate"], 3),
        })

        print(f"Mean reward: {result['mean_reward']:.2f}")
        print(f"Reward std: {result['std_reward']:.2f}")
        print(
            f"Stable touchdowns: {result['successes']}/{EPISODES}"
        )

    with open(
        "results/episode_results.csv",
        "w",
        newline="",
        encoding="utf-8",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "model", "episode", "seed",
                "reward", "stable_touchdown",
            ],
        )
        writer.writeheader()
        writer.writerows(all_results)

    with open(
        "results/model_comparison_summary.csv",
        "w",
        newline="",
        encoding="utf-8",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "model", "episodes", "mean_reward",
                "std_reward", "stable_touchdowns",
                "success_rate",
            ],
        )
        writer.writeheader()
        writer.writerows(summary_results)

    print("\nResults saved:")
    print("results/episode_results.csv")
    print("results/model_comparison_summary.csv")

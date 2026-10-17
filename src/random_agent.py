import gymnasium as gym

def make_env(render_mode = "human"):
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
    env = make_env()
    observation, info = env.reset()
    total_reward = 0
    terminated = False
    truncated = False
    episode_over = False

    while not episode_over:
        action = env.action_space.sample()
        observation,reward,terminated,truncated,info = env.step(action=action)

        episode_over = terminated or truncated
        total_reward += reward

    print(f"Episode Finished Total Reward: {total_reward}")
    env.close()
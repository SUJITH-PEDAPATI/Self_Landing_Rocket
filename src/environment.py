import gymnasium as gym

def make_env(render_mode = None):
    return gym.make(
        "LunarLander-v3",
        render_mode = render_mode,
    )

if __name__ == "__main__":
    env = make_env()
    observation,info = env.reset(seed = 42)
    print("Observation",observation)
    print("Observation Shape", observation.shape)
    print("Action Space", env.action_space)

    env.close()
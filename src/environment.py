import gymnasium as gym

def make_env(render_mode = None): ## Render-Mode Specifies, how the environment should be visualized. (None --> Fastest for Training)
    return gym.make(
        "LunarLander-v3",
        continuous=False,
        gravity = -10.0,
        enable_wind = True,
        wind_power = 15.0,
        turbulence_power = 1.5,
        render_mode = render_mode,
    )

if __name__ == "__main__":
    env = make_env()
    observation,info = env.reset(seed = 42)
    print("Observation",observation)
    print("Observation Shape", observation.shape)
    print("Action Space", env.action_space)

    env.close()
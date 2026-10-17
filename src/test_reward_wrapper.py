import gymnasium as gym
import math
from src.reward_wrapper import RewardWrapper

def make_env(render_mode = "human"):
    return gym.make(
        "LunarLander-v3",
        continuous = False,
        gravity = -10.0,
        enable_wind = True,
        wind_power = 15.0,
        turbulence_power = 1.5,
        render_mode = "human"
    )

def main():
    penalty = 0.01

    original_env = make_env(render_mode = "human")
    wrapped_env = RewardWrapper(
        make_env("human"),
        penalty=penalty
    )
    try:
        original_env.reset(seed = 42)
        wrapped_env.reset(seed = 42)
        action = original_env.action_space.sample()

        observation_original,reward_original,terminated_original,truncation_orignal,info_original = original_env.step(action = action)
        observation_wrapped,reward_wrapped,terminated_wrapped,truncationwrapped,info_wrapped = wrapped_env.step(action = action)

        difference = reward_original - reward_wrapped

        print(f"Original Reward: {reward_original}")
        print(f"Wrapped Reward: {reward_wrapped}")
        print(f"Reward Difference: {difference}")

        passed = math.isclose(
            difference,
            penalty,
            rel_tol=0.0,
            abs_tol=1e-7
        )

        print("Test Passed!",passed)
        assert passed, "Reward Wrapper did not apply the expected penalty"

    finally:
        original_env.close()
        wrapped_env.close()


if __name__ == "__main__":
    main()


        
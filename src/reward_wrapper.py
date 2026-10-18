import gymnasium as gym


class RewardWrapper(gym.RewardWrapper):
    """
    A simple reward-shaping wrapper that subtracts a small time penalty
    each step. This encourages the agent to land faster.

    Args:
        env: The Gymnasium environment to wrap.
        penalty: Reward subtracted every timestep (default: 0.01).
    """

    def __init__(self, env: gym.Env, penalty: float = 0.01):
        super().__init__(env)
        self.penalty = penalty

    def reward(self, reward: float) -> float:
        # Subtract a small penalty every step to encourage faster landings
        return reward - self.penalty

import gymnasium as gym

class RewardWrapper(gym.Wrapper):
    def __init__(self,environment,penalty = 0.01):
        super().__init__(environment)
        self.penalty = penalty
    
    def step(self,action):
        observation,rewards,termination,truncation,info = self.env.step(action)
        modified_reward = rewards - self.penalty
        return (
            observation,
            modified_reward,
            termination,
            truncation,
            info
        )
    
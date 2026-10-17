import gymnasium as gym
import stable_baselines3 as sb3
import torch

print("Pytorch",torch.__version__)
print("CUDA Available",torch.cuda.is_available())
print("Stable Baseline",sb3.__version__)

env = gym.make("LunarLander-v3")
observation, info = env.reset()


print("Observation Shape:", observation.shape)
print("Action Shape",env.action_space)

env.close()

print("Setup Successful!")
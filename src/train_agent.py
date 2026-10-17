import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
import os

def make_env(render_mode = None):
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
    MODEL_DIR = "models"
    os.makedirs(MODEL_DIR,exist_ok=True)

    vec_env = make_vec_env(make_env, n_envs=4, env_kwargs={"render_mode": None})
    
    model = PPO("MlpPolicy",vec_env, verbose = 1)
    model.learn(total_timesteps=500_000)
    
    MODEL_PATH = os.path.join(MODEL_DIR, "PPO_LandLunar_v3")
    model.save(MODEL_PATH)
    print("Model Saved to Path", MODEL_PATH)
    
    vec_env.close()
    eval_env = make_env(render_mode="human")
    observation,info = eval_env.reset()

    try:
        while True:
            action, _states = model.predict(observation=observation,deterministic=True)
            observation,rewards,terminated,trunacated,info = eval_env.step(action)
            eval_env.render()
            if terminated or trunacated:
                observation, info = eval_env.reset()
    except KeyboardInterrupt:
        print("Evaluation Stopped!")
    finally:
        eval_env.close()
import os, re, numpy as np, math, h5py
import happi

S = happi.Open(["./restart*"], verbose=False)

# COMPARE THE Env_E_abs Probe in polarization plane
Env_E   = S.Probe(1, "Env_E_abs",timestep_indices=-1).getData()[0][::4,::4]
Validate("Env_E_abs field at last iteration", Env_E, 0.01)

# COMPARE THE Env_A_abs Probe in polarization plane
Env_A   = S.Probe(1, "Env_A_abs",timestep_indices=-1).getData()[0][::4,::4]
Validate("Env_A_abs probe at last iteration", Env_A, 0.01)


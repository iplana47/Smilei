import numpy as np
from math import pi, sqrt, exp, sin, cos
from numpy import s_

l0 = 2. * pi                            # laser wavelength [in code units]
t0 = l0                                 # optical cycle

Lsim = [10.*l0,15*l0,20*l0]             # simulation window
Tsim = 15*t0

resx,resy,resz = 8,8,8               # longitudinal cells in one laser wavelength
rest = resx*2                        # number of timesteps in one optical cycle
#rest = resx*np.sqrt(3)*1.02

Lcell = [l0/resx, l0/resx, l0/resx]

Lx,Ly,Lz = Lsim
dx,dy,dz = Lcell
dt = t0/rest

def fx(x, y, z):
    if (Ly/2 < np.mod(y,Ly) <= Ly/2+dy and Lz/2 < np.mod(z,Lz) <= Lz/2+dz):
        return 1
    else:
        return 0

def fy(x, y, z):
    if (Lz/2 < np.mod(z,Lz) <= Lz/2+dz and Lx/2 < np.mod(x,Lx) <= Lx/2+dx):
        return 1
    else:
        return 0

def fz(x, y, z):
    if (Lx/2 < np.mod(x,Lx) <= Lx/2+dx and Ly/2 < np.mod(y,Ly) <= Ly/2+dy):
        return 1
    else:
        return 0

def ft(t):
    if (dt < np.mod(t,Tsim) <= 2*dt):
        return 1
    else:
        return 0

Main(
    geometry = "3Dcartesian",
    maxwell_solver = "Bouchard",
    #maxwell_solver = "Yee",
    custom_oversize = 4,
    timestep = t0/rest,
    number_of_timesteps = Tsim/l0*rest,
    # simulation_time = Tsim,
    #EM_boundary_conditions = [
    #    ['silver-muller'],['silver-muller'],['silver-muller']
    #],
    cell_length = Lcell,
    grid_length  = Lsim,
    number_of_patches = [resx, resy, resz], 
    solve_poisson = False,
    print_every = 10,
)

Antenna(
    field = "Jx",
    space_profile = fx,
    time_profile = tcosine(base=0., start=0, duration=t0/2, freq=2,phi=pi/2)
)

Antenna(
    field = "Jy",
    space_profile = fy,
    time_profile = tcosine(base=0., start=0, duration=t0/2, freq=2,phi=pi/2)
)

Antenna(
    field = "Jz",
    space_profile = fz,
    time_profile = tcosine(base=0., start=0, duration=t0/2, freq=2,phi=pi/2)
)

# ExternalField(
#     field = "Ex",
#     profile = fx,
# )
# 
# ExternalField(
#     field = "Ey",
#     profile = fy,
# )
# 
# ExternalField(
#     field = "Ez",
#     profile = fz,
# )

DiagScalar(every=1)

DiagFields(
    every = 2,
    flush_every=10,
    fields = ['Ex', 'Ey', 'Ez','Jx','Jy','Jz'],
    subgrid = s_[::1,::1,::1]
)

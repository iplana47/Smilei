############################# Input namelist for Laser Wakefield excitation
############################  with a Flattened Gaussian laser pulse 
############################# described with a laser envelope model
############################# in cylindrical geometry

import math 
import numpy as np
import scipy.constants
from scipy.special import binom

envelope_box_side                  = "xmin" 

##### Physical constants
lambda0                            = 0.8e-6                    # laser wavelength, m
c                                  = scipy.constants.c         # lightspeed, m/s
omega0                             = 2*math.pi*c/lambda0       # laser angular frequency, rad/s
eps0                               = scipy.constants.epsilon_0 # Vacuum permittivity, F/m
e                                  = scipy.constants.e         # Elementary charge, C
me                                 = scipy.constants.m_e       # Electron mass, kg
ncrit                              = eps0*omega0**2*me/e**2    # Plasma critical number density, m-3
c_over_omega0                      = lambda0/2./math.pi        # converts from c/omega0 units to m
reference_frequency                = omega0                    # reference frequency, s-1
E0                                 = me*omega0*c/e             # reference electric field, V/m

##### Variables used for unit conversions
c_normalized                       = 1.                        # speed of light in vacuum in normalized units
um                                 = 1.e-6/c_over_omega0       # 1 micron in normalized units
mm                                 = 1.e-3/c_over_omega0       # 1 mm in normalized units
fs                                 = 1.e-15*omega0             # 1 femtosecond in normalized units
mm_mrad                            = um                        # 1 millimeter-milliradians in normalized units
pC                                 = 1.e-12/e                  # 1 picoCoulomb in normalized units

#########################  Simulation parameters


############################################################################
#### set parameters that do not depend on the use of the envelope model ####
############################################################################

##### mesh resolution and simulation window size
dr                                 = 3.*um                     # transverse mesh resolution
nr                                 = 104                       # number of mesh points in the transverse direction
Lr                                 = nr * dr                   # transverse size of the simulation window

dx                                 = 0.2*um                    # longitudinal mesh resolution
nx                                 = 768                       # number of mesh points in the longitudinal direction
Lx                                 = nx * dx                   # longitudinal size of the simulation window

##### Total simulation time
dt                                 = 0.97*dx/c_normalized     # integration timestep    
T_sim                              = 1500*dt

##### patches parameters (parallelization)
npatch_r                           = 8
npatch_x                           = 128                       



######################### Main simulation definition block

Main(
    geometry                       = "AMcylindrical",

    interpolation_order            = 1,

    timestep                       = dt,
    simulation_time                = T_sim,

    cell_length                    = [dx, dr],
    grid_length                    = [ Lx,  Lr],

    number_of_AM                   = 1 ,

    number_of_patches              = [npatch_x,npatch_r],
 
    EM_boundary_conditions         = [["PML"],["PML"],],
    number_of_pml_cells            = [[20,20],[20,20]],
 
    solve_poisson                  = False,
    #solve_relativistic_poisson     = True,
    print_every                    = 100,
    use_BTIS3_interpolation        = True,

    reference_angular_frequency_SI = omega0,
    
    maxwell_solver                 = "Terzani",

    random_seed                    = smilei_mpi_rank
)

######################### Define the laser pulse

### laser parameters
a0                                 = 1.5                             # normalized field
N                                  = 10                              # order of the Flattened Gaussian beam
waist_0                            = 41*um                           # laser waist of the fundamental LG mode
focus                              = [0.1*Lx]                        # laser focus, [x] position
omega                              = omega0/omega0                   # normalized laser frequency (=1 since its frequency omega0 is also the normalizing frequency)

laser_fwhm                         = 90*fs                           # fwhm duration of the field
# if envelope_box_side=="xmin", center_laser is the time at which the laser peak enters the window from xmin
# if envelope_box_side=="inside", center_laser*c is the longitudinal position of the envelope peak at t=0
center_laser                       = 1.8*laser_fwhm if envelope_box_side=="xmin" else Lx-1.8*laser_fwhm
time_envelope                      = tgaussian(center=center_laser, fwhm=laser_fwhm)


def FGB(N,x,r): 
    # Flattened Gaussian Beam (FGB) laser profile,
    # defined by the PALLAS team 
    # for the article P. Drobniak et al, PRAB 2023 (https://doi.org/10.1103/PhysRevAccelBeams.26.091302). 
    # This implementation is inspired from G. Maynard and FBPIC definition of FGB,
    # here defined in normalized units. 
    # 
    # See M. Santarsiero et al, Journal of Modern Optics 1997 (https://doi.org/10.1080/09500349708232927)
    # for the definition of the FGB profile.
    
    N = int(round(N))               # order of the Flattened Gaussian Beam; N=0 is a Gaussian beam
    w_foc = waist_0 * np.sqrt(N+1)  # smilei units, with w0 the waist at focus of from order N = 0
    zr = 0.5 * (w_foc)**2           # smilei units, effective rayleigh length for FGB
    inv_zr = 1./zr
    diffract_factor = 1. + 1j * (x - focus[0]) * inv_zr
    w = w_foc * np.abs( diffract_factor )
    scaled_radius_squared = 2 * ( r**2 ) / w**2
    psi = np.angle(diffract_factor)
    laguerre_sum = np.zeros_like( r, dtype=np.complex128 )
    for n in range(0, N+1):
        # Recursive calculation of the Laguerre polynomial
        # - `L` represents $L_n$
        # - `L1` represents $L_{n-1}$
        # - `L2` represents $L_{n-2}$
        if n==0:
            L = 1.
        elif n==1:
            L1 = L
            L = 1. - scaled_radius_squared
        else:
            L2 = L1
            L1 = L
            L = (((2*n -1) - scaled_radius_squared) * L1 - (n - 1) * L2) / n
        # Add to the sum, including the term for the additional Gouy phase
        cn = np.empty(N+1)
        m_values = np.arange(n, N+1)
        cn[n] = np.sum((1./2)**m_values * binom(m_values,n)) / (N+1)
        laguerre_sum += cn[n] * np.exp( - (2j* n) * psi ) * L

    # space envelope
    exp_argument =  - (r**2) / (w_foc**2 * diffract_factor)
    spatial_envelope = laguerre_sum * np.exp(exp_argument) /  diffract_factor
    # full envelope profile
    profile = a0 * spatial_envelope

    return profile

# to avoid calculating the FGB mode at each timestep , 
# we pre-compute its value at x=0 at the grid points
r_mesh         = np.linspace(-2*dr, (nr+2)*dr, nr+2*2+1) # Assumes primal and 2 ghost cells per direction

FGB_at_xmin    = FGB(N,0,r_mesh)

# free memory
r_mesh         = None

# The envelope profile will be the multiplication 
# of the pre-computed transverse profile and the time envelope
def envelope_profile(r, t):
    # Compute nearest grid indices
    j = np.clip(np.round((r+2*dr) / dr).astype(int), 0, nr + 4)
    # Sample the HG field at x=0 from the pre-saved array, multiply by the time envelope
    return FGB_at_xmin[j] * time_envelope(t)
    
    
def envelope_profile_inside(x,r,t):
    return FGB(N,x,r) * time_envelope(t)
    
LaserEnvelope(
    omega            = omega,
    envelope_solver  = 'explicit_reduced_dispersion',
    envelope_profile = envelope_profile if envelope_box_side=="xmin" else envelope_profile_inside,
    Envelope_boundary_conditions = [["reflective"]],
    polarization_phi = 0.,
    ellipticity      = 0.,
    box_side         = envelope_box_side
)

########################## Define the plasma

###### plasma parameters
Radius_plasma                      = 140.*um                       # Radius of plasma
Lramp                              = 2.*um                         # Plasma density upramp length
Lplateau                           = 300*mm                        # Length of density plateau
Ldownramp                          = 0.*um                         # Length of density downramp

x_begin_upramp                     = dx                            # x coordinate of the end of the density upramp / start of density plateau
x_begin_plateau                    = x_begin_upramp+Lramp          # x coordinate of the start of the density plateau
x_end_plateau                      = x_begin_plateau+Lplateau      # x coordinate of the end of the density plateau start of the density downramp
x_end_downramp                     = x_end_plateau+Ldownramp       # x coordinate of the end of the density downramp

##### plasma density profile
longitudinal_profile               = polygonal(xpoints=[x_begin_upramp,x_begin_plateau,x_end_plateau,x_end_downramp],xvalues=[0.,1.,1.,0.])
n0_center_SI                       = 2.7e23                        # m-3
n0                                 = n0_center_SI/ncrit

def plasma_density(x,r):
	profile_r                      = 0.
	if (np.abs(r)<Radius_plasma):
		profile_r                  = 1.
	return n0*profile_r*longitudinal_profile(x,r)

###### define the plasma electrons
Species(
 name                              = "plasmaelectrons",
 position_initialization           = "regular",
 momentum_initialization           = "cold",
 particles_per_cell                = 2,
 regular_number                    = [1,2,1],
 mass                              = 1.0,
 charge                            = -1.0,
 number_density                    = plasma_density,
 mean_velocity                     = [0.0, 0.0, 0.0],
 temperature                       = [0.,0.,0.],
 pusher                            = "ponderomotive_borisBTIS3",
 time_frozen                       = 0.0,
 boundary_conditions               = [["remove", "remove"],["remove", "remove"],],
)

######################### Define a moving window
MovingWindow(
    time_start                     = Lx if envelope_box_side=="xmin" else 0.,     
    velocity_x                     = c_normalized,
)

######################### Diagnostics

output_every                       = int(100*um/dt)

list_fields_diagnostic             = ['Ex','Ey','Rho','Bz','BzBTIS3','Env_E_abs','Env_A_abs']

##### 1D Probe diagnostic on the x axis
DiagProbe(
        every                      = output_every,
        origin                     = [ 0.                  , 1.*dr, 1.*dr],
        corners                    = [ [Main.grid_length[0], 1.*dr, 1.*dr]],
        number                     = [ nx ],
        fields                     = list_fields_diagnostic
)

##### 2D Probe diagnostics on the xy plane
DiagProbe(
    every                          = output_every,
    origin                         = [ 0.                  , -nr*dr,0.],
    corners                        = [ [nx*dx,-nr*dr,0.]   , [0,nr*dr,0.] ],
    number                         = [nx                   , int(2*nr)],
    fields                         = list_fields_diagnostic
)



######################### Load balancing (for parallelization)                                                                                                                                                     
LoadBalancing(
    initial_balance                = False,
    every                          = 40,
    cell_load                      = 1.,
    frozen_particle_load           = 0.1
)




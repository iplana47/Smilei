############################# Input namelist for vacuum propagation
############################# with a Laguerre-Gauss laser pulse 
############################# described with a laser envelope model
############################# in cylindrical geometry

import math 
import numpy as np
import scipy.constants
import scipy.special as sp

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
meter                              = 1./c_over_omega0          # 1 meter in normalized units
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
T_sim                              = 2000*dt

##### patches parameters (parallelization)
npatch_r                           = 8
npatch_x                           = 128                       



######################### Main simulation definition block

Main(
    geometry                       = "AMcylindrical",

    interpolation_order            = 2,

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

    reference_angular_frequency_SI = omega0,

    random_seed                    = smilei_mpi_rank
)

######################### Define the laser pulse

### laser parameters
waist_0                            = 41*um                           # laser waist of the fundamental LG mode
focus                              = [0.]                            # laser focus, [x] position
omega                              = omega0/omega0                   # normalized laser frequency (=1 since its frequency omega0 is also the normalizing frequency)

laser_fwhm                         = 90*fs                           # fwhm duration of the field
center_laser                       = 1.8*laser_fwhm                  # the time at which the laser peak enters the window from xmin
time_envelope                      = tgaussian(center=center_laser, fwhm=laser_fwhm)

# Order p of the LG mode along r 
# p must be an integer greater or equal to zero
p                                  = 1

# The cylindrically symmetric LG mode defined here has an amplitude 
# that allows to have an integral equal to 1 on each transverse plane in vacuum.
# This choice is useful for LG mode decomposition, 
# but not very practical if you want to control the peak amplitude of the field.
# Change the prefactor accordingly for the latter choice.

# LG field of order p,l at x=0 
def LG_x_min(p,r_normalized):
    l                = 0 # the azimuthal order of the LG mode must be zero in perfect cylindrical symmetry (1 azimuthal mode)
    
    # all the coordinates in this function are converted in meters
    
    x_R              = np.pi*(waist_0/meter)**2/lambda0  # Rayleigh length [m]
    xmin             = 0.
    x_SI             = (xmin - focus[0])/meter           # longitudinal distance from the focal plane at xmin, meters
    
    r                = np.abs(r_normalized)/meter                # meters
        
    # Avoid division by zero and define some key parameters, in meters
    w                = waist_0/meter  if x_SI==0 else waist_0/meter * np.sqrt(1 + (x_SI /x_R)**2) 
    R                = np.inf         if x_SI==0 else x_SI * (1  + (x_R/x_SI)**2) 
    Gouy_phase       = np.exp(-1j*0.) if x_SI==0 else np.exp(-1j * (2*p+abs(l)+1) * np.arctan2(x_SI,x_R) )
    curved_phase     = np.exp(1j*0.)  if x_SI==0 else np.exp(1j*(2.*np.pi/lambda0)*r**2 / (2*R))
        
    # Compute the complex field using the LG mode formula (only the part dependent on x and r)
    prefactor        = 1./w* np.sqrt( 2 * sp.gamma(p+1) / (np.pi * (sp.gamma(p+ abs(l)+1)))   )
            
    # remember that gamma(n+1) = n! when n is an integer
    radial_component = sp.eval_genlaguerre(p, abs(l), (2 * r**2 / w**2)) \
                        * (np.sqrt(2) * r / w)**abs(l)                   \
                        * np.exp(-r**2 / w**2)           
                            
    # multiply the terms depending on x, r
    # The azimuthal variation is zero, so its associated factor is assumed equal to 1.
    return prefactor * radial_component * Gouy_phase * curved_phase 

# to avoid calculating the LG mode at each timestep , 
# we pre-compute its value at x=0 at the grid points
r_mesh         = np.linspace(-2*dr, (nr+2)*dr, nr+2*2+1) # Assumes primal and 2 ghost cells per direction

LG_at_xmin     = LG_x_min(p,r_mesh)

# free memory
r_mesh         = None

# The envelope profile will be the multiplication 
# of the pre-computed transverse profile and the time envelope
def envelope_profile(r, t):
    # Compute nearest grid indices
    j = np.clip(np.round((r+2*dr) / dr).astype(int), 0, nr + 4)
    # Sample the HG field at x=0 from the pre-saved array, multiply by the time envelope
    return LG_at_xmin[j] * time_envelope(t)

# This envelope solver is suggested only for short distances
# since its numerical dispersion is significantly higher
# than the solver "explicit_reduced_dispersion".
# Choosing a finer mesh mitigates the numerical artifacts,
# but for better accuracy the solver "explicit_reduced_dispersion" is preferable.
LaserEnvelope(
    omega            = omega,
    envelope_solver  = 'explicit',
    envelope_profile = envelope_profile,
    Envelope_boundary_conditions = [["reflective"]],
    polarization_phi = 0.,
    ellipticity      = 0.,
    box_side         = "xmin"
)

######################### Define a moving window
MovingWindow(
    time_start                     = Lx,     # window starts  moving at the start of the simulation
    velocity_x                     = c_normalized,
)

######################### Diagnostics

output_every                       = int(100*um/dt)

list_fields_diagnostic             = ['Env_A_abs','Env_E_abs']

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




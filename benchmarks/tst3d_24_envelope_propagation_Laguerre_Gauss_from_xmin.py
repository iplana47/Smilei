############################# Laser envelope propagation in vacuum
############################# Laser envelope propagation in vacuum
import math 
import numpy as np
import scipy.constants
import scipy.special as sp

##### Physical constants
lambda0                    = 0.8e-6                    # laser wavelength, m
c                          = scipy.constants.c         # lightspeed, m/s
omega0                     = 2*math.pi*c/lambda0       # laser angular frequency, rad/s
eps0                       = scipy.constants.epsilon_0 # Vacuum permittivity, F/m
e                          = scipy.constants.e         # Elementary charge, C
me                         = scipy.constants.m_e       # Electron mass, kg
ncrit                      = eps0*omega0**2*me/e**2    # Plasma critical number density, m-3
c_over_omega0              = lambda0/2./math.pi        # converts from c/omega0 units to m
reference_frequency        = omega0                    # reference frequency, s-1
E0                         = me*omega0*c/e             # reference electric field, V/m

##### Variables used for unit conversions
c_normalized               = 1.                        # speed of light in vacuum in normalized units
um                         = 1.e-6/c_over_omega0       # 1 micron in normalized units
meter                      = 1./c_over_omega0          # 1 meter in normalized units
mm                         = 1.e-3/c_over_omega0       # 1 mm in normalized units
fs                         = 1.e-15*omega0             # 1 femtosecond in normalized units

##### mesh resolution and simulation window size
dy                         = 2*um                    # resolution along y
ny                         = 40                       # number of mesh points along y
Ly                         = ny * dy                   # size of the simulation window along y

dz                         = dy                        # resolution along z
nz                         = ny                        # number of mesh points along z
Lz                         = nz*dz                     # size of the simulation window along z

dx                         = 0.1*um                   # longitudinal mesh resolution
nx                         = 256                       # number of mesh points in the longitudinal direction
Lx                         = nx * dx                   # longitudinal size of the simulation window

##### Total simulation time
dt                         = 0.8*dx/c_normalized      # integration timestep    

Main(
    geometry               = "3Dcartesian",

    interpolation_order    = 2,

    timestep               = dt,
    simulation_time        = 1000.*dt,

    cell_length            = [ dx,  dy, dz],
    grid_length            = [ Lx,  Ly, Lz],

    number_of_patches      = [16,4,4],
    
    EM_boundary_conditions = [ ["silver-muller"] ],

    solve_poisson          = False,
    print_every            = 100,

)

####### Laser definition

# Parameters of the Laguerre Gauss (LG) mode
laser_fwhm                 = 15.*fs 
center_laser               = 1.8*laser_fwhm # the time at which the laser peak enters the window from xmin
time_envelope              = tgaussian(center=center_laser, fwhm=laser_fwhm)

focus                      = [center_laser, Ly/2., Lz/2.]
omega                      = omega0/omega0

waist_0                    = 16*um # this would be the waist of the fundamental mode m=0,n=0

# Order p,l of the LG mode along r and theta respectively
# p must be an integer greater or equal to zero
# l must be an integer, it can be positive, negative or 0
p                          = 0
l                          = 2

# The LG mode defined here has an amplitude 
# that allows to have an integral equal to 1 on each transverse plane in vacuum.
# This choice is useful for LG mode decomposition, 
# but not very practical if you want to control the peak amplitude of the field.
# Change the prefactor accordingly for the latter choice.

# LG field of order p,l at x=0 
def LG_x_min(p,l,y,z):
    # all the coordinates in this function are converted in meters
    
    x_R              = np.pi*(waist_0/meter)**2/lambda0  # Rayleigh length [m]
    xmin             = 0.
    x_SI             = (xmin - focus[0])/meter           # longitudinal distance from the focal plane at xmin, meters
    
    r                = np.sqrt(np.square(y-focus[1])+np.square(z-focus[2]))/meter   # meters
        
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
    
    # compute exp(i*theta) without using arctan2
    with np.errstate(divide='ignore', invalid='ignore'):
        exp_i_theta = np.where(r != 0, ((y-focus[1])/meter + 1j * (z-focus[2])/meter) / r, 1.0 + 0j)

    # Compute exp(i * l * theta)
    complex_exponential = exp_i_theta ** l              
                            
    # multiply the terms depending on x, r by the azimuthal variation
    return prefactor * radial_component * Gouy_phase * curved_phase * complex_exponential

# to avoid calculating the LG mode at each timestep, 
# we pre-compute its value at x=0
y_mesh = np.arange(0,ny)*dy
z_mesh = np.arange(0,nz)*dz

LG_at_xmin = np.zeros(shape=(ny,nz),dtype=complex)
for j in range(0,ny):
    for k in range(0,nz):
        LG_at_xmin[j,k] = LG_x_min(p,l,y_mesh[j],z_mesh[k])

# The envelope profile will be the multiplication 
# of the pre-computed interpolated transverse profile and the time envelope
def envelope_profile(x, y, z, t):
    y = np.asarray(y)
    z = np.asarray(z)
    # Compute nearest grid indices
    j = np.clip(np.round(y / dy).astype(int), 0, ny - 1)
    k = np.clip(np.round(z / dz).astype(int), 0, nz - 1)
    # Sample the HG field at x=0 from the pre-saved array, multiply by the time envelope
    return LG_at_xmin[j, k] * time_envelope(t)


# This envelope solver is suggested only for short distances
# since its numerical dispersion is significantly higher
# than the solver "explicit_reduced_dispersion".
# Choosing a finer mesh mitigates the numerical artifacts.
LaserEnvelope(
    omega            = omega,
    envelope_solver  = 'explicit',
    envelope_profile = envelope_profile,
    Envelope_boundary_conditions = [["reflective"]],
    polarization_phi = 0.,
    ellipticity      = 0.,
    box_side         = "xmin"
)


##### Moving window
MovingWindow(
    time_start       = Lx,
    velocity_x       = c_normalized
)


##### Diagnostics
list_fields          = ['Env_A_abs','Env_E_abs']

DiagFields(
    every            = 100,
        fields       = list_fields
)

DiagProbe(
        every        = 50,
        origin       = [0., Main.grid_length[1]/2., Main.grid_length[2]/2.],
        corners      = [
            [Main.grid_length[0], Main.grid_length[1]/2., Main.grid_length[2]/2.]
        ],
        number       = [nx],
        fields       = list_fields
)

DiagScalar(every = 10, vars=['Env_A_absMax','Env_E_absMax'])


                                                                                                                                                                 


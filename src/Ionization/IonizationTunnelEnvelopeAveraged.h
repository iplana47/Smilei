#ifndef IONIZATIONTUNNELENVELOPEAVERAGED_H
#define IONIZATIONTUNNELENVELOPEAVERAGED_H

#include <cmath>

#include <vector>

#include "IonizationTunnel.h"
#include "Tools.h"

struct EnvelopeElectricFields : ElectricFields {
    double env;
    double x_env;
    double Phi_env;
};

class Particles;

//! calculate the particle tunnel ionization
class IonizationTunnelEnvelopeAveraged : public IonizationTunnel<0>
{

public:
    //! Constructor for IonizationTunnelEnvelope: with no input argument
    IonizationTunnelEnvelopeAveraged( Params &params, Species *species );

    double ellipticity,cos_phi,sin_phi;

protected:
    inline void computeIonizationCurrents(unsigned int ipart, int Z, unsigned int k_times, ElectricFields E, Patch *patch, Projector *Proj, Particles *particles) override;
    inline void createNewElectrons(unsigned int ipart, unsigned int k_times, unsigned int Z, Particles *particles, Patch *patch, EnvelopeElectricFields E);
    inline ElectricFields calculateElectricFields(vector<vector<double>*> Epart, unsigned int ipart) override;
    inline double ionizationRate(const int Z, ElectricFields E) override;

private:
    unsigned int atomic_number_;
    std::vector<double> Potential;
    std::vector<double> Azimuthal_quantum_number;
    
    double one_third;
    std::vector<double> alpha_tunnel, beta_tunnel, gamma_tunnel,Ip_times2_to_minus3ov4;
};

#endif

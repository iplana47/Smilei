#ifndef IONIZATIONTUNNELENVELOPEAVERAGED_H
#define IONIZATIONTUNNELENVELOPEAVERAGED_H

#include <vector>

#include "IonizationTunnel.h"

struct EnvelopeElectricFields : ElectricFields {
    double env;
    double x_env;
    double Phi_env;
};

class Particles;

//! calculate the particle tunnel ionization
class IonizationTunnelEnvelopeAveraged : public IonizationTunnel
{

public:
    //! Constructor for IonizationTunnelEnvelope: with no input argument
    IonizationTunnelEnvelopeAveraged( Params &params, Species *species );

    double ellipticity,cos_phi,sin_phi;

protected:
    void computeIonizationCurrents(unsigned int ipart, unsigned int Z, unsigned int k_times, const ElectricFields& E, Patch *patch, Projector *Proj, Particles *particles) override;
    void createNewElectrons(unsigned int ipart, unsigned int k_times, unsigned int Z, Particles *particles, Patch *patch, const EnvelopeElectricFields& E);
    ElectricFields calculateElectricFields(vector<vector<double>*> Epart, unsigned int ipart) override;
    double ionizationRate(unsigned int Z, const ElectricFields& E) override;

private:
    std::vector<double> Ip_times2_to_minus3ov4;
};

#endif

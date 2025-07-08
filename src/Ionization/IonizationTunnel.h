#ifndef IONIZATIONTUNNEL_H
#define IONIZATIONTUNNEL_H

#include <cmath>
#include <vector>

#include "Ionization.h"

class Particles;
class Species;

struct ElectricFields {
    double x;
    double y;
    double z;
    double inv;
    double abs;
};

class IonizationTunnel : public Ionization
{
   public:
    IonizationTunnel(Params &params, Species *species);

    void operator()(Particles *, unsigned int, unsigned int, vector<vector<double>*>, Patch *, Projector *) override;

   protected:
    virtual void computeIonizationCurrents(unsigned int ipart, unsigned int Z, unsigned int k_times, const ElectricFields& E, Patch *patch, Projector *Proj, Particles *particles);
    virtual void createNewElectrons(unsigned int ipart, unsigned int k_times, unsigned int Z, Particles *particles, Patch *, const ElectricFields&);
    virtual ElectricFields calculateElectricFields(vector<vector<double>*> Epart, unsigned int ipart);
    virtual double ionizationRate(unsigned int Z, const ElectricFields& E);

    static constexpr double one_third = 1. / 3.;
    unsigned int atomic_number_;
    std::vector<double> Potential, Azimuthal_quantum_number;
    std::vector<double> alpha_tunnel, beta_tunnel, gamma_tunnel;
};

#endif

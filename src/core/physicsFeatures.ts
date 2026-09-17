/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 03: Physics Feature Engine
 * 
 * Lumped-order engineering thermal model and electro-thermal feature calculations:
 * 
 * Equations:
 * 1. Joule heating: Q_gen_joule = I² * R_int
 * 2. Entropic heat coefficient: Q_entropy = I * (T + 273.15) * (dE/dT)
 * 3. Total internal heat: Q_gen = Q_gen_joule + Q_entropy
 * 4. Heat dissipation: Q_loss = (T_batt - T_amb) / R_th
 * 5. Lumped thermal dynamic balance: C_th * (dT/dt) = Q_gen - Q_loss + Q_heater
 * 6. Electrical Power: P_elec = V * I
 */

import { PhysicsFeatures, BatterySpecs, EnvironmentalConditions } from './types';

export class PhysicsFeatureEngine {
  // Entropic coefficient dE/dT for NMC chemistry (typical ~ -0.22 mV/K around 50-80% SOC)
  private readonly dE_dT: number = -0.00022; // V/K
  // Enclosure surface area approx 0.085 m² for 6S4P UAV avionics pod
  private readonly surfaceAreaM2: number = 0.085;

  public computeFeatures(
    tBattC: number,
    tAmbC: number,
    voltageV: number,
    currentA: number,
    socPct: number,
    rIntMOhm: number,
    heaterActive: boolean,
    specs: BatterySpecs,
    env: EnvironmentalConditions
  ): PhysicsFeatures {
    const safeTBatt = Number.isFinite(tBattC) ? tBattC : -35.0;
    const safeTAmb = Number.isFinite(tAmbC) ? tAmbC : -35.0;
    const safeCurrent = Number.isFinite(currentA) ? Math.max(0, currentA) : 18.0;
    const safeVoltage = Number.isFinite(voltageV) ? Math.max(12.0, voltageV) : 22.2;
    const safeRInt = Number.isFinite(rIntMOhm) ? Math.max(0.1, rIntMOhm) : 50.0;
    const safeRth = Math.max(0.1, Number.isFinite(specs?.thermalResistanceK_W) ? specs.thermalResistanceK_W : 1.85);
    const safeThermalMass = Math.max(10.0, Number.isFinite(specs?.thermalMassJ_K) ? specs.thermalMassJ_K : 880.0);
    const safeCapacity = Math.max(1.0, Number.isFinite(specs?.nominalCapacityAh) ? specs.nominalCapacityAh : 20.0);

    const R_Ohms = safeRInt / 1000.0;
    const T_Kelvin = Math.max(150.0, safeTBatt + 273.15);

    // 1. Heat generation terms
    const resistiveHeatGenW = Math.pow(safeCurrent, 2) * R_Ohms;
    // Entropic reversible heat can be exothermic during discharge when dE/dT < 0
    const reversibleEntropyHeatW = -safeCurrent * T_Kelvin * this.dE_dT;
    const totalHeatGenW = Math.max(0, resistiveHeatGenW + reversibleEntropyHeatW);

    // 2. Heat loss through aerogel insulation blanket
    // R_th in K/W accounts for silica aerogel composite + sealed carbon-fiber skin
    const deltaTC = safeTBatt - safeTAmb;
    const effectiveRth = safeRth;
    const thermalLossW = deltaTC / effectiveRth;

    // 3. Thin-film etched-foil membrane heater input
    const heaterMaxPower = Number.isFinite(specs?.membraneHeaterPowerW) ? specs.membraneHeaterPowerW : 48.0;
    const membraneHeaterInputW = heaterActive ? heaterMaxPower : 0.0;

    // 4. Lumped-order thermal derivative
    // C_th * dT/dt = Q_gen - Q_loss + Q_heater
    const netThermalPowerW = totalHeatGenW - thermalLossW + membraneHeaterInputW;
    const lumpedDerivT_C_per_sec = netThermalPowerW / safeThermalMass;

    // 5. Electrical power & C-Rate
    const electricalPowerW = safeVoltage * safeCurrent;
    const effectiveCRate = safeCurrent / safeCapacity;

    // 6. Aerogel heat flux
    const aerogelHeatFluxWm2 = thermalLossW / this.surfaceAreaM2;

    return {
      resistiveHeatGenW: Number(resistiveHeatGenW.toFixed(2)),
      reversibleEntropyHeatW: Number(reversibleEntropyHeatW.toFixed(2)),
      totalHeatGenW: Number(totalHeatGenW.toFixed(2)),
      thermalLossW: Number(thermalLossW.toFixed(2)),
      deltaTC: Number(deltaTC.toFixed(2)),
      electricalPowerW: Number(electricalPowerW.toFixed(1)),
      lumpedDerivT_C_per_sec: Number(lumpedDerivT_C_per_sec.toFixed(5)),
      effectiveCRate: Number(effectiveCRate.toFixed(2)),
      membraneHeaterInputW: Number(membraneHeaterInputW.toFixed(1)),
      aerogelHeatFluxWm2: Number(aerogelHeatFluxWm2.toFixed(1)),
    };
  }
}

export const physicsFeatureEngine = new PhysicsFeatureEngine();

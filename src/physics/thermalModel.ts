/**
 * LAERS — Battery Intelligence Engine
 * Physics Module: Thermal Balance & Low-Temperature Electrochemistry
 * 
 * Equations modeled:
 * 1. Arrhenius-based Low-Temperature Internal Resistance R(T)
 * 2. Joule Heat Generation Q_gen = I² * R + I * T * (dE/dT)
 * 3. Aerogel/Enclosure Heat Loss Q_loss = (T_batt - T_amb) / R_th
 * 4. Thin-film Self-Heating Membrane Input Q_heater
 * 5. Dynamic Thermal State: C_th * dT/dt = Q_gen - Q_loss + Q_heater
 * 6. Ohmic Voltage Sag V_sag = I * R_int
 */

import { EnvironmentalConditions, BatterySpecs } from '../types/battery';

// Default pack specification: 6S4P Low-Temp NMC811 / Si-C formulation
export const DEFAULT_BATTERY_SPECS: BatterySpecs = {
  chemistry: 'Low-Temp High-Energy Li-ion (NMC 811 / Si-C Anode)',
  nominalCapacityAh: 24.0,
  nominalVoltageV: 22.2, // 6S nominal (3.7V/cell)
  cellConfiguration: '6S4P Pack (24 cylindrical/prismatic cells)',
  lowerVoltageCutoffV: 18.0, // 3.0V/cell critical cutoff
  cutoffVoltageV: 18.0,
  upperVoltageCutoffV: 25.2, // 4.2V/cell 100% SOC
  maxDischargeContinuousA: 60.0,
  membraneHeaterPowerW: 48.0, // Multi-zone thin-film etched foil membrane
  thermalMassJ_K: 880.0,      // Lumped thermal capacitance C_th
  heatCapacityJK: 880.0,
  thermalResistanceK_W: 1.85,  // High R_th with silica aerogel blanket + sealed enclosure
  thermalResistanceKW: 1.85,
};

export const UNINSULATED_BASELINE_R_TH = 0.42; // K/W for uninsulated baseline pack

// Open-Circuit Voltage polynomial approximation for 6S pack
export function calculateOCV(socPct: number): number {
  const safeSoc = Number.isFinite(socPct) ? Math.max(0, Math.min(100, socPct)) : 88.0;
  const soc = safeSoc / 100.0;
  // 6S lithium chemistry typical OCV curve from 3.0V (18.0V pack) to 4.2V (25.2V pack)
  // Non-linear knees at low and high SOC
  const cellOCV = 3.0 + 0.85 * soc + 0.35 * Math.pow(soc, 0.5) - 0.25 * Math.pow(1 - soc, 3.5);
  return Math.min(25.2, Math.max(18.0, cellOCV * 6));
}

/**
 * Calculates internal resistance using Arrhenius relationship for low temperatures.
 * Below 0°C, Li+ desolvation and SEI film charge transfer impedance surge dramatically.
 */
export function calculateInternalResistance(
  tempC: number,
  cycleCount: number = 50,
  stateOfHealthPct: number = 98.0
): number {
  const safeTemp = Number.isFinite(tempC) ? tempC : -35.0;
  const safeCycleCount = Number.isFinite(cycleCount) ? Math.max(0, cycleCount) : 50;
  const safeSoh = Number.isFinite(stateOfHealthPct) ? Math.max(10, Math.min(100, stateOfHealthPct)) : 98.0;

  const T_Kelvin = Math.max(150.0, safeTemp + 273.15);
  const T_ref = 298.15; // 25°C reference
  const R_ref = 18.5;   // Reference resistance at 25°C in milli-Ohms (mΩ) for 6S4P pack
  
  // Activation energy parameter (J/mol) / Universal gas constant (R_g = 8.314 J/(mol·K))
  // Empirical low-temp electrolyte diffusion barrier for defense aviation cells
  const Ea_over_R = 2850; 

  // Arrhenius temperature scaling
  let tempFactor = Math.exp(Ea_over_R * (1 / T_Kelvin - 1 / T_ref));
  
  // Additional non-linear cryogenic inflection below -20°C due to electrolyte freezing onset
  if (safeTemp < -20.0) {
    const cryoDelta = Math.abs(safeTemp - (-20.0));
    tempFactor += 0.08 * Math.pow(cryoDelta, 1.35);
  }

  // Aging degradation factor: cycle wear increases bulk and film resistance
  const cycleAgingFactor = 1.0 + (safeCycleCount * 0.00035);
  const healthFactor = 1.0 + ((100 - safeSoh) * 0.015);

  const totalResistanceMOhm = R_ref * tempFactor * cycleAgingFactor * healthFactor;
  return Number(totalResistanceMOhm.toFixed(2));
}

/**
 * Calculates effective usable capacity at low temperature.
 * At -35°C without heating, sluggish kinetics freeze available capacity by 35-50%.
 */
export function calculateAvailableCapacity(
  nominalCapacityAh: number,
  tempC: number,
  cRate: number = 1.0,
  sohPct: number = 98.0
): number {
  const safeNominal = Number.isFinite(nominalCapacityAh) && nominalCapacityAh > 0 ? nominalCapacityAh : 20.0;
  const safeTemp = Number.isFinite(tempC) ? tempC : -35.0;
  const safeCRate = Number.isFinite(cRate) ? Math.max(0, cRate) : 1.0;
  const safeSoh = Number.isFinite(sohPct) ? Math.max(10, Math.min(100, sohPct)) : 98.0;

  const sohFactor = safeSoh / 100.0;
  
  // Temperature derating factor
  let tempDerate = 1.0;
  if (safeTemp >= 20) {
    tempDerate = 1.0;
  } else if (safeTemp >= 0) {
    tempDerate = 0.95 - (20 - safeTemp) * 0.005; // 95% down to 85%
  } else if (safeTemp >= -20) {
    tempDerate = 0.85 - Math.abs(safeTemp) * 0.012; // 85% down to 61%
  } else {
    // -20°C down to -40°C
    const severeDelta = Math.abs(safeTemp) - 20;
    tempDerate = 0.61 - (severeDelta * 0.016); // Down to ~37% at -35°C
  }

  // C-rate penalty (higher discharge current in cold causes earlier voltage cut-off)
  const cRatePenalty = 1.0 - Math.max(0, (safeCRate - 0.5) * 0.05 * (safeTemp < 0 ? 1.8 : 0.5));
  const effectiveCapacity = safeNominal * sohFactor * Math.max(0.25, tempDerate * cRatePenalty);
  return Number(effectiveCapacity.toFixed(2));
}

/**
 * Heat generation rate: Joule heating (I²R) + reversible entropic heat
 * Q_gen = I² * R_int + I * T * (dE/dT)
 */
export function calculateHeatGenerationW(
  currentA: number,
  resistanceMOhm: number,
  tempC: number
): number {
  const safeCurrent = Number.isFinite(currentA) ? Math.max(0, currentA) : 18.0;
  const safeR = Number.isFinite(resistanceMOhm) ? Math.max(0.1, resistanceMOhm) : 50.0;
  const safeTemp = Number.isFinite(tempC) ? tempC : -35.0;

  const R_Ohms = safeR / 1000.0;
  const jouleHeatW = Math.pow(safeCurrent, 2) * R_Ohms;
  
  // Entropic coefficient dE/dT for typical Li-ion ~ -0.25 mV/K
  const T_K = Math.max(150.0, safeTemp + 273.15);
  const entropicHeatW = safeCurrent * T_K * (-0.00025); 
  
  return Math.max(0, jouleHeatW + entropicHeatW);
}

/**
 * Heat dissipation: Conduction and convection through pack insulation
 * Q_loss = (T_batt - T_amb) / R_th
 */
export function calculateHeatLossW(
  batteryTempC: number,
  ambientTempC: number,
  thermalResistanceK_W: number,
  windSpeedMs: number = 8.0,
  pressureMmhg: number = 510
): number {
  const safeBattT = Number.isFinite(batteryTempC) ? batteryTempC : -35.0;
  const safeAmbT = Number.isFinite(ambientTempC) ? ambientTempC : -35.0;
  const safeRth = Math.max(0.1, Number.isFinite(thermalResistanceK_W) ? thermalResistanceK_W : 1.85);

  const deltaT = safeBattT - safeAmbT;
  if (deltaT <= 0) return 0; // ambient is warmer than battery

  const pressureFactor = (Number.isFinite(pressureMmhg) && pressureMmhg > 0 ? pressureMmhg : 510) / 760.0;
  const safeWind = Number.isFinite(windSpeedMs) ? Math.max(0, windSpeedMs) : 8.0;
  const windFactor = 1.0 + (safeWind * 0.035 * pressureFactor);

  const effectiveRth = safeRth / Math.max(0.1, windFactor);
  return deltaT / effectiveRth;
}

/**
 * Single-step thermal trajectory update:
 * C_th * (dT/dt) = Q_gen - Q_loss + Q_heater
 */
export function computeThermalStep(
  currentTempC: number,
  ambientTempC: number,
  currentA: number,
  resistanceMOhm: number,
  heaterActive: boolean,
  heaterPowerW: number,
  specs: BatterySpecs,
  dtSeconds: number,
  env: EnvironmentalConditions
): { nextTempC: number; qGenW: number; qLossW: number; qHeaterW: number; rateCPerMin: number } {
  const safeCurrentT = Number.isFinite(currentTempC) ? currentTempC : -35.0;
  const safeAmbientT = Number.isFinite(ambientTempC) ? ambientTempC : -35.0;
  const safeThermalMass = Math.max(10.0, specs?.thermalMassJ_K || 880.0);
  const safeRth = Math.max(0.1, specs?.thermalResistanceK_W || 1.85);

  const qGenW = calculateHeatGenerationW(currentA, resistanceMOhm, safeCurrentT);
  const qLossW = calculateHeatLossW(
    safeCurrentT,
    safeAmbientT,
    safeRth,
    env?.windSpeedMs ?? 8.0,
    env?.atmosphericPressureMmhg ?? 510
  );

  // LAERS self-heating membrane logic:
  // When active, deliver controlled electric heating to core cells
  const qHeaterW = heaterActive ? (Number.isFinite(heaterPowerW) ? Math.max(0, heaterPowerW) : 0) : 0;

  const netHeatFlowWatts = qGenW - qLossW + qHeaterW; // Joules per second
  const safeDt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
  const deltaTempC = (netHeatFlowWatts * safeDt) / safeThermalMass;
  const nextTempC = safeCurrentT + deltaTempC;
  // Guard against division by zero when dtSeconds === 0
  const rateCPerMin = safeDt > 0 ? (deltaTempC / safeDt) * 60 : (netHeatFlowWatts / safeThermalMass) * 60;

  return {
    nextTempC: Number(nextTempC.toFixed(2)),
    qGenW: Number(qGenW.toFixed(2)),
    qLossW: Number(qLossW.toFixed(2)),
    qHeaterW: Number(qHeaterW.toFixed(2)),
    rateCPerMin: Number(rateCPerMin.toFixed(2)),
  };
}

/**
 * Terminal voltage and voltage sag calculation
 */
export function computeVoltageState(
  socPct: number,
  currentA: number,
  resistanceMOhm: number,
  specs?: BatterySpecs
): { terminalVoltageV: number; ocvV: number; voltageSagV: number; cellMinVoltageV: number } {
  const safeSoc = Number.isFinite(socPct) ? Math.max(0, Math.min(100, socPct)) : 88.0;
  const safeCurrent = Number.isFinite(currentA) ? Math.max(0, currentA) : 18.0;
  const safeR = Number.isFinite(resistanceMOhm) ? Math.max(0.1, resistanceMOhm) : 50.0;

  const ocvV = calculateOCV(safeSoc);
  const R_Ohms = safeR / 1000.0;
  const voltageSagV = safeCurrent * R_Ohms;
  const terminalVoltageV = Math.max(12.0, ocvV - voltageSagV);
  const cellMinVoltageV = terminalVoltageV / 6.0; // 6S configuration

  return {
    terminalVoltageV: Number(terminalVoltageV.toFixed(2)),
    ocvV: Number(ocvV.toFixed(2)),
    voltageSagV: Number(voltageSagV.toFixed(2)),
    cellMinVoltageV: Number(cellMinVoltageV.toFixed(2)),
  };
}

/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 09: Digital Battery Twin State Vector & Mechanical Model
 * 
 * Generates the unified, physical representation of the 6S4P battery pack assembly:
 * - 24 cylindrical/prismatic cells in 6-Series, 4-Parallel topology
 * - Dual-zone thin-film etched-foil heating membrane
 * - Silica aerogel vacuum blanket layer
 * - Case temperature distribution and heat flux
 */

import { DigitalTwinStateVector, BatterySpecs } from './types';

export function computeDigitalTwinState(
  timestampSec: number,
  batteryTempC: number,
  ambientTempC: number,
  voltageV: number,
  currentA: number,
  socPct: number,
  availableCapAh: number,
  rIntMOhm: number,
  thermalStressScore: number,
  heaterPowerW: number,
  heaterEnergyWh: number,
  missionRiskPct: number,
  completionProbabilityPct: number,
  rulCycles: number,
  sohPct: number,
  specs: BatterySpecs
): DigitalTwinStateVector {
  // Generate individual 24-cell temperature profile with realistic thermal gradient:
  // Center cells (Core) run slightly warmer than corner/perimeter cells exposed to aerogel boundary
  const cellTemperaturesC: number[] = [];
  const perimeterGradient = Math.max(0, (batteryTempC - ambientTempC) * 0.08);

  for (let cellIdx = 0; cellIdx < 24; cellIdx++) {
    const row = Math.floor(cellIdx / 4);
    const col = cellIdx % 4;
    const isPerimeter = row === 0 || row === 5 || col === 0 || col === 3;
    const cellT = isPerimeter ? batteryTempC - perimeterGradient : batteryTempC + perimeterGradient * 0.4;
    cellTemperaturesC.push(Number(cellT.toFixed(1)));
  }

  // Dual heating zones:
  // Zone 1: Lower busbar & base plate
  // Zone 2: Upper cell terminal & aerogel perimeter
  const zone1Active = heaterPowerW > 0;
  const zone2Active = heaterPowerW >= specs.membraneHeaterPowerW * 0.5;

  // Outer insulation surface temperature (between T_amb and T_batt depending on aerogel resistance)
  // T_surface = T_amb + (T_batt - T_amb) * (R_skin / R_total)
  const insulationSurfaceTempC = ambientTempC + (batteryTempC - ambientTempC) * 0.12;

  // Heat flux out
  const heatFluxOutW = Math.max(0, (batteryTempC - ambientTempC) / specs.thermalResistanceK_W);

  // 6 series cell voltages with slight thermodynamic dispersion
  const baseCellV = voltageV / 6.0;
  const cellVoltagesV: number[] = [];
  let minV = 999;
  let maxV = -999;
  for (let s = 0; s < 6; s++) {
    // Outer cells S1 and S6 have slightly higher impedance at boundary cold, thus slightly lower terminal voltage under load
    const isEndCell = s === 0 || s === 5;
    const cellV = isEndCell 
      ? baseCellV - 0.008 * (currentA / 20.0) 
      : baseCellV + 0.004 * (currentA / 20.0);
    const roundedV = Number(cellV.toFixed(3));
    cellVoltagesV.push(roundedV);
    if (roundedV < minV) minV = roundedV;
    if (roundedV > maxV) maxV = roundedV;
  }
  const voltageSpreadMv = Number(((maxV - minV) * 1000.0).toFixed(1));

  return {
    timestampSec,
    batteryTempC: Number(batteryTempC.toFixed(1)),
    ambientTempC: Number(ambientTempC.toFixed(1)),
    voltageV: Number(voltageV.toFixed(2)),
    currentA: Number(currentA.toFixed(1)),
    socPct: Number(socPct.toFixed(1)),
    usableCapacityAh: Number(availableCapAh.toFixed(2)),
    internalResistanceMOhm: Number(rIntMOhm.toFixed(1)),
    thermalStressScore,
    heaterPowerW: Number(heaterPowerW.toFixed(1)),
    membraneHeaterPowerW: Number(heaterPowerW.toFixed(1)),
    heaterEnergyWh: Number(heaterEnergyWh.toFixed(2)),
    missionRiskPct,
    completionProbabilityPct,
    rulCycles,
    sohPct,
    cellTemperaturesC,
    cellVoltagesV,
    voltageSpreadMv,
    membraneActiveZones: [zone1Active, zone2Active],
    insulationSurfaceTempC: Number(insulationSurfaceTempC.toFixed(1)),
    heatFluxOutW: Number(heatFluxOutW.toFixed(1)),
  };
}

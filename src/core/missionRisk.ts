/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 07: Mission Risk Engine & Profile Evaluator
 * 
 * Translates low-level electrochemical and thermal states into tactical mission consequences:
 * 
 * - Voltage sag cutoff margin (18.0V BMS emergency low-voltage threshold)
 * - Available usable energy accounting for temperature derating
 * - Subtraction of thermal control membrane heater power
 * - Mission Completion Probability estimation
 * 
 * Demonstration Profiles:
 * - Nyoma High-Altitude Perimeter Surveillance (42 min)
 * - Siachen Glacier Rapid Reconnaissance (28 min)
 * - Khardung La Pass Supply Escort (35 min)
 * - Extreme Cold Hover & Loiter (30 min)
 */

import { MissionProfile, MissionRiskAssessment, BatterySpecs } from './types';

export const DEMO_MISSION_PROFILES: MissionProfile[] = [
  {
    id: 'nyoma_surveillance',
    name: 'Nyoma',
    totalDurationMin: 42,
    nominalAltitudeM: 4180,
    ambientTempC: -35.0,
    description: '4,180m MSL forward airfield border perimeter patrol under extreme sub-zero wind chill (-35°C, 42 min).',
    phases: [
      { phase: 'PRE-FLIGHT COLD SOAK', durationMin: 5, averageCurrentA: 0.8, peakCurrentA: 2.0 },
      { phase: 'HIGH-POWER TAKEOFF', durationMin: 4, averageCurrentA: 38.0, peakCurrentA: 52.0 },
      { phase: 'HIGH-ALTITUDE CRUISE', durationMin: 18, averageCurrentA: 16.0, peakCurrentA: 22.0 },
      { phase: 'HIGH-LOAD SURVEILLANCE', durationMin: 10, averageCurrentA: 26.0, peakCurrentA: 36.0 },
      { phase: 'DESCENT & RECOVERY', durationMin: 5, averageCurrentA: 12.0, peakCurrentA: 18.0 },
    ],
  },
  {
    id: 'chn_recon',
    name: 'CHN',
    totalDurationMin: 28,
    nominalAltitudeM: 5400,
    ambientTempC: -38.0,
    description: '5,400m glaciated terrain reconnaissance sortie in Siachen / CHN sector (-38°C, 28 min).',
    phases: [
      { phase: 'PRE-FLIGHT COLD SOAK', durationMin: 3, averageCurrentA: 0.8, peakCurrentA: 1.5 },
      { phase: 'HIGH-POWER TAKEOFF', durationMin: 4, averageCurrentA: 38.0, peakCurrentA: 50.0 },
      { phase: 'HIGH-ALTITUDE CRUISE', durationMin: 10, averageCurrentA: 16.0, peakCurrentA: 22.0 },
      { phase: 'HIGH-LOAD SURVEILLANCE', durationMin: 6, averageCurrentA: 26.0, peakCurrentA: 34.0 },
      { phase: 'DESCENT & RECOVERY', durationMin: 5, averageCurrentA: 12.0, peakCurrentA: 16.0 },
    ],
  },
  {
    id: 'khardong_loiter',
    name: 'Khardong',
    totalDurationMin: 35,
    nominalAltitudeM: 5359,
    ambientTempC: -32.0,
    description: '5,359m high-pass saddle point hover and relay station-keeping (-32°C, 35 min).',
    phases: [
      { phase: 'PRE-FLIGHT COLD SOAK', durationMin: 4, averageCurrentA: 0.8, peakCurrentA: 2.0 },
      { phase: 'HIGH-POWER TAKEOFF', durationMin: 4, averageCurrentA: 38.0, peakCurrentA: 48.0 },
      { phase: 'HIGH-ALTITUDE CRUISE', durationMin: 14, averageCurrentA: 16.0, peakCurrentA: 22.0 },
      { phase: 'HIGH-LOAD SURVEILLANCE', durationMin: 8, averageCurrentA: 26.0, peakCurrentA: 36.0 },
      { phase: 'DESCENT & RECOVERY', durationMin: 5, averageCurrentA: 12.0, peakCurrentA: 16.0 },
    ],
  },
];

export class MissionRiskEngine {
  public evaluateMission(
    tBattC: number,
    terminalVoltageV: number,
    socPct: number,
    currentA: number,
    availableCapAh: number,
    profile: MissionProfile,
    heaterRuntimeSec: number,
    cumulativeHeaterEnergyWh: number,
    specs: BatterySpecs,
    currentPhase?: string
  ): MissionRiskAssessment {
    // 1. Calculate mission energy requirements
    let totalMissionEnergyWh = 0;
    for (const ph of profile.phases) {
      const hours = ph.durationMin / 60.0;
      totalMissionEnergyWh += ph.averageCurrentA * specs.nominalVoltageV * hours;
    }

    // 2. Usable energy remaining
    const nominalPackEnergyWh = specs.nominalVoltageV * specs.nominalCapacityAh; // ~532.8 Wh
    const grossUsableEnergyWh = (socPct / 100.0) * (availableCapAh / specs.nominalCapacityAh) * nominalPackEnergyWh;

    // 3. Subtract energy consumed by thin-film heating membrane
    // Uses authoritative cumulative energy consumed (monotonically non-decreasing)
    const heaterEnergySpentWh = Math.max(0, cumulativeHeaterEnergyWh);
    const netAvailableEnergyWh = Math.max(0, grossUsableEnergyWh - heaterEnergySpentWh);
    const estimatedEnergyMarginWh = Number((netAvailableEnergyWh - totalMissionEnergyWh).toFixed(1));

    // 4. Voltage Sag Cutoff Risk Assessment
    // Pack cutoff is 18.0V (3.0V/cell)
    let voltageSagRiskLevel: 'SAFE' | 'ELEVATED' | 'CRITICAL_CUTOFF' = 'SAFE';
    if (terminalVoltageV <= specs.lowerVoltageCutoffV + 0.3) {
      voltageSagRiskLevel = 'CRITICAL_CUTOFF';
    } else if (terminalVoltageV <= specs.lowerVoltageCutoffV + 1.2) {
      voltageSagRiskLevel = 'ELEVATED';
    }

    // 5. Thermal Risk Assessment
    let thermalRiskLevel: 'SAFE' | 'COLD_SLUGGISH' | 'SEVERE_FREEZING' = 'SAFE';
    if (tBattC < -25.0) {
      thermalRiskLevel = 'SEVERE_FREEZING';
    } else if (tBattC < -5.0) {
      thermalRiskLevel = 'COLD_SLUGGISH';
    }

    // 6. Aggregate Mission Risk % (0-100)
    let riskPct = 10;
    if (voltageSagRiskLevel === 'CRITICAL_CUTOFF') riskPct += 65;
    else if (voltageSagRiskLevel === 'ELEVATED') riskPct += 35;

    if (thermalRiskLevel === 'SEVERE_FREEZING') riskPct += 40;
    else if (thermalRiskLevel === 'COLD_SLUGGISH') riskPct += 18;

    if (estimatedEnergyMarginWh < 0) {
      riskPct += Math.min(50, Math.abs(estimatedEnergyMarginWh) * 0.8);
    } else if (estimatedEnergyMarginWh < 50) {
      riskPct += 15;
    }

    riskPct = Math.min(99, Math.max(3, Math.round(riskPct)));
    const missionCompletionProbabilityPct = Math.max(1, Math.min(99, 100 - riskPct));

    // Calculate risk reduction gained by LAERS thermal conditioning
    // Baseline unconditioned risk at -35°C is typically ~85%
    const unconditionedBaselineRisk = tBattC < -20 ? 86 : 55;
    const riskReductionGainedPct = Math.max(0, unconditionedBaselineRisk - riskPct);

    const phase = currentPhase ?? profile.phases[0]?.phase ?? 'PRE-FLIGHT COLD SOAK';
    const isPreFlight = phase.toUpperCase().includes('PRE-FLIGHT') || phase.toUpperCase().includes('GROUND') || phase.toUpperCase().includes('SOAK');

    let recommendation = 'Nominal flight envelope. Energy reserves adequate.';
    if (voltageSagRiskLevel === 'CRITICAL_CUTOFF') {
      recommendation = 'ABORT / IMMEDIATE RETURN: Terminal voltage proximate to 18.0V BMS emergency cutoff.';
    } else if (thermalRiskLevel === 'SEVERE_FREEZING') {
      recommendation = isPreFlight
        ? 'PRE-FLIGHT ADVISORY: Sub-zero cold soak. Engage LAERS self-heating membrane before takeoff.'
        : 'THERMAL DEFICIT: Engage full membrane self-heating to avoid cryogenic voltage collapse.';
    } else if (estimatedEnergyMarginWh < 0) {
      recommendation = isPreFlight
        ? 'PRE-FLIGHT ADVISORY: Derated cold-soak capacity. Thermal conditioning will restore full mission reserve.'
        : 'ENERGY DEFICIT: Curtail high-load surveillance phase; reserve energy for descent.';
    }

    return {
      missionRiskPct: riskPct,
      missionCompletionProbabilityPct,
      estimatedEnergyMarginWh,
      voltageSagRiskLevel,
      thermalRiskLevel,
      heaterEnergySpentWh: Number(heaterEnergySpentWh.toFixed(2)),
      heaterRuntimeSec,
      riskReductionGainedPct,
      recommendation,
      phase,
      isPreFlight,
    };
  }
}

export const missionRiskEngine = new MissionRiskEngine();

export type DynamicStatusLevel = 'CRITICAL' | 'WARNING' | 'NORMAL';

/**
 * Calculates operational system status dynamically from snapshot missionRisk and thermal state properties.
 * Avoids any hardcoded statuses and adheres strictly to physical & mission safety boundaries.
 * In pre-flight / ground wait, sub-zero cold soak is classified as WARNING (not CRITICAL) when heating
 * is available and voltage is safely above cutoff, reserving CRITICAL for genuine immediate cutoff/thermal hazards.
 */
export function calculateSystemStatus(
  missionRisk: MissionRiskAssessment | undefined,
  thermalState: {
    tempC?: number;
    heaterRequested?: boolean;
    thermalRiskLevel?: 'SAFE' | 'COLD_SLUGGISH' | 'SEVERE_FREEZING';
    voltageSagRiskLevel?: 'SAFE' | 'ELEVATED' | 'CRITICAL_CUTOFF';
    terminalVoltageV?: number;
    cutoffVoltageV?: number;
    missionRiskPct?: number;
    phase?: string;
    isPreFlight?: boolean;
    heatingAvailable?: boolean;
    socPct?: number;
  }
): DynamicStatusLevel {
  const sagLevel = thermalState.voltageSagRiskLevel ?? missionRisk?.voltageSagRiskLevel ?? 'SAFE';
  const thermalRisk = thermalState.thermalRiskLevel ?? missionRisk?.thermalRiskLevel ?? 'SAFE';
  const tempC = thermalState.tempC ?? -35.0;
  const riskPct = thermalState.missionRiskPct ?? missionRisk?.missionRiskPct ?? 0;
  const vTerm = thermalState.terminalVoltageV ?? 22.2;
  const vCutoff = thermalState.cutoffVoltageV ?? 18.0;

  // Determine if aircraft is in pre-flight / ground wait
  const phaseStr = (thermalState.phase ?? missionRisk?.phase ?? '').toUpperCase();
  const isPreFlight = thermalState.isPreFlight ?? (
    phaseStr === '' ||
    phaseStr.includes('PRE-FLIGHT') ||
    phaseStr.includes('GROUND') ||
    phaseStr.includes('SOAK') ||
    missionRisk?.isPreFlight === true
  );

  // Check heating availability (active or battery SOC > 15% BMS lockout)
  const soc = thermalState.socPct ?? 88.0;
  const heatingAvailable = thermalState.heatingAvailable ?? (thermalState.heaterRequested || soc > 15.0);

  // Safety checks
  const isActualLowVoltageCutoff = sagLevel === 'CRITICAL_CUTOFF' || vTerm <= (vCutoff + 0.3);
  const isThermalRunaway = tempC >= 60.0;
  const isVoltageSafelyAboveCutoff = vTerm > (vCutoff + 0.5) && sagLevel !== 'CRITICAL_CUTOFF';

  // CRITICAL condition: reserved for genuine immediate hazards:
  // 1. Actual low-voltage / cutoff risk (sag level critical or terminal voltage at/below cutoff)
  // 2. Thermal runaway / unsafe high thermal condition (temp >= 60°C)
  // 3. Active in-flight mission failure risk (post-takeoff / in-flight with riskPct >= 90)
  // 4. Pre-flight unrecoverable condition (voltage not safely above cutoff or heating unavailable when risk >= 90)
  if (
    isActualLowVoltageCutoff ||
    isThermalRunaway ||
    (!isPreFlight && riskPct >= 90) ||
    (isPreFlight && (!isVoltageSafelyAboveCutoff || !heatingAvailable) && riskPct >= 90)
  ) {
    return 'CRITICAL';
  }

  // WARNING condition:
  // 1. Pre-flight cold soak where heating is available to recover energy margin
  // 2. Elevated voltage sag risk
  // 3. Sub-zero severe freezing or cold sluggish thermal risk
  // 4. Sub-zero battery temperature (< 0°C)
  // 5. Active heating membrane load
  // 6. Elevated mission risk (> 40% or negative energy margin)
  if (
    (isPreFlight && (riskPct > 40 || (missionRisk?.estimatedEnergyMarginWh ?? 0) < 0)) ||
    sagLevel === 'ELEVATED' ||
    thermalRisk === 'SEVERE_FREEZING' ||
    thermalRisk === 'COLD_SLUGGISH' ||
    tempC < 0 ||
    thermalState.heaterRequested ||
    riskPct > 40
  ) {
    return 'WARNING';
  }

  return 'NORMAL';
}

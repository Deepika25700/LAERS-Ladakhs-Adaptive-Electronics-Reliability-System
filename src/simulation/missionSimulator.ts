/**
 * LAERS — Battery Intelligence Engine
 * Simulation Module: Mission Profile & Dynamic Time-Series Generator
 */

import { 
  BatteryTelemetry, 
  MissionProfileConfig, 
  EnvironmentalConditions, 
  BatterySpecs, 
  ScenarioResult 
} from '../types/battery';
import { 
  computeThermalStep, 
  computeVoltageState, 
  calculateInternalResistance,
  DEFAULT_BATTERY_SPECS,
  UNINSULATED_BASELINE_R_TH
} from '../physics/thermalModel';
import { runPidnnInference } from '../models/pidnnEngine';

export const PRESET_MISSION_PROFILES: MissionProfileConfig[] = [
  {
    id: 'profile_surveillance',
    name: 'High-Altitude Surveillance',
    description: 'Ladakh border sector perimeter patrol with EO/IR sensor payload & burst telemetry uplink.',
    durationMinutes: 35,
    nominalCurrentA: 18.0,
    peakCurrentA: 38.0,
    ambientTempC: -35.0,
    targetAltitudeM: 4800,
    pressureMmhg: 510,
    initialSocPct: 95.0,
    initialCycleCount: 45,
    thermalControlEnabled: true,
  },
  {
    id: 'profile_takeoff_climb',
    name: 'Extreme-Cold Cold-Start & Climb',
    description: 'Rapid ascent from sub-zero tarmac (-35°C) to 5,200m altitude holding max continuous throttle.',
    durationMinutes: 15,
    nominalCurrentA: 34.0,
    peakCurrentA: 52.0,
    ambientTempC: -35.0,
    targetAltitudeM: 5200,
    pressureMmhg: 485,
    initialSocPct: 98.0,
    initialCycleCount: 20,
    thermalControlEnabled: false,
  },
  {
    id: 'profile_hover_station',
    name: 'Station-Keeping Hover at Pass',
    description: 'High wind chill station-keeping at Khardung La / Chang La pass with intermittent gust compensation.',
    durationMinutes: 25,
    nominalCurrentA: 26.0,
    peakCurrentA: 42.0,
    ambientTempC: -30.0,
    targetAltitudeM: 5350,
    pressureMmhg: 475,
    initialSocPct: 88.0,
    initialCycleCount: 60,
    thermalControlEnabled: true,
  },
  {
    id: 'profile_tactical_return',
    name: 'Tactical Return & Descent',
    description: 'Descent glide with intermittent motor braking and emergency reserve monitoring.',
    durationMinutes: 20,
    nominalCurrentA: 14.0,
    peakCurrentA: 24.0,
    ambientTempC: -25.0,
    targetAltitudeM: 3600,
    pressureMmhg: 550,
    initialSocPct: 55.0,
    initialCycleCount: 80,
    thermalControlEnabled: true,
  }
];

export const COLD_TEST_PRESETS = [
  { tempC: 25.0, label: '+25.0°C (Standard Lab Ambient)' },
  { tempC: 0.0, label: '0.0°C (Freezing Point / Mild Chill)' },
  { tempC: -10.0, label: '-10.0°C (Sub-Zero Intermediate)' },
  { tempC: -20.0, label: '-20.0°C (High-Altitude Cold)' },
  { tempC: -30.0, label: '-30.0°C (Severe Himalayan Winter)' },
  { tempC: -35.0, label: '-35.0°C (Extreme Ladakh Qualification Point)' },
];

export const LADAKH_LOCATIONS: EnvironmentalConditions[] = [
  {
    id: 'nyoma',
    name: 'Nyoma Advanced Landing Ground (ALG)',
    altitudeM: 4180,
    altitudeMeters: 4180,
    atmosphericPressureMmhg: 485,
    nominalTempC: -35.0,
    ambientTempC: -35.0,
    solarIrradianceWm2: 850,
    windSpeedKmh: 42,
    windSpeedMs: 11.6,
    relativeHumidityPct: 15,
    isQualificationTestPoint: true,
  },
  {
    id: 'siachen',
    name: 'CHN (Siachen Glacier Sector)',
    altitudeM: 5400,
    altitudeMeters: 5400,
    atmosphericPressureMmhg: 420,
    nominalTempC: -38.0,
    ambientTempC: -38.0,
    solarIrradianceWm2: 920,
    windSpeedKmh: 55,
    windSpeedMs: 15.3,
    relativeHumidityPct: 20,
    isQualificationTestPoint: true,
  },
  {
    id: 'khardungla',
    name: 'Khardong Pass',
    altitudeM: 5359,
    altitudeMeters: 5359,
    atmosphericPressureMmhg: 430,
    nominalTempC: -32.0,
    ambientTempC: -32.0,
    solarIrradianceWm2: 900,
    windSpeedKmh: 48,
    windSpeedMs: 13.3,
    relativeHumidityPct: 18,
    isQualificationTestPoint: false,
  },
  {
    id: 'changla',
    name: 'Chang La Pass / Pangong Axis',
    altitudeM: 5360,
    altitudeMeters: 5360,
    atmosphericPressureMmhg: 430,
    nominalTempC: -34.0,
    ambientTempC: -34.0,
    solarIrradianceWm2: 890,
    windSpeedKmh: 45,
    windSpeedMs: 12.5,
    relativeHumidityPct: 16,
    isQualificationTestPoint: false,
  },
  {
    id: 'leh',
    name: 'Leh Military Station (Base Valley)',
    altitudeM: 3500,
    altitudeMeters: 3500,
    atmosphericPressureMmhg: 525,
    nominalTempC: -20.0,
    ambientTempC: -20.0,
    solarIrradianceWm2: 780,
    windSpeedKmh: 22,
    windSpeedMs: 6.1,
    relativeHumidityPct: 25,
    isQualificationTestPoint: false,
  }
];

/**
 * Runs a dynamic forward simulation over mission duration
 */
export function simulateMissionTrajectory(
  profile: MissionProfileConfig,
  enableLaersThermalControl: boolean,
  ambientTempC: number = profile.ambientTempC,
  initialBattTempC: number = ambientTempC,
  specs: BatterySpecs = DEFAULT_BATTERY_SPECS,
  customDurationMin?: number,
  customLoadCurrentA?: number
): BatteryTelemetry[] {
  const durationMin = customDurationMin ?? profile.durationMinutes;
  const totalSeconds = durationMin * 60;
  const stepSeconds = Math.max(10, Math.floor(totalSeconds / 60)); // ~60 steps for responsive plotting

  const timeline: BatteryTelemetry[] = [];

  let currentBattTempC = initialBattTempC;
  let currentSocPct = profile.initialSocPct;
  const nominalCapacityAh = specs.nominalCapacityAh;
  
  // Pack insulation: if LAERS is active, pack has full aerogel insulation (R_th ~ 1.85)
  // If baseline without LAERS enclosure, use uninsulated baseline R_th ~ 0.42
  const activeSpecs: BatterySpecs = {
    ...specs,
    thermalResistanceK_W: enableLaersThermalControl ? specs.thermalResistanceK_W : UNINSULATED_BASELINE_R_TH,
  };

  const env: EnvironmentalConditions = {
    ambientTempC,
    atmosphericPressureMmhg: profile.pressureMmhg,
    altitudeMeters: profile.targetAltitudeM,
    relativeHumidityPct: 22,
    windSpeedMs: 9.5,
    thermalRadiationW: 12.0,
    isQualificationTestPoint: ambientTempC <= -30,
  };

  const baseCurrentA = customLoadCurrentA ?? profile.nominalCurrentA;

  let heaterActive = false;

  for (let sec = 0; sec <= totalSeconds; sec += stepSeconds) {
    const progress = sec / totalSeconds;
    
    // Dynamic current profile with realistic mission phases (takeoff spike, cruise, gust burst)
    let currentA = baseCurrentA;
    if (progress < 0.12) {
      currentA = profile.peakCurrentA * 0.95; // Initial climb spike
    } else if (progress > 0.45 && progress < 0.60) {
      currentA = profile.peakCurrentA * 0.80; // Mid-mission sensor / wind gust load
    } else if (progress > 0.85) {
      currentA = baseCurrentA * 1.15; // Landing approach
    }

    // Determine current resistance at instantaneous temperature
    const resistanceMOhm = calculateInternalResistance(
      currentBattTempC,
      profile.initialCycleCount,
      96.0
    );

    // LAERS Adaptive Closed-Loop Decision:
    // When enabled, trigger self-heating membrane if core temperature is below 8°C
    // or if predicted voltage sag is dangerously close to 18.0V cutoff
    if (enableLaersThermalControl) {
      if (currentBattTempC < 8.0) {
        heaterActive = true;
      } else if (currentBattTempC > 18.0) {
        heaterActive = false; // Hysteresis turn-off to conserve power
      }
    } else {
      heaterActive = false;
    }

    // Heater consumes small parasitic power from pack or external umbilical (approx 48W ~ 2.1A at 22.2V)
    const totalDischargeCurrentA = currentA + (heaterActive ? (specs.membraneHeaterPowerW / specs.nominalVoltageV) : 0);

    // Voltage state
    const voltState = computeVoltageState(currentSocPct, totalDischargeCurrentA, resistanceMOhm);

    // Thermal trajectory step
    const thermalResult = computeThermalStep(
      currentBattTempC,
      ambientTempC,
      totalDischargeCurrentA,
      resistanceMOhm,
      heaterActive,
      specs.membraneHeaterPowerW,
      activeSpecs,
      stepSeconds,
      env
    );

    // Run PIDNN prediction module for this state
    const pidnnOutput = runPidnnInference(
      currentBattTempC,
      ambientTempC,
      totalDischargeCurrentA,
      currentSocPct,
      profile.initialCycleCount,
      heaterActive,
      durationMin - (sec / 60),
      specs,
      env
    );

    // Update SOC based on Ampere-hour throughput
    const deltaAh = (totalDischargeCurrentA * stepSeconds) / 3600.0;
    const deltaSoc = (deltaAh / nominalCapacityAh) * 100.0;
    currentSocPct = Math.max(0, currentSocPct - deltaSoc);

    // Determine mission phase
    let phase: BatteryTelemetry['phase'] = 'High-Altitude Cruise';
    if (progress < 0.15) phase = 'Takeoff & Climb';
    else if (progress > 0.45 && progress < 0.65) phase = 'High-Load Surveillance';
    else if (progress > 0.85) phase = 'Descent & Return';

    timeline.push({
      timestamp: sec,
      step: Math.round(sec / stepSeconds),
      batteryTempC: currentBattTempC,
      ambientTempC,
      voltageV: voltState.terminalVoltageV,
      currentA: Number(totalDischargeCurrentA.toFixed(1)),
      socPct: Number(currentSocPct.toFixed(1)),
      estimatedCapacityAh: pidnnOutput.estimatedCapacityAh,
      internalResistanceMOhm: resistanceMOhm,
      cycleCount: profile.initialCycleCount,
      stateOfHealthPct: 96.0,
      thermalControlActive: heaterActive,
      heaterPowerAppliedW: heaterActive ? specs.membraneHeaterPowerW : 0,
      voltageSagV: voltState.voltageSagV,
      thermalStressScore: pidnnOutput.thermalStressIndex,
      missionRiskPct: pidnnOutput.failureProbabilityPct,
      missionCompletionProbPct: pidnnOutput.missionCompletionProbabilityPct,
      phase,
      dataClassification: 'SIMULATED',
    });

    // Advance temperature for next step
    currentBattTempC = thermalResult.nextTempC;
  }

  return timeline;
}

/**
 * Generates Baseline vs LAERS Comparison Scenarios side-by-side
 */
export function generateComparisonScenarios(
  profile: MissionProfileConfig,
  tempC: number = -35.0
): { baseline: ScenarioResult; laers: ScenarioResult } {
  // 1. Baseline Run (Thermal control OFF, uninsulated enclosure)
  const baselineTimeline = simulateMissionTrajectory(
    profile,
    false,
    tempC,
    tempC
  );

  // 2. LAERS Run (Thermal control ON, aerogel insulation + thin-film heater)
  const laersTimeline = simulateMissionTrajectory(
    profile,
    true,
    tempC,
    tempC
  );

  const extractMetrics = (id: string, label: string, ctrl: boolean, tl: BatteryTelemetry[]): ScenarioResult => {
    const temps = tl.map(t => t.batteryTempC);
    const sags = tl.map(t => t.voltageSagV);
    const volts = tl.map(t => t.voltageV);
    const risks = tl.map(t => t.missionRiskPct);
    const res = tl.map(t => t.internalResistanceMOhm);
    const lastPoint = tl[tl.length - 1];

    return {
      id,
      label,
      ambientTempC: tempC,
      thermalControl: ctrl,
      minTempC: Math.min(...temps),
      maxVoltageSagV: Math.max(...sags),
      minVoltageV: Math.min(...volts),
      endSocPct: lastPoint?.socPct ?? 0,
      avgResistanceMOhm: Number((res.reduce((a, b) => a + b, 0) / res.length).toFixed(1)),
      peakRiskPct: Math.max(...risks),
      completionProbPct: lastPoint?.missionCompletionProbPct ?? 0,
      timeline: tl,
    };
  };

  return {
    baseline: extractMetrics('baseline', 'Baseline (Unheated, Standard Enclosure)', false, baselineTimeline),
    laers: extractMetrics('laers', 'LAERS Adaptive Thermal System', true, laersTimeline),
  };
}

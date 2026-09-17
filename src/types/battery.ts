/**
 * LAERS — Battery Intelligence Engine
 * Core TypeScript Definitions & Interfaces
 * Physics-Informed Predictive BMS for Extreme-Altitude Reliability
 */

export type DataClassification = 'MEASURED' | 'SIMULATED' | 'PREDICTED' | 'TARGET';

export type SystemStatusLevel = 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export type ThermalControlState = 'OFF' | 'LAERS_ACTIVE' | 'PREHEATING' | 'STANDBY';

export type MissionPhase = 
  | 'Pre-Flight Check'
  | 'Takeoff & Climb'
  | 'High-Altitude Cruise'
  | 'High-Load Surveillance'
  | 'Hover & Observation'
  | 'Descent & Return';

export type ActiveView = 
  | 'overview' 
  | 'simulator' 
  | 'digitaltwin' 
  | 'pidnn' 
  | 'whatif' 
  | 'data' 
  | 'telemetry' 
  | 'architecture' 
  | 'settings';

export interface EnvironmentalConditions {
  id?: string;
  name?: string;
  ambientTempC: number;          // e.g. -35.0 °C
  nominalTempC?: number;         // e.g. -35.0 °C
  atmosphericPressureMmhg: number; // e.g. 510 mmHg (representative Ladakh ~4,500m - 5,000m test condition)
  altitudeMeters?: number;       // e.g. 4500 m
  altitudeM?: number;            // e.g. 4500 m
  relativeHumidityPct: number;   // e.g. 18 %
  windSpeedMs?: number;          // e.g. 12 m/s
  windSpeedKmh?: number;         // e.g. 42 km/h
  solarIrradianceWm2?: number;   // e.g. 850 W/m2
  thermalRadiationW?: number;    // passive cooling / solar flux
  isQualificationTestPoint?: boolean; // Ladakh high-altitude validation marker
}

export interface BatterySpecs {
  chemistry: string;             // e.g. "Low-Temp Li-ion (NMC 811 / Si-C Anode)"
  nominalCapacityAh: number;     // e.g. 24.0 Ah
  nominalVoltageV: number;       // e.g. 22.2 V (6S pack)
  cellConfiguration?: string;    // e.g. "6S4P (24 cells)"
  lowerVoltageCutoffV: number;   // e.g. 18.0 V (3.0 V/cell)
  cutoffVoltageV?: number;       // alias
  upperVoltageCutoffV?: number;  // e.g. 25.2 V (4.2 V/cell)
  maxDischargeContinuousA: number; // e.g. 60 A
  membraneHeaterPowerW: number;  // e.g. 45 W thin-film self-heating element
  thermalMassJ_K: number;        // C_th ~ 850 J/K
  heatCapacityJK?: number;       // alias
  thermalResistanceK_W: number;  // R_th ~ 1.8 K/W with aerogel insulation
  thermalResistanceKW?: number;  // alias
}

export interface BatteryTelemetry {
  timestamp: number;             // epoch ms or simulation second
  step: number;
  batteryTempC: number;
  ambientTempC: number;
  voltageV: number;
  currentA: number;
  socPct: number;
  estimatedCapacityAh: number;
  internalResistanceMOhm: number;
  cycleCount: number;
  stateOfHealthPct: number;
  thermalControlActive: boolean;
  heaterPowerAppliedW: number;
  voltageSagV: number;
  thermalStressScore: number;     // 0 to 100
  missionRiskPct: number;         // 0 to 100
  missionCompletionProbPct: number;// 0 to 100
  phase: MissionPhase;
  dataClassification: DataClassification;
}

export interface PidnnLossComponents {
  totalLoss: number;
  dataLoss: number;           // L_data: MSE against ground truth/telemetry
  thermalPhysicsLoss: number; // L_thermal: C_th dT/dt - (Q_gen - Q_loss + Q_heat)
  degradationLoss: number;    // L_degradation: SEI growth & capacity fade law
  physicsConsistencyLoss: number; // L_physics: Ohm's law V = OCV - I*R, energy conservation
  lambdaThermal: number;      // λ1
  lambdaDegradation: number;  // λ2
  lambdaPhysics: number;      // λ3
}

export interface ExplainabilityFactor {
  name: string;
  contributionPct: number;   // 0 to 100
  severity: 'low' | 'moderate' | 'high' | 'critical';
  detail: string;
  metricValue: string;
}

export interface PredictionOutput {
  estimatedCapacityAh: number;
  capacityRetentionPct: number;
  internalResistanceMOhm: number;
  resistanceGrowthPct: number;
  remainingUsefulLifeCycles: number;
  rulIntervalLowerCycles: number;
  rulIntervalUpperCycles: number;
  rulConfidencePct: number;
  voltageSagRiskPct: number;
  thermalStressIndex: number; // 0-100
  failureProbabilityPct: number;
  missionCompletionProbabilityPct: number;
  estimatedMissionMarginMin: number;
  primaryRiskDriver: string;
  recommendedAction: string;
  explainability: ExplainabilityFactor[];
  engineeringRationale: string;
  physicsConsistencyScore: number; // 0-100
  modelStatus: {
    architecture: string;
    trainingDataStatus: string;
    physicsConstraintsStatus: string;
    experimentalValidationStatus: string;
    validationTarget: string;
  };
}

export interface MissionProfileConfig {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  nominalCurrentA: number;
  peakCurrentA: number;
  ambientTempC: number;
  targetAltitudeM: number;
  pressureMmhg: number;
  initialSocPct: number;
  initialCycleCount: number;
  thermalControlEnabled: boolean;
}

export interface ScenarioResult {
  id: string;
  label: string;
  ambientTempC: number;
  thermalControl: boolean;
  minTempC: number;
  maxVoltageSagV: number;
  minVoltageV: number;
  endSocPct: number;
  avgResistanceMOhm: number;
  peakRiskPct: number;
  completionProbPct: number;
  timeline: BatteryTelemetry[];
}

/**
 * LAERS — Battery Intelligence Engine
 * Core Domain Types & Data Contracts
 * 
 * Physics-Informed Predictive BMS for Extreme-Altitude Reliability
 */

export type ActiveWorkspace = 
  | 'overview' 
  | 'mission_lab' 
  | 'pidnn_lab' 
  | 'digital_twin' 
  | 'whatif_lab' 
  | 'architecture';

export type SensorQuality = 'GOOD' | 'DEGRADED' | 'MISSING';
export type DataProvenance = 
  | 'MEASURED' 
  | 'USER DATA' 
  | 'SIMULATED' 
  | 'SIMULATION'
  | 'ESTIMATED' 
  | 'PHYSICS MODEL' 
  | 'PIDNN PREDICTION' 
  | 'MODEL OUTPUT'
  | 'ASSUMPTION'
  | 'ENGINEERING ASSUMPTION' 
  | 'TARGET' 
  | 'REFERENCE' 
  | 'TBD';
export type ImplementationStatus = 'IMPLEMENTED' | 'SIMULATED' | 'PLANNED';
export type SystemStatusLevel = 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export interface SharedMissionState {
  scenario: string;
  missionTemperature: number;
  ambientTemperature: number;
  missionDuration: number;
  timestamp: number;
  voltage: number;
  current: number;
  soc: number;
  capacity: number;
  internalResistance: number;
  batteryTemperature: number;
  thermalStress: number;
  heaterPower: number;
  heaterEnergy: number;
  predictedVoltageSag: number;
  soh: number;
  rul: number;
  missionRisk: number;
  completionProbability: number;
  energyMargin: number;
  modelPhysicsDivergence: number;
}

export type DiagnosticGrade = 'PASS' | 'WARNING' | 'FAIL';

export interface DiagnosticItem {
  id: string;
  name: string;
  grade: DiagnosticGrade;
  value: string;
  criterion: string;
  reason?: string;
  timestampSec: number;
}

export interface EngineeringDiagnostics {
  overallStatus: DiagnosticGrade;
  sensorValidity: DiagnosticItem;
  modelValidity: DiagnosticItem;
  physicsConsistency: DiagnosticItem;
  thermalSafety: DiagnosticItem;
  voltageCutoffMargin: DiagnosticItem;
  energyReserve: DiagnosticItem;
}

export interface SensorReading<T = number> {
  value: T;
  unit: string;
  timestamp: number;
  source: string;
  quality: SensorQuality;
  provenance: DataProvenance;
}

export interface RawTelemetryFrame {
  timestampSec: number;
  batteryTempC: SensorReading<number>;
  ambientTempC: SensorReading<number>;
  voltageV: SensorReading<number>;
  currentA: SensorReading<number>;
  socPct: SensorReading<number>;
  pressureMmhg: SensorReading<number>;
  humidityPct: SensorReading<number>;
  cycleCount: SensorReading<number>;
  rawHexPayload?: string;
}

export interface StateEstimationResult {
  measured: {
    tempC: number;
    voltageV: number;
    currentA: number;
    socPct: number;
  };
  estimated: {
    tempC: number;
    socPct: number;
    internalResistanceMOhm: number;
    availableCapacityAh: number;
  };
  filterInnovation: {
    tempResidualC: number;
    voltageResidualV: number;
    covarianceTrace: number;
  };
  status: 'FILTER_CONVERGED' | 'INNOVATION_SPIKE' | 'COVARIANCE_HIGH';
}

export interface PhysicsFeatures {
  resistiveHeatGenW: number;        // Q_gen ≈ I²R
  reversibleEntropyHeatW: number;   // Q_entropy = I * T * (dE/dT)
  totalHeatGenW: number;            // Q_gen_total
  thermalLossW: number;             // Q_loss ≈ (T_batt - T_amb) / R_th
  deltaTC: number;                  // T_batt - T_amb
  electricalPowerW: number;         // P = V * I
  lumpedDerivT_C_per_sec: number;   // dT/dt = (Q_gen - Q_loss + Q_heater) / C_th
  effectiveCRate: number;           // I / C_nom
  membraneHeaterInputW: number;     // Q_heater
  aerogelHeatFluxWm2: number;       // Heat flux through insulation
}

export interface PhysicsChecks {
  thermalConsistency: { pass: boolean; value: number; limit: number; message: string };
  socBounds: { pass: boolean; value: number; min: number; max: number };
  capacityMonotonicity: { pass: boolean; ratePerCyclePct: number };
  resistanceTrend: { pass: boolean; dR_dT_sign: 'NEGATIVE' | 'POSITIVE'; message: string };
  energyConsistency: { pass: boolean; balanceResidualW: number };
  overallPass: boolean;
}

export interface PidnnLossComponents {
  lossData: number;
  lossThermal: number;
  lossDegradation: number;
  lossPhysics: number;
  lossTotal: number;
  lambdaThermal: number;
  lambdaDegradation: number;
  lambdaPhysics: number;
}

export interface FeatureAttribution {
  featureName: string;
  weightPct: number;
  impactDirection: 'INCREASES_RISK' | 'REDUCES_RISK' | 'NEUTRAL';
  description: string;
  physicalMechanism?: string;
}

export interface PidnnInferenceOutput {
  modelType: 'Physics-Informed Deep Neural Network (TF.js/Dense-GELU)';
  modelStatus: 'PROTOTYPE (Synthetic Training Data)';
  validationStatus: 'PENDING REAL EXPERIMENTAL DATA';
  inputSequenceWindowSec: number;
  isOutOfDistribution: boolean;
  outOfDistributionMessage?: string;
  modelPhysicsDivergence: {
    divergenceDetected: boolean;
    divergenceDeltaC: number;
    thresholdC: number;
    physicsTempC: number;
    pidnnTempC: number;
  };
  failSafeActive: boolean;
  failSafeReason?: string;
  predictions: {
    predictedCoreTempC: number;
    predictedInternalResistanceMOhm: number;
    predictedCapacityAh: number;
    predictedCapacityFadePct: number;
    voltageSagV: number;
    projectedTerminalVoltageV: number;
    sohPct: number;
    rulCycles: number;
    rulUncertaintyRange: [number, number]; // [lower, upper]
    missionRiskScorePct: number;
  };
  lossComponents: PidnnLossComponents;
  featureAttributions: FeatureAttribution[];
}

export interface DegradationState {
  currentSohPct: number;
  nominalCapacityAh: number;
  currentActualCapacityAh: number;
  capacityLossPct: number;
  resistanceIncreasePct: number;
  projectedRulCycles: number;
  rulUncertainty: {
    lowerBoundCycles: number;
    upperBoundCycles: number;
    confidenceLevelPct: number;
    disclaimer: string;
  };
  thermalStressScore: number;
  lithiumPlatingRiskPct: number;
}

export type MissionPhase = 
  | 'PRE-FLIGHT COLD SOAK'
  | 'HIGH-POWER TAKEOFF'
  | 'HIGH-ALTITUDE CRUISE'
  | 'HIGH-LOAD SURVEILLANCE'
  | 'HOVER & LOITER'
  | 'DESCENT & RECOVERY';

export interface MissionProfile {
  id: string;
  name: string;
  totalDurationMin: number;
  nominalAltitudeM: number;
  targetAltitudeM?: number;
  ambientTempC: number;
  description: string;
  phases: {
    phase: MissionPhase;
    durationMin: number;
    averageCurrentA: number;
    peakCurrentA: number;
  }[];
}

export interface BatteryTelemetry {
  timestamp: number;
  batteryTempC: number;
  ambientTempC: number;
  voltageV: number;
  currentA: number;
  socPct: number;
  internalResistanceMOhm: number;
  voltageSagV: number;
  thermalStressScore: number;
  missionRiskPct: number;
  missionCompletionProbPct: number;
  thermalControlActive: boolean;
  phase: string;
  unheatedVoltageV?: number;
  unheatedTempC?: number;
}

export interface MissionRiskAssessment {
  missionRiskPct: number;
  missionCompletionProbabilityPct: number;
  estimatedEnergyMarginWh: number;
  voltageSagRiskLevel: 'SAFE' | 'ELEVATED' | 'CRITICAL_CUTOFF';
  thermalRiskLevel: 'SAFE' | 'COLD_SLUGGISH' | 'SEVERE_FREEZING';
  heaterEnergySpentWh: number;
  heaterRuntimeSec: number;
  riskReductionGainedPct: number;
  recommendation: string;
  phase?: string;
  isPreFlight?: boolean;
}

export interface ThermalControlDecision {
  heaterRequested: boolean;
  heaterPowerW: number;
  dutyCyclePct: number;
  mode: 'AUTO_PIDNN' | 'FAILSAFE_RULE_BASED' | 'MANUAL_OVERRIDE' | 'OFF';
  decisionRationale: string;
  heaterEnergyBudgetWh: number;
  energySubtractedWh: number;
  netMissionEnergyGainWh: number;
}

export interface DigitalTwinStateVector {
  timestampSec: number;
  batteryTempC: number;
  ambientTempC: number;
  voltageV: number;
  currentA: number;
  socPct: number;
  usableCapacityAh: number;
  internalResistanceMOhm: number;
  thermalStressScore: number;
  heaterPowerW: number;
  membraneHeaterPowerW?: number;
  heaterEnergyWh: number;
  missionRiskPct: number;
  completionProbabilityPct: number;
  rulCycles: number;
  sohPct: number;
  cellTemperaturesC: number[]; // 24 cells for 6S4P
  cellVoltagesV: number[]; // 6 series voltages
  voltageSpreadMv: number;
  membraneActiveZones: [boolean, boolean];
  insulationSurfaceTempC: number;
  heatFluxOutW: number;
}

export interface BatterySpecs {
  chemistry: string;
  nominalCapacityAh: number;
  nominalVoltageV: number;
  cellConfiguration?: string;
  lowerVoltageCutoffV: number;
  cutoffVoltageV?: number;
  upperVoltageCutoffV?: number;
  maxDischargeContinuousA: number;
  membraneHeaterPowerW: number;
  thermalMassJ_K: number;
  heatCapacityJK?: number;
  thermalResistanceK_W: number;
  thermalResistanceKW?: number;
}

export interface EnvironmentalConditions {
  id: string;
  name: string;
  altitudeM: number;
  altitudeMeters?: number;
  atmosphericPressureMmhg: number;
  nominalTempC: number;
  ambientTempC: number;
  solarIrradianceWm2: number;
  windSpeedKmh: number;
  windSpeedMs?: number;
  relativeHumidityPct: number;
  thermalRadiationW?: number;
  isQualificationTestPoint: boolean;
}

export interface TraceStep {
  label: string;
  subValue: string;
  equation?: string;
  provenance: DataProvenance;
}

export interface MetricTrace {
  metricName: string;
  finalValue: string;
  interpretation: string;
  chain: TraceStep[];
}

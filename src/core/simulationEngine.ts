/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 10: Integrated Closed-Loop Simulation Engine
 * 
 * Orchestrates the full bidirectional feedback loop:
 * ENVIRONMENT
 *      ↓
 * SENSOR / TELEMETRY LAYER
 *      ↓
 * STATE ESTIMATION (Measured vs Estimated)
 *      ↓
 * PHYSICS FEATURE ENGINE
 *      ↓
 * PHYSICS CONSTRAINT CHECKS
 *      ↓
 * PIDNN CORE
 *      ↓
 * DEGRADATION + RUL
 *      ↓
 * MISSION RISK ENGINE
 *      ↓
 * THERMAL CONTROL DECISION (closed-loop heater energy budget)
 *      ↓
 * DIGITAL BATTERY TWIN
 *      ↓
 * UPDATED STATE (feedback into next step)
 */

import {
  RawTelemetryFrame,
  StateEstimationResult,
  PhysicsFeatures,
  PhysicsChecks,
  PidnnInferenceOutput,
  DegradationState,
  MissionRiskAssessment,
  ThermalControlDecision,
  DigitalTwinStateVector,
  BatterySpecs,
  EnvironmentalConditions,
  MissionProfile,
  BatteryTelemetry,
  SharedMissionState,
  EngineeringDiagnostics,
  DiagnosticItem,
  DiagnosticGrade
} from './types';

import { sensorLayer } from './sensors';
import { stateEstimator } from './stateEstimation';
import { physicsFeatureEngine } from './physicsFeatures';
import { physicsConstraintEngine } from './physicsChecks';
import { pidnnModelService } from './pidnnModel';
import { degradationEngine } from './degradation';
import { missionRiskEngine, DEMO_MISSION_PROFILES } from './missionRisk';
import { thermalController } from './thermalController';
import { computeDigitalTwinState } from './digitalTwinState';
import { DEFAULT_BATTERY_SPECS, calculateInternalResistance, calculateOCV, computeVoltageState } from '../physics/thermalModel';

export interface CompleteEngineSnapshot {
  sharedMissionState: SharedMissionState;
  diagnostics: EngineeringDiagnostics;
  timestampSec: number;
  environment: EnvironmentalConditions;
  specs: BatterySpecs;
  missionProfile: MissionProfile;
  rawTelemetry: RawTelemetryFrame;
  stateEstimation: StateEstimationResult;
  physicsFeatures: PhysicsFeatures;
  physicsChecks: PhysicsChecks;
  pidnnInference: PidnnInferenceOutput;
  degradation: DegradationState;
  missionRisk: MissionRiskAssessment;
  thermalControl: ThermalControlDecision;
  digitalTwin: DigitalTwinStateVector;
  telemetryHistory: BatteryTelemetry[];
  isPlaying: boolean;
  datasetMode: 'SIMULATION' | 'USER DATA' | 'BENCH TEST';
  datasetFilename?: string;
}

export function computeEngineeringDiagnostics(
  raw: RawTelemetryFrame,
  stateEst: StateEstimationResult,
  pidnn: PidnnInferenceOutput,
  checks: PhysicsChecks,
  terminalVoltageV: number,
  energyMarginWh: number,
  timestampSec: number
): EngineeringDiagnostics {
  const isSensorGood = raw.batteryTempC.quality === 'GOOD' && raw.voltageV.quality === 'GOOD';
  const sensorValidity: DiagnosticItem = {
    id: 'sensor_validity',
    name: 'Sensor Array & Filtering',
    grade: isSensorGood ? 'PASS' : raw.batteryTempC.quality === 'DEGRADED' ? 'WARNING' : 'FAIL',
    value: `${raw.batteryTempC.quality} (Innov: ΔV=${stateEst.filterInnovation.voltageResidualV.toFixed(2)}V, ΔT=${stateEst.filterInnovation.tempResidualC.toFixed(2)}°C)`,
    criterion: 'RTD & Hall telemetry within noise bounds, filter converged',
    timestampSec,
  };

  const modelValidity: DiagnosticItem = {
    id: 'model_validity',
    name: 'Neural Model In-Distribution',
    grade: pidnn.isOutOfDistribution ? 'WARNING' : 'PASS',
    value: pidnn.isOutOfDistribution ? 'OUT OF DISTRIBUTION' : 'IN-DISTRIBUTION (Valid)',
    criterion: 'State vector within [-40°C, 25°C], [0, 60A], [18V, 25.2V]',
    reason: pidnn.outOfDistributionMessage,
    timestampSec,
  };

  const divergenceDelta = pidnn.modelPhysicsDivergence.divergenceDeltaC;
  const physicsGrade: DiagnosticGrade = divergenceDelta > 4.5 ? 'FAIL' : divergenceDelta > 2.5 ? 'WARNING' : 'PASS';
  const physicsConsistency: DiagnosticItem = {
    id: 'physics_consistency',
    name: 'PIDNN vs. Lumped Thermal ODE',
    grade: physicsGrade,
    value: `ΔT = ${divergenceDelta.toFixed(2)}°C (Thresh: 4.5°C)`,
    criterion: 'Neural prediction matches lumped ODE C_th*dT/dt energy balance',
    timestampSec,
  };

  const battTemp = stateEst.estimated.tempC;
  const thermalGrade: DiagnosticGrade = battTemp < -32.0 ? 'FAIL' : battTemp < -20.0 ? 'WARNING' : 'PASS';
  const thermalSafety: DiagnosticItem = {
    id: 'thermal_safety',
    name: 'Core Thermal Boundary',
    grade: thermalGrade,
    value: `${battTemp.toFixed(1)}°C`,
    criterion: 'Operate above electrolyte crystallization onset threshold (-20°C)',
    timestampSec,
  };

  const voltMargin = terminalVoltageV - 18.0;
  const voltGrade: DiagnosticGrade = voltMargin < 0.5 ? 'FAIL' : voltMargin < 1.5 ? 'WARNING' : 'PASS';
  const voltageCutoffMargin: DiagnosticItem = {
    id: 'voltage_margin',
    name: 'Terminal Voltage Cutoff Margin',
    grade: voltGrade,
    value: `${terminalVoltageV.toFixed(2)}V (Margin: +${voltMargin.toFixed(2)}V)`,
    criterion: 'Pack terminal voltage > 18.0V (3.0V/cell critical cutoff)',
    timestampSec,
  };

  const energyGrade: DiagnosticGrade = energyMarginWh < 10.0 ? 'FAIL' : energyMarginWh < 25.0 ? 'WARNING' : 'PASS';
  const energyReserve: DiagnosticItem = {
    id: 'energy_reserve',
    name: 'Usable Energy Flight Margin',
    grade: energyGrade,
    value: `${energyMarginWh.toFixed(1)} Wh reserve`,
    criterion: 'Reserve energy margin >= 25 Wh for recovery loiter & landing',
    timestampSec,
  };

  const allGrades = [
    sensorValidity.grade,
    modelValidity.grade,
    physicsConsistency.grade,
    thermalSafety.grade,
    voltageCutoffMargin.grade,
    energyReserve.grade,
  ];
  const overallStatus: DiagnosticGrade = allGrades.includes('FAIL')
    ? 'FAIL'
    : allGrades.includes('WARNING')
    ? 'WARNING'
    : 'PASS';

  return {
    overallStatus,
    sensorValidity,
    modelValidity,
    physicsConsistency,
    thermalSafety,
    voltageCutoffMargin,
    energyReserve,
  };
}

export class SimulationEngine {
  private timestampSec: number = 0;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private listeners: ((snapshot: CompleteEngineSnapshot) => void)[] = [];
  private datasetMode: 'SIMULATION' | 'USER DATA' | 'BENCH TEST' = 'SIMULATION';
  private datasetFilename?: string;

  // Ground Truth State variables
  private trueCoreTempC: number = -35.0;
  private trueSocPct: number = 88.0;
  private trueCycleCount: number = 55;
  private manualThermalOverride: boolean | undefined = undefined;
  private lastHeaterRequested: boolean = false;

  // Environment & Specs
  private env: EnvironmentalConditions = {
    id: 'nyoma',
    name: 'Nyoma Advanced Landing Ground (ALG)',
    altitudeM: 4180,
    altitudeMeters: 4180,
    atmosphericPressureMmhg: 485,
    nominalTempC: -35.0,
    ambientTempC: -35.0,
    solarIrradianceWm2: 850,
    windSpeedKmh: 42,
    relativeHumidityPct: 15,
    isQualificationTestPoint: true,
  };
  private specs: BatterySpecs = { ...DEFAULT_BATTERY_SPECS };
  private activeProfile: MissionProfile = DEMO_MISSION_PROFILES[0];

  // Telemetry History for timeline plots
  private history: BatteryTelemetry[] = [];
  private latestSnapshot: CompleteEngineSnapshot | null = null;

  constructor() {
    this.resetState(-35.0, 88.0);
  }

  public subscribe(cb: (snapshot: CompleteEngineSnapshot) => void) {
    this.listeners.push(cb);
    cb(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach(cb => cb(snap));
  }

  public setEnvironment(env: EnvironmentalConditions) {
    this.env = env;
    this.step(0);
  }

  public setSpecs(specs: BatterySpecs) {
    this.specs = specs;
    this.step(0);
  }

  public setMissionProfile(profile: MissionProfile) {
    this.activeProfile = profile;
    this.env = {
      ...this.env,
      name: profile.name,
      ambientTempC: profile.ambientTempC,
      nominalTempC: profile.ambientTempC,
      altitudeM: profile.nominalAltitudeM,
    };
    this.resetState(profile.ambientTempC, 88.0);
  }

  public setAmbientTemperature(tempC: number) {
    this.env = {
      ...this.env,
      ambientTempC: tempC,
      nominalTempC: tempC,
    };
    this.step(0);
  }

  public setThermalOverride(override: boolean | undefined) {
    this.manualThermalOverride = override;
    this.step(1); // Immediate reaction
  }

  public resetState(initialTempC: number = -35.0, initialSocPct: number = 88.0) {
    this.timestampSec = 0;
    this.trueCoreTempC = initialTempC;
    this.trueSocPct = initialSocPct;
    this.manualThermalOverride = undefined;
    this.lastHeaterRequested = false;
    this.history = [];
    thermalController.reset();
    physicsConstraintEngine.reset();
    stateEstimator.reset(initialTempC, initialSocPct, this.specs);

    // Populate initial step
    this.step(0);
  }

  public startSimulation() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.intervalId = window.setInterval(() => {
      this.step(5); // 5-second simulation step per tick
    }, 1000);
    this.notify();
  }

  public pauseSimulation() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.notify();
  }

  public togglePlayPause() {
    if (this.isPlaying) {
      this.pauseSimulation();
    } else {
      this.startSimulation();
    }
  }

  /**
   * Complete Closed-Loop Step
   */
  public step(dtSec: number) {
    this.timestampSec += dtSec;

    // Determine current mission phase and nominal load current
    const elapsedMin = this.timestampSec / 60.0;
    let accumulatedMin = 0;
    let currentPhase = this.activeProfile.phases[0].phase;
    let targetCurrentA = this.activeProfile.phases[0].averageCurrentA;

    for (const ph of this.activeProfile.phases) {
      accumulatedMin += ph.durationMin;
      if (elapsedMin <= accumulatedMin) {
        currentPhase = ph.phase;
        targetCurrentA = ph.averageCurrentA;
        break;
      }
    }

    // 1. Calculate physical ground truth state
    const groundTruthR = calculateInternalResistance(this.trueCoreTempC, this.trueCycleCount, 96.0);
    const voltState = computeVoltageState(this.trueSocPct, targetCurrentA, groundTruthR, this.specs);

    // 2. Sensor Layer samples noisy telemetry
    const rawFrame = sensorLayer.sampleTelemetry(this.timestampSec, {
      batteryTempC: this.trueCoreTempC,
      ambientTempC: this.env.ambientTempC,
      voltageV: voltState.terminalVoltageV,
      currentA: targetCurrentA,
      socPct: this.trueSocPct,
      pressureMmhg: this.env.atmosphericPressureMmhg,
      humidityPct: this.env.relativeHumidityPct,
      cycleCount: this.trueCycleCount,
    });

    // 3. State Estimation Layer (Estimates vs Measured)
    const prevHeaterActive = this.manualThermalOverride !== undefined 
      ? this.manualThermalOverride 
      : this.lastHeaterRequested;
    const stateEst = stateEstimator.estimateState(rawFrame, dtSec, this.specs, prevHeaterActive);

    // 4. Physics Feature Engine
    const features = physicsFeatureEngine.computeFeatures(
      stateEst.estimated.tempC,
      rawFrame.ambientTempC.value,
      stateEst.measured.voltageV,
      stateEst.measured.currentA,
      stateEst.estimated.socPct,
      stateEst.estimated.internalResistanceMOhm,
      prevHeaterActive,
      this.specs,
      this.env
    );

    // 5. Physics Constraint Engine
    const checks = physicsConstraintEngine.evaluateConstraints(
      stateEst.estimated.tempC,
      stateEst.estimated.socPct,
      stateEst.estimated.internalResistanceMOhm,
      stateEst.estimated.availableCapacityAh,
      features,
      this.history
    );

    // 6. PIDNN Inference Engine
    const pidnnOutput = pidnnModelService.infer(
      stateEst.estimated.tempC,
      rawFrame.ambientTempC.value,
      stateEst.measured.voltageV,
      stateEst.measured.currentA,
      stateEst.estimated.socPct,
      this.trueCycleCount,
      prevHeaterActive,
      this.history,
      this.specs,
      this.env,
      features
    );

    // 7. Degradation & RUL Engine
    const degState = degradationEngine.evaluateDegradation(
      this.trueCycleCount,
      stateEst.estimated.tempC,
      14,
      this.specs
    );

    // 8. Thermal Control Decision Engine (Closed-Loop)
    const thermalDecision = thermalController.decideThermalAction(
      stateEst.estimated.tempC,
      rawFrame.ambientTempC.value,
      stateEst.estimated.socPct,
      stateEst.measured.currentA,
      stateEst.measured.voltageV,
      pidnnOutput,
      this.specs,
      this.manualThermalOverride
    );

    // Explicitly record actual heaterRequested state for subsequent simulation steps
    this.lastHeaterRequested = thermalDecision.heaterRequested;

    // Step thermal controller runtime
    thermalController.stepRuntime(dtSec, thermalDecision.heaterPowerW);

    // 9. Mission Risk Assessment Engine
    const riskAssessment = missionRiskEngine.evaluateMission(
      stateEst.estimated.tempC,
      voltState.terminalVoltageV,
      stateEst.estimated.socPct,
      stateEst.measured.currentA,
      stateEst.estimated.availableCapacityAh,
      this.activeProfile,
      thermalController.getRuntimeSec(),
      thermalController.getEnergyConsumedWh(),
      this.specs,
      currentPhase
    );

    // 10. Digital Battery Twin State Vector
    const twinState = computeDigitalTwinState(
      this.timestampSec,
      stateEst.estimated.tempC,
      rawFrame.ambientTempC.value,
      voltState.terminalVoltageV,
      stateEst.measured.currentA,
      stateEst.estimated.socPct,
      stateEst.estimated.availableCapacityAh,
      stateEst.estimated.internalResistanceMOhm,
      degState.thermalStressScore,
      thermalDecision.heaterPowerW,
      thermalController.getEnergyConsumedWh(),
      riskAssessment.missionRiskPct,
      riskAssessment.missionCompletionProbabilityPct,
      degState.projectedRulCycles,
      degState.currentSohPct,
      this.specs
    );

    // 11. CLOSED-LOOP UPDATE: Propagate thermal and SOC changes to next ground-truth state
    if (dtSec > 0) {
      // Thermal update: dT = dT_dt * dt
      // dT/dt = (Q_gen - Q_loss + Q_heater) / C_th
      const actualQHeater = thermalDecision.heaterPowerW;
      const actualQLoss = (this.trueCoreTempC - this.env.ambientTempC) / this.specs.thermalResistanceK_W;
      const actualQGen = Math.pow(targetCurrentA, 2) * (groundTruthR / 1000.0);
      const actualDerivT = (actualQGen - actualQLoss + actualQHeater) / this.specs.thermalMassJ_K;
      
      this.trueCoreTempC = Math.max(-45.0, Math.min(45.0, this.trueCoreTempC + actualDerivT * dtSec));

      // SOC update: motor current + auxiliary heater current
      const heaterCurrentA = thermalDecision.heaterPowerW / Math.max(18.0, voltState.terminalVoltageV);
      const totalDischargeA = targetCurrentA + heaterCurrentA;
      const dSoc = -(totalDischargeA / (this.specs.nominalCapacityAh * 3600.0)) * 100.0 * dtSec;
      this.trueSocPct = Math.max(0.0, Math.min(100.0, this.trueSocPct + dSoc));
    }

    // Baseline unconditioned internal resistance and voltage sag at ambient temperature
    const unheatedR = calculateInternalResistance(this.env.ambientTempC, this.trueCycleCount, 96.0);
    const unheatedVoltState = computeVoltageState(stateEst.estimated.socPct, targetCurrentA, unheatedR);
    const unheatedVoltageV = Number(unheatedVoltState.terminalVoltageV.toFixed(2));

    // Append history point (max 100 points for memory efficiency)
    const telemetryPoint: BatteryTelemetry = {
      timestamp: this.timestampSec,
      batteryTempC: Number(stateEst.estimated.tempC.toFixed(1)),
      ambientTempC: this.env.ambientTempC,
      voltageV: Number(voltState.terminalVoltageV.toFixed(2)),
      currentA: Number(targetCurrentA.toFixed(1)),
      socPct: Number(stateEst.estimated.socPct.toFixed(1)),
      internalResistanceMOhm: Number(stateEst.estimated.internalResistanceMOhm.toFixed(1)),
      voltageSagV: Number(voltState.voltageSagV.toFixed(2)),
      thermalStressScore: degState.thermalStressScore,
      missionRiskPct: riskAssessment.missionRiskPct,
      missionCompletionProbPct: riskAssessment.missionCompletionProbabilityPct,
      thermalControlActive: thermalDecision.heaterRequested,
      phase: currentPhase,
      unheatedVoltageV,
      unheatedTempC: this.env.ambientTempC,
    };

    this.history.push(telemetryPoint);
    if (this.history.length > 80) {
      this.history.shift();
    }

    const sharedMissionState: SharedMissionState = {
      scenario: this.activeProfile.name,
      missionTemperature: this.activeProfile.ambientTempC,
      ambientTemperature: this.env.ambientTempC,
      missionDuration: this.activeProfile.totalDurationMin,
      timestamp: this.timestampSec,
      voltage: voltState.terminalVoltageV,
      current: targetCurrentA,
      soc: stateEst.estimated.socPct,
      capacity: stateEst.estimated.availableCapacityAh,
      internalResistance: stateEst.estimated.internalResistanceMOhm,
      batteryTemperature: stateEst.estimated.tempC,
      thermalStress: degState.thermalStressScore,
      heaterPower: thermalDecision.heaterPowerW,
      heaterEnergy: thermalController.getEnergyConsumedWh(),
      predictedVoltageSag: voltState.voltageSagV,
      soh: degState.currentSohPct,
      rul: degState.projectedRulCycles,
      missionRisk: riskAssessment.missionRiskPct,
      completionProbability: riskAssessment.missionCompletionProbabilityPct,
      energyMargin: riskAssessment.estimatedEnergyMarginWh,
      modelPhysicsDivergence: pidnnOutput.modelPhysicsDivergence.divergenceDeltaC,
    };

    const diagnostics = computeEngineeringDiagnostics(
      rawFrame,
      stateEst,
      pidnnOutput,
      checks,
      voltState.terminalVoltageV,
      riskAssessment.estimatedEnergyMarginWh,
      this.timestampSec
    );

    this.latestSnapshot = {
      sharedMissionState,
      diagnostics,
      timestampSec: this.timestampSec,
      environment: this.env,
      specs: this.specs,
      missionProfile: this.activeProfile,
      rawTelemetry: rawFrame,
      stateEstimation: stateEst,
      physicsFeatures: features,
      physicsChecks: checks,
      pidnnInference: pidnnOutput,
      degradation: degState,
      missionRisk: riskAssessment,
      thermalControl: thermalDecision,
      digitalTwin: twinState,
      telemetryHistory: [...this.history],
      isPlaying: this.isPlaying,
      datasetMode: this.datasetMode,
      datasetFilename: this.datasetFilename,
    };

    this.notify();
  }

  public getSnapshot(): CompleteEngineSnapshot {
    if (!this.latestSnapshot) {
      this.step(0);
    }
    return {
      ...this.latestSnapshot!,
      isPlaying: this.isPlaying,
      telemetryHistory: [...this.history],
    };
  }

  /**
   * Loads user telemetry rows from CSV and feeds them through the state estimator and physics pipeline
   */
  public loadUserTelemetrySeries(
    points: {
      timestampSec: number;
      tempC: number;
      ambientTempC: number;
      voltageV: number;
      currentA: number;
      socPct: number;
    }[],
    filename: string
  ) {
    if (points.length === 0) return;
    this.pauseSimulation();
    this.datasetMode = 'USER DATA';
    this.datasetFilename = filename;

    // Reset history and seed with the parsed points
    this.history = [];
    const last = points[points.length - 1];
    this.timestampSec = last.timestampSec;
    this.trueCoreTempC = last.tempC;
    this.trueSocPct = last.socPct;
    this.env.ambientTempC = last.ambientTempC;

    // Replay points to build realistic historical window
    points.slice(0, -1).forEach((pt) => {
      this.history.push({
        timestamp: pt.timestampSec,
        batteryTempC: pt.tempC,
        ambientTempC: pt.ambientTempC,
        voltageV: pt.voltageV,
        currentA: pt.currentA,
        socPct: pt.socPct,
        internalResistanceMOhm: calculateInternalResistance(pt.tempC, 50, 96),
        voltageSagV: pt.currentA * (calculateInternalResistance(pt.tempC, 50, 96) / 1000),
        thermalStressScore: pt.tempC < -20 ? 82 : pt.tempC < 0 ? 55 : 20,
        missionRiskPct: pt.tempC < -20 ? 45 : 12,
        missionCompletionProbPct: pt.tempC < -20 ? 68 : 95,
        thermalControlActive: pt.tempC < 0,
        phase: 'USER TELEMETRY REPLAY',
        unheatedVoltageV: Number((pt.voltageV - (pt.tempC < -20 ? 2.8 : 0.8)).toFixed(2)),
        unheatedTempC: pt.ambientTempC,
      });
    });

    this.step(0);
  }

  public resetToSimulation() {
    this.datasetMode = 'SIMULATION';
    this.datasetFilename = undefined;
    this.resetState(-35.0, 88.0);
  }
}

export const simulationEngine = new SimulationEngine();

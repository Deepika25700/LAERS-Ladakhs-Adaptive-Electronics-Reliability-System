/**
 * LAERS — Battery Intelligence Engine
 * Workspace 03: PIDNN Lab (Physics-Informed Deep Neural Network Laboratory)
 * 
 * Engineering workspace for physics-informed predictive inference:
 * 1. Visual Pipeline: Telemetry -> Physics Features -> PIDNN -> Predictions -> Thermal Decision
 * 2. Clear separation: Runtime/Control Outputs vs Diagnostic/Model-Inspection Outputs
 * 3. Left / Center / Right / Bottom architecture:
 *    - LEFT: Pipeline flow & neural model state
 *    - CENTER: Prediction vs physical/reference behavior
 *    - RIGHT: Risk / divergence / controller response
 *    - BOTTOM: Expandable model diagnostics (Loss decomposition, XAI, Hyperparameters)
 */

import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Cpu, 
  Play, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  ArrowRight,
  ArrowDown,
  Activity,
  Zap,
  Thermometer,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { pidnnModelService } from '../../core/pidnnModel';
import { TechTooltip } from '../common/TechTooltip';

interface PidnnEngineViewProps {
  snapshot: CompleteEngineSnapshot;
  onOpenTrace: (metricKey: string) => void;
  onRefreshInference: () => void;
}

export const PidnnEngineView: React.FC<PidnnEngineViewProps> = ({
  snapshot,
  onOpenTrace,
  onRefreshInference,
}) => {
  const { pidnnInference, physicsChecks, sharedMissionState, thermalControl } = snapshot;

  const [isTraining, setIsTraining] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lambdaThermal, setLambdaThermal] = useState(pidnnInference.lossComponents.lambdaThermal);
  const [lambdaDegradation, setLambdaDegradation] = useState(pidnnInference.lossComponents.lambdaDegradation);
  const [lambdaPhysics, setLambdaPhysics] = useState(pidnnInference.lossComponents.lambdaPhysics);

  const handleUpdateLambdas = (lT: number, lD: number, lP: number) => {
    setLambdaThermal(lT);
    setLambdaDegradation(lD);
    setLambdaPhysics(lP);
    pidnnModelService.setLambdas(lT, lD, lP);
    onRefreshInference();
  };

  const handleTrainBatch = async () => {
    setIsTraining(true);
    await pidnnModelService.trainOnPhysicsBatch(10);
    setIsTraining(false);
    onRefreshInference();
  };

  const losses = pidnnInference.lossComponents;
  const preds = pidnnInference.predictions;
  const div = pidnnInference.modelPhysicsDivergence;

  // Reference baselines for visual comparisons
  const rIntBaseline25C = 18.5; // mOhm nominal at +25°C
  const rIntIncreaseRatio = (preds.predictedInternalResistanceMOhm / rIntBaseline25C).toFixed(1);

  const isHeaterActive = thermalControl?.heaterRequested ?? (sharedMissionState?.heaterPower > 0);
  const heaterPowerW = isHeaterActive ? (thermalControl?.heaterPowerW ?? sharedMissionState?.heaterPower ?? 48.0) : 0;

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto text-[#cbd5e1]">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 03</span>
            <span className="text-[#334155]">•</span>
            <TechTooltip term="PIDNN">
              <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase cursor-help hover:text-amber-400">PIDNN LAB</h1>
            </TechTooltip>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Physics-Informed Neural Network diagnostics, 1st-Law ODE residual enforcement & real-time convergence watchdog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TechTooltip term="Physics Divergence">
            <span className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1.5 cursor-help ${
              div.divergenceDetected
                ? 'bg-red-950/60 border-red-500/80 text-red-300'
                : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${div.divergenceDetected ? 'bg-red-500' : 'bg-emerald-500'}`} />
              {div.divergenceDetected ? 'DIVERGENCE (FAIL-SAFE)' : 'CONVERGENT (ΔT ≤ 4.5°C)'}
            </span>
          </TechTooltip>
          <span className="text-[10px] px-2 py-1 rounded bg-[#11141b] border border-[#1e2432] text-amber-300 font-semibold">
            TF.JS DETERMINISTIC RUNTIME
          </span>
        </div>
      </div>

      {/* 2. PIPELINE BANNER: INPUT → PHYSICS → PIDNN → PREDICTION → DECISION */}
      <div className="p-2.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="px-2 py-0.5 rounded bg-[#0b0e14] text-[#cbd5e1] font-bold border border-[#1e2432]">
            01 INPUT
          </span>
          <ArrowRight className="w-3 h-3 text-[#475569]" />
          <span className="px-2 py-0.5 rounded bg-[#0b0e14] text-[#cbd5e1] font-bold border border-[#1e2432]">
            02 PHYSICS
          </span>
          <ArrowRight className="w-3 h-3 text-[#475569]" />
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/40">
            03 PIDNN
          </span>
          <ArrowRight className="w-3 h-3 text-[#475569]" />
          <span className="px-2 py-0.5 rounded bg-[#0b0e14] text-[#cbd5e1] font-bold border border-[#1e2432]">
            04 PREDICTION
          </span>
          <ArrowRight className="w-3 h-3 text-[#475569]" />
          <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-500/40">
            05 DECISION
          </span>
        </div>
        <span className="text-[#64748b] hidden md:inline">
          Lagrangian Physics-Informed Residual Bound: ±4.5°C
        </span>
      </div>

      {/* 3. PRIMARY 3-COLUMN OPERATIONAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: PIDNN PIPELINE & MODEL STATE (3 COLS) */}
        <div className="lg:col-span-3 p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block mb-2">
              PREDICTIVE PIPELINE FLOW
            </span>

            {/* Visual Connected Nodes */}
            <div className="space-y-1.5 text-[11px]">
              {/* Node 1: Telemetry */}
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] mb-0.5">
                  <span className="font-bold text-amber-400">01</span>
                  <span>INPUT BUS</span>
                </div>
                <div className="font-bold text-[#f8fafc]">TELEMETRY STREAM</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">9 normalized features (V, I, T, SOC, dt)</div>
              </div>

              <div className="flex justify-center text-[#64748b]">
                <ArrowDown className="w-3.5 h-3.5 text-[#334155]" />
              </div>

              {/* Node 2: Physics Features */}
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] mb-0.5">
                  <span className="font-bold text-amber-400">02</span>
                  <span>ANALYTICAL</span>
                </div>
                <div className="font-bold text-[#f8fafc]">PHYSICS FEATURES</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">Arrhenius kinetics, dT/dt, aerogel flux</div>
              </div>

              <div className="flex justify-center text-[#64748b]">
                <ArrowDown className="w-3.5 h-3.5 text-[#334155]" />
              </div>

              {/* Node 3: PIDNN Backbone */}
              <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/40">
                <div className="flex items-center justify-between text-[10px] text-amber-400 mb-0.5">
                  <span className="font-bold">03</span>
                  <span>DENSE-GELU</span>
                </div>
                <div className="font-bold text-amber-300">PIDNN BACKBONE</div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">[9] → 32 → 32 → 16 with PDE loss</div>
              </div>

              <div className="flex justify-center text-[#64748b]">
                <ArrowDown className="w-3.5 h-3.5 text-[#334155]" />
              </div>

              {/* Node 4: Output Predictions */}
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] mb-0.5">
                  <span className="font-bold text-emerald-400">04</span>
                  <span>MULTI-HEAD</span>
                </div>
                <div className="font-bold text-[#f8fafc]">RUNTIME PREDICTIONS</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">R_int, V_sag, T_core, Capacity</div>
              </div>

              <div className="flex justify-center text-[#64748b]">
                <ArrowDown className="w-3.5 h-3.5 text-[#334155]" />
              </div>

              {/* Node 5: Closed-Loop Decision */}
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] mb-0.5">
                  <span className="font-bold text-blue-400">05</span>
                  <span>CLOSED-LOOP</span>
                </div>
                <div className="font-bold text-[#f8fafc]">THERMAL DECISION</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">
                  {isHeaterActive ? `Heating Active (${heaterPowerW}W)` : 'Standby Mode'}
                </div>
              </div>
            </div>
          </div>

          {/* Model Health Footnote */}
          <div className="pt-2 border-t border-[#1e2432] text-[10px] text-[#64748b]">
            <div>Loss Total: <strong className="text-amber-400">{losses.lossTotal}</strong></div>
            <div>Inference: <strong className="text-[#f8fafc]">Deterministic Sync</strong></div>
          </div>
        </div>

        {/* CENTER COLUMN: RUNTIME PREDICTIONS VS REFERENCE/PHYSICS (5 COLS) */}
        <div className="lg:col-span-5 p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2">
            <div>
              <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider block">
                PREDICTION VS. PHYSICAL BEHAVIOR
              </span>
              <span className="text-[10px] text-[#64748b]">
                Evaluating electro-thermal predictions against baseline physics
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-bold uppercase">
              Authoritative
            </span>
          </div>

          <div className="space-y-2.5">
            {/* 1. Internal Resistance Comparison */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">
                  INTERNAL RESISTANCE (R_int)
                </span>
                <span className="text-sm font-bold text-amber-400">
                  {preds.predictedInternalResistanceMOhm.toFixed(1)} mΩ
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                <span>25°C Room Baseline: {rIntBaseline25C} mΩ</span>
                <span className="text-amber-300 font-semibold">{rIntIncreaseRatio}x Cryo Increase</span>
              </div>
              {/* Visual Bar */}
              <div className="w-full h-1.5 rounded-full bg-[#1e2432] overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, (preds.predictedInternalResistanceMOhm / 120) * 100)}%` }}
                />
              </div>
            </div>

            {/* 2. Voltage Sag Under Load */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">
                  PROJECTED VOLTAGE SAG (V_sag)
                </span>
                <span className="text-sm font-bold text-red-400">
                  -{preds.voltageSagV.toFixed(2)} V
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                <span>Ohmic Equation: I × R_int</span>
                <span className="text-[#cbd5e1]">{sharedMissionState.current.toFixed(1)}A load</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#1e2432] overflow-hidden">
                <div 
                  className={`h-full rounded-full ${preds.voltageSagV > 2.5 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (preds.voltageSagV / 5.0) * 100)}%` }}
                />
              </div>
            </div>

            {/* 3. Core Temperature vs Lumped ODE */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">
                  CORE TEMPERATURE COMPARISON
                </span>
                <span className="text-sm font-bold text-[#f8fafc]">
                  {preds.predictedCoreTempC.toFixed(1)}°C
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432]">
                  <span className="text-[#64748b] block">T_PIDNN (Neural):</span>
                  <span className="font-bold text-[#f8fafc]">{div.pidnnTempC}°C</span>
                </div>
                <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432]">
                  <span className="text-[#64748b] block">T_physics (ODE):</span>
                  <span className="font-bold text-[#f8fafc]">{div.physicsTempC}°C</span>
                </div>
              </div>
            </div>

            {/* 4. Usable Capacity & Fade */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">
                  USABLE CAPACITY & FADE
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {preds.predictedCapacityAh.toFixed(1)} Ah
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                <span>Cryo Derated from 24.0 Ah nom</span>
                <span>Fade: {preds.predictedCapacityFadePct.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RISK, DIVERGENCE & CONTROLLER RESPONSE (4 COLS) */}
        <div className="lg:col-span-4 p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
          <div className="border-b border-[#1e2432] pb-2">
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider block">
              CONTROLLER & RESIDUAL MONITOR
            </span>
            <span className="text-[10px] text-[#64748b]">
              Watchdog divergence & closed-loop thermal response
            </span>
          </div>

          <div className="space-y-3">
            {/* Divergence Residual Watchdog */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#64748b] font-bold uppercase">RESIDUAL D_T = |T_PIDNN - T_ODE|</span>
                <span className={`font-bold ${div.divergenceDeltaC > 4.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {div.divergenceDeltaC}°C
                </span>
              </div>

              {/* Threshold Gauge */}
              <div className="w-full h-2 rounded-full bg-[#1e2432] overflow-hidden relative">
                <div 
                  className={`h-full rounded-full ${div.divergenceDeltaC > 4.5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (div.divergenceDeltaC / 6.0) * 100)}%` }}
                />
                {/* 4.5°C threshold marker */}
                <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-red-400" title="4.5°C Cutoff Threshold" />
              </div>

              <div className="flex justify-between text-[9px] text-[#64748b]">
                <span>0.0°C (Aligned)</span>
                <span className="text-red-400">4.5°C Max Limit</span>
                <span>6.0°C</span>
              </div>
            </div>

            {/* Fail-Safe State */}
            <div className={`p-3 rounded border text-[11px] ${
              pidnnInference.failSafeActive
                ? 'bg-red-950/40 border-red-500/80 text-red-200'
                : 'bg-[#0b0e14] border-[#1e2432] text-[#94a3b8]'
            }`}>
              <div className="font-bold flex items-center justify-between text-[10px] mb-1">
                <span className="text-[#64748b] uppercase">FAIL-SAFE STATUS</span>
                <span className={pidnnInference.failSafeActive ? 'text-red-400' : 'text-emerald-400'}>
                  {pidnnInference.failSafeActive ? 'ENGAGED' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed">
                {pidnnInference.failSafeActive 
                  ? `Active: ${pidnnInference.failSafeReason}. Deterministic rule-based thermal controller currently engaged.` 
                  : 'Normal operations: Neural inferences within physical consistency bounds.'}
              </p>
            </div>

            {/* Thermal Controller Action */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#64748b] font-bold uppercase">THERMAL CONTROLLER ACTION</span>
                <Flame className={`w-3.5 h-3.5 ${isHeaterActive ? (snapshot.isPlaying ? 'text-amber-400 animate-pulse' : 'text-amber-400') : 'text-[#64748b]'}`} />
              </div>
              <div className="text-base font-bold text-[#f8fafc]">
                {isHeaterActive ? `${heaterPowerW.toFixed(0)}W PREDICTIVE HEATING` : 'STANDBY (0W)'}
              </div>
              <span className="text-[10px] text-amber-400 block">
                {isHeaterActive ? 'Targeting -5°C core to suppress cryo-impedance' : 'Passive insulation maintaining thermal equilibrium'}
              </span>
            </div>

            {/* Composite Mission Risk */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#64748b] font-bold uppercase">PREDICTED MISSION RISK</span>
                <button onClick={() => onOpenTrace('mission_risk')} className="text-amber-400 hover:underline cursor-pointer text-[10px]">
                  TRACE →
                </button>
              </div>
              <div className={`text-base font-bold ${preds.missionRiskScorePct > 60 ? 'text-red-400' : preds.missionRiskScorePct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {preds.missionRiskScorePct}% Composite Risk
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXPANDABLE MODEL DIAGNOSTICS & LOSS DECOMPOSITION (BOTTOM) */}
      <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
              MODEL DIAGNOSTICS, MULTI-TASK LOSS & EXPLAINABILITY (XAI)
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400">
            <span>{showDiagnostics ? 'Collapse' : 'Expand'}</span>
            {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showDiagnostics && (
          <div className="pt-3 border-t border-[#1e2432] space-y-4">
            {/* Loss Breakdown */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#cbd5e1]">
                  MULTI-OBJECTIVE LOSS DECOMPOSITION: L_total = L_data + &lambda;₁L_th + &lambda;₂L_deg + &lambda;₃L_phys
                </span>
                <button
                  onClick={handleTrainBatch}
                  disabled={isTraining}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span>{isTraining ? 'TRAINING 10 EPOCHS...' : 'RUN 10 EPOCHS (TF.JS)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <span className="text-[#64748b] text-[10px] block">DATA LOSS (MSE)</span>
                  <span className="text-base font-bold text-[#f8fafc]">{losses.lossData}</span>
                  <span className="text-[9px] text-[#64748b] block mt-0.5">Terminal voltage fit</span>
                </div>
                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <span className="text-[#64748b] text-[10px] block">THERMAL LOSS</span>
                  <span className="text-base font-bold text-amber-400">{losses.lossThermal}</span>
                  <span className="text-[9px] text-[#64748b] block mt-0.5">1st Law ODE residual</span>
                </div>
                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <span className="text-[#64748b] text-[10px] block">DEGRADATION LOSS</span>
                  <span className="text-base font-bold text-blue-400">{losses.lossDegradation}</span>
                  <span className="text-[9px] text-[#64748b] block mt-0.5">Arrhenius growth</span>
                </div>
                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <span className="text-[#64748b] text-[10px] block">PHYSICS BOUNDARY</span>
                  <span className="text-base font-bold text-emerald-400">{losses.lossPhysics}</span>
                  <span className="text-[9px] text-[#64748b] block mt-0.5">Violation penalties</span>
                </div>
                <div className="p-2.5 rounded bg-[#0b0e14] border border-amber-500/40">
                  <span className="text-[10px] text-amber-400 font-bold block">TOTAL LOSS</span>
                  <span className="text-base font-bold text-amber-300">{losses.lossTotal}</span>
                  <span className="text-[9px] text-amber-400/80 block mt-0.5">Weighted composite</span>
                </div>
              </div>
            </div>

            {/* Feature Attributions (XAI) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#cbd5e1] block">
                EXPLAINABLE AI: NEURAL FEATURE ATTRIBUTION RANKING
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {pidnnInference.featureAttributions.map((attr, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-[#f8fafc]">{attr.featureName}</span>
                      <span className="text-amber-400 font-bold">{attr.weightPct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#1e2432] overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${attr.weightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#64748b] block truncate">{attr.physicalMechanism}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hyperparameter Sliders */}
            <div className="space-y-2 pt-2 border-t border-[#1e2432]">
              <span className="text-[11px] font-bold text-[#cbd5e1] block">
                PHYSICS WEIGHTS (HYPERPARAMETER TUNING)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#94a3b8]">λ_thermal (Lumped ODE):</span>
                    <span className="text-amber-400 font-bold">{lambdaThermal}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={lambdaThermal}
                    onChange={(e) => handleUpdateLambdas(parseFloat(e.target.value), lambdaDegradation, lambdaPhysics)}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#94a3b8]">λ_degradation (Arrhenius):</span>
                    <span className="text-blue-400 font-bold">{lambdaDegradation}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={lambdaDegradation}
                    onChange={(e) => handleUpdateLambdas(lambdaThermal, parseFloat(e.target.value), lambdaPhysics)}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#94a3b8]">λ_physics (Boundaries):</span>
                    <span className="text-emerald-400 font-bold">{lambdaPhysics}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={lambdaPhysics}
                    onChange={(e) => handleUpdateLambdas(lambdaThermal, lambdaDegradation, parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

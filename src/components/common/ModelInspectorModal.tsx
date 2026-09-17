/**
 * LAERS — Battery Intelligence Engine
 * Secondary Tool: Model Inspector Modal
 * 
 * Deep dive into the Physics-Informed Deep Neural Network (PIDNN) architecture,
 * loss functions, training data provenance, hyperparameter lambdas, and diagnostics.
 */

import React, { useState } from 'react';
import { X, BrainCircuit, Play, ShieldAlert, Cpu, Award } from 'lucide-react';
import { PidnnInferenceOutput } from '../../core/types';
import { pidnnModelService } from '../../core/pidnnModel';
import { ProvenanceBadge } from './ProvenanceBadge';

interface ModelInspectorModalProps {
  pidnnOutput: PidnnInferenceOutput;
  isOpen: boolean;
  onClose: () => void;
  onRetrainComplete: () => void;
}

export const ModelInspectorModal: React.FC<ModelInspectorModalProps> = ({
  pidnnOutput,
  isOpen,
  onClose,
  onRetrainComplete,
}) => {
  if (!isOpen) return null;

  const [isTraining, setIsTraining] = useState(false);
  const [lambdaThermal, setLambdaThermal] = useState(pidnnOutput.lossComponents.lambdaThermal);
  const [lambdaDegradation, setLambdaDegradation] = useState(pidnnOutput.lossComponents.lambdaDegradation);
  const [lambdaPhysics, setLambdaPhysics] = useState(pidnnOutput.lossComponents.lambdaPhysics);

  const handleUpdateLambdas = (lT: number, lD: number, lP: number) => {
    setLambdaThermal(lT);
    setLambdaDegradation(lD);
    setLambdaPhysics(lP);
    pidnnModelService.setLambdas(lT, lD, lP);
  };

  const handleTrainEpochs = async () => {
    setIsTraining(true);
    await pidnnModelService.trainOnPhysicsBatch(10);
    setIsTraining(false);
    onRetrainComplete();
  };

  const losses = pidnnOutput.lossComponents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#2d3545] rounded max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222733] bg-[#0c0e12]">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-bold text-[#f8fafc]">
              MODEL INSPECTOR: <span className="text-amber-400">LAERS-PIDNN v1.2</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1f2633] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
          {/* Scientific Status Banner */}
          <div className="p-3 rounded bg-[#161a22] border border-[#262f3e] grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-[#64748b] uppercase block">Model Class</span>
              <span className="text-[#f8fafc] font-semibold">PIDNN (TensorFlow.js)</span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase block">Training Data</span>
              <div className="mt-0.5">
                <ProvenanceBadge provenance="SIMULATED" />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase block">Validation Status</span>
              <span className="text-[#cbd5e1] font-semibold">Pending Chamber Tests</span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase block">Temporal Window</span>
              <span className="text-[#f8fafc] font-semibold">5-step (300 sec history)</span>
            </div>
          </div>

          {/* Model vs Physics Disagreement Diagnostic */}
          <div className={`p-3 rounded border ${
            pidnnOutput.modelPhysicsDivergence.divergenceDetected
              ? 'bg-red-950/40 border-red-500/60 text-red-200'
              : 'bg-[#161b24] border-[#262f3e] text-[#cbd5e1]'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                DIAGNOSTIC: $D_T = |T_{'{PIDNN}'} - T_{'{physics}'}|$
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                pidnnOutput.modelPhysicsDivergence.divergenceDetected
                  ? 'bg-red-900 text-red-200'
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
              }`}>
                {pidnnOutput.modelPhysicsDivergence.divergenceDetected ? 'DIVERGENCE WARNING' : 'CONVERGENT (PASS)'}
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8] mb-2">
              Compares neural predicted core temperature ($T_{'{PIDNN}'}$) against deterministic lumped thermal ODE ($T_{'{physics}'}$, $C_{'{th}'} \frac{'{dT}'}{'{dt}'} = Q_{'{gen}'} - Q_{'{loss}'} + Q_{'{heater}'}$). Threshold: 4.5°C.
            </p>
            <div className="grid grid-cols-3 gap-2 bg-[#0c0e12] p-2 rounded border border-[#1e2430] text-[11px]">
              <div>T_PIDNN: <span className="text-[#f8fafc] font-bold">{pidnnOutput.modelPhysicsDivergence.pidnnTempC}°C</span></div>
              <div>T_physics: <span className="text-[#f8fafc] font-bold">{pidnnOutput.modelPhysicsDivergence.physicsTempC}°C</span></div>
              <div>D_T: <span className="text-amber-400 font-bold">{pidnnOutput.modelPhysicsDivergence.divergenceDeltaC}°C</span></div>
            </div>
            {pidnnOutput.modelPhysicsDivergence.divergenceDetected && (
              <div className="mt-2 text-[10px] text-red-300 bg-red-950/60 p-2 rounded border border-red-500/40">
                <span className="font-bold block mb-0.5">POSSIBLE DIAGNOSTIC CAUSES:</span>
                • Out-of-distribution environmental input envelope<br/>
                • Insufficient low-temperature training data<br/>
                • Sensor calibration drift or physical plant parameter mismatch<br/>
                • Lumped thermal capacitance ODE assumption boundary exceeded
              </div>
            )}
          </div>

          {/* Uncertainty Calibration Status */}
          <div className="p-3 rounded bg-[#161a22] border border-[#262f3e] text-[11px] text-[#94a3b8] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#cbd5e1] block">STATISTICAL UNCERTAINTY STATUS</span>
              <span className="text-[10px] text-amber-400 font-bold">UNCERTAINTY NOT STATISTICALLY CALIBRATED</span>
            </div>
            <div className="text-right text-[10px]">
              <span>RUL Range: {pidnnOutput.predictions.rulUncertaintyRange[0]}–{pidnnOutput.predictions.rulUncertaintyRange[1]} cycles</span>
              <span className="text-[#64748b] block">(Illustrative Bayesian intervals pending chamber test calibration)</span>
            </div>
          </div>

          {/* Out of distribution alert if active */}
          {pidnnOutput.isOutOfDistribution && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-500/60 text-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block">MODEL INPUT OUTSIDE TRAINING ENVELOPE</span>
                <p className="text-[11px] text-amber-200/90">{pidnnOutput.outOfDistributionMessage}</p>
                <span className="text-[10px] text-amber-400 mt-1 block">Fail-safe controller activated: using deterministic physics hysteresis.</span>
              </div>
            </div>
          )}

          {/* Loss Functions & Lambdas */}
          <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#f8fafc]">MULTI-OBJECTIVE LOSS DECOMPOSITION</span>
              <span className="text-[10px] text-[#94a3b8]">
                $L_{'{total}'} = L_{'{data}'} + \lambda_1 L_{'{thermal}'} + \lambda_2 L_{'{degradation}'} + \lambda_3 L_{'{physics}'}$
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[10px] text-[#64748b] block">DATA LOSS</span>
                <span className="text-sm font-bold text-[#f8fafc]">{losses.lossData}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[10px] text-[#64748b] block">THERMAL LOSS</span>
                <span className="text-sm font-bold text-amber-400">{losses.lossThermal}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[10px] text-[#64748b] block">DEGRADATION LOSS</span>
                <span className="text-sm font-bold text-blue-400">{losses.lossDegradation}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[10px] text-[#64748b] block">PHYSICS LOSS</span>
                <span className="text-sm font-bold text-emerald-400">{losses.lossPhysics}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-amber-500/40">
                <span className="text-[10px] text-amber-400 font-bold block">TOTAL LOSS</span>
                <span className="text-sm font-bold text-amber-300">{losses.lossTotal}</span>
              </div>
            </div>

            {/* Hyperparameter Lambdas */}
            <div className="pt-2 border-t border-[#222733] space-y-2">
              <span className="text-[11px] font-semibold text-[#cbd5e1] block">HYPERPARAMETER TUNING (PHYSICS WEIGHTS)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-[#94a3b8]">
                    <span>λ_thermal:</span>
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
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-[#94a3b8]">
                    <span>λ_degradation:</span>
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
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-[#94a3b8]">
                    <span>λ_physics:</span>
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

          {/* Model Limitations & Engineering Assumptions */}
          <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] text-[11px] text-[#94a3b8] space-y-1.5">
            <span className="font-semibold text-[#cbd5e1] block flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              MODEL ASSUMPTIONS & SCIENTIFIC BOUNDARIES
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Lumped thermal capacitance approximation: assumes uniform core temperature inside each parallel cell module.</li>
              <li>Arrhenius temperature relationship parameter Ea / Rg = 2850 K based on literature values for low-temp NMC811.</li>
              <li>Neural layer serves as an augmenting predictor; deterministic safety limits always possess priority override in BMS firmware.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222733] bg-[#0c0e12] flex items-center justify-between">
          <button
            onClick={handleTrainEpochs}
            disabled={isTraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-mono font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-amber-400" />
            <span>{isTraining ? 'TRAINING 10 EPOCHS...' : 'TRAIN 10 EPOCHS (TF.JS)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#232a35] hover:bg-[#2d3545] text-[#e2e8f0] text-xs font-mono transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

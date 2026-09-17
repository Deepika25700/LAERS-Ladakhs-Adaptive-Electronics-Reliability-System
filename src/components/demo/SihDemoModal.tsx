/**
 * LAERS — Battery Intelligence Engine
 * Secondary Tool: Extreme-Cold Evaluation Walkthrough (Jury Demo)
 * 
 * 4-Step Guided Engineering Demonstration:
 * Step 1: Environmental Shock (Nyoma ALG, 4,180m, -35°C)
 * Step 2: Predictive Failure (Unheated baseline voltage sag & cutoff risk)
 * Step 3: LAERS Autonomous Intervention (Aerogel + 48W etched foil heating)
 * Step 4: Mission Success & R&D Test Report
 */

import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Mountain, 
  FileText,
  Play,
  ArrowRight,
  Zap
} from 'lucide-react';
import { ActiveWorkspace } from '../../core/types';

export interface DemoStep {
  step: number;
  title: string;
  subtitle: string;
  targetWorkspace: ActiveWorkspace;
  ambientTempC: number;
  heaterActive: boolean;
  keyPoints: string[];
  takeaway: string;
}

export const EXTREME_COLD_DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'STEP 1: ENVIRONMENTAL SHOCK (-35°C AT 4,180M MSL)',
    subtitle: 'Nyoma Advanced Landing Ground Cold Soak',
    targetWorkspace: 'overview',
    ambientTempC: -35.0,
    heaterActive: false,
    keyPoints: [
      'UAV sits cold-soaked on the ground in Eastern Ladakh at -35°C in hypobaric air (~485 mmHg).',
      'Electrolyte viscosity surges exponentially, causing lithium-ion diffusion kinetics to freeze.',
      'Internal resistance spikes from nominal 18.5 mΩ up to 135 mΩ (7.3x impedance surge).'
    ],
    takeaway: 'Standard BMS units report high battery percentage (~88% SOC) while completely blind to the catastrophic internal impedance surge.'
  },
  {
    step: 2,
    title: 'STEP 2: PREDICTIVE FAILURE (VOLTAGE COLLAPSE RISK)',
    subtitle: 'Ohmic Voltage Sag Under High-Throttle Climb',
    targetWorkspace: 'mission_lab',
    ambientTempC: -35.0,
    heaterActive: false,
    keyPoints: [
      'During high-throttle takeoff (36A climb current), Ohmic law dictates: V_sag = I · R_int = 36A · 0.135Ω = 4.86 Volts!',
      'Terminal bus voltage plummets toward 17.2V, violating the critical 18.0V hardware emergency cutoff in under 4 minutes.',
      'PIDNN neural inference flags an 88% probability of premature mission abort.'
    ],
    takeaway: 'Without proactive heating, the UAV crashes within 2.5 km of launch despite having plenty of chemical charge in the pack.'
  },
  {
    step: 3,
    title: 'STEP 3: LAERS AUTONOMOUS INTERVENTION',
    subtitle: 'Silica Aerogel Thermal Blanket + Dual-Zone Etched Foil Heater',
    targetWorkspace: 'digital_twin',
    ambientTempC: -35.0,
    heaterActive: true,
    keyPoints: [
      'LAERS Closed-Loop Decision Engine engages 48W etched-foil thin-film heater within allowable 18% energy budget.',
      '8mm Silica Aerogel blanket (k = 0.015 W/m·K) traps generated heat, preventing losses into the -35°C airflow.',
      'Core temperature rises above -5°C; internal resistance drops from 135 mΩ down to 32 mΩ.'
    ],
    takeaway: 'Active thermal conditioning restores cell kinetics, reducing voltage sag by 3.4 Volts.'
  },
  {
    step: 4,
    title: 'STEP 4: MISSION SUCCESS & NET ENERGY SURPLUS',
    subtitle: 'Full Reconnaissance Sortie Certified + R&D Test Report',
    targetWorkspace: 'overview',
    ambientTempC: -35.0,
    heaterActive: true,
    keyPoints: [
      'UAV safely completes the full 35-minute reconnaissance patrol over Nyoma sector.',
      'Energy trade-off balance: 24 Wh spent on heating saves 38 Wh of I²R internal dissipation and unlocks 72 Wh of usable capacity.',
      'Net result: +86 Wh surplus flight energy gained by spending heater power.'
    ],
    takeaway: 'LAERS transforms high-altitude extreme-cold battery reliability from a catastrophic failure mode into a deterministic, physics-governed mission success.'
  }
];

interface SihDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onSetAmbientTemp: (tempC: number) => void;
  onSetThermalOverride: (override: boolean) => void;
  onOpenReport: () => void;
}

export const SihDemoModal: React.FC<SihDemoModalProps> = ({
  isOpen,
  onClose,
  onSelectWorkspace,
  onSetAmbientTemp,
  onSetThermalOverride,
  onOpenReport,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = EXTREME_COLD_DEMO_STEPS[currentStepIdx];

  const applyStep = (idx: number) => {
    setCurrentStepIdx(idx);
    const step = EXTREME_COLD_DEMO_STEPS[idx];
    onSelectWorkspace(step.targetWorkspace);
    onSetAmbientTemp(step.ambientTempC);
    onSetThermalOverride(step.heaterActive);
  };

  const handleNext = () => {
    if (currentStepIdx < EXTREME_COLD_DEMO_STEPS.length - 1) {
      applyStep(currentStepIdx + 1);
    } else {
      onOpenReport();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      applyStep(currentStepIdx - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#2d3545] rounded max-w-2xl w-full shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222733] bg-[#0c0e12]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-[#f8fafc]">EXTREME-COLD EVALUATION WALKTHROUGH</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-300 font-bold">
              STEP {currentStep.step} OF 4
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Step Breadcrumb Bar */}
          <div className="grid grid-cols-4 gap-2">
            {EXTREME_COLD_DEMO_STEPS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => applyStep(idx)}
                className={`p-2 rounded border text-center transition cursor-pointer ${
                  idx === currentStepIdx
                    ? 'bg-amber-500/20 border-amber-500 text-[#f8fafc] font-bold'
                    : idx < currentStepIdx
                    ? 'bg-[#161b24] border-emerald-800 text-emerald-400'
                    : 'bg-[#0c0e12] border-[#1e2430] text-[#64748b]'
                }`}
              >
                <div className="text-[10px]">STEP {s.step}</div>
                <div className="text-[9px] truncate mt-0.5">{s.title.split(': ')[1].split(' (')[0]}</div>
              </button>
            ))}
          </div>

          {/* Current Step Description Card */}
          <div className="p-4 rounded bg-[#161b24] border border-[#262f3e] space-y-3">
            <div>
              <h4 className="text-sm font-bold text-amber-400">{currentStep.title}</h4>
              <p className="text-[11px] text-[#94a3b8]">{currentStep.subtitle}</p>
            </div>

            <ul className="space-y-2 text-[11px] text-[#cbd5e1]">
              {currentStep.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0 mt-0.5">▶</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            {/* Takeaway Box */}
            <div className="p-3 rounded bg-[#0c0e12] border border-[#1e2430]">
              <span className="text-[10px] text-amber-400 font-bold block mb-1 uppercase">Engineering Takeaway:</span>
              <p className="text-[11px] text-[#f8fafc] leading-relaxed italic">
                "{currentStep.takeaway}"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222733] bg-[#0c0e12] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#161a22] hover:bg-[#202632] border border-[#2d3545] text-[#cbd5e1] disabled:opacity-30 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>PREVIOUS</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition cursor-pointer shadow-sm"
          >
            <span>{currentStepIdx === EXTREME_COLD_DEMO_STEPS.length - 1 ? 'FINISH & VIEW REPORT' : 'NEXT STEP'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

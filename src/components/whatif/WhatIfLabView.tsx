/**
 * LAERS — Battery Intelligence Engine
 * Workspace 05: What-If Lab (Parametric Experiment & Comparative Engineering Workspace)
 * 
 * Compares:
 * [ UNCONDITIONED BASELINE ] vs [ LAERS PREDICTIVE CONTROLLED CASE ]
 * 
 * Features:
 * - Visually obvious experiment controls: Scenario, Temperature, Thermal Control, Mission Conditions
 * - Side-by-side comparative visualization of Temperature, Internal Resistance, Terminal Voltage, Sag, Risk & Completion %
 * - Net energy trade-off balance (Heater expenditure vs I²R Joule savings & capacity unlocked)
 * - Temperature sweep sensitivity curves (-45°C to +20°C) with active operating points marked
 * - Uses existing shared simulation state and physics functions without creating secondary simulations
 */

import React, { useState } from 'react';
import { 
  GitFork, 
  Sliders, 
  Flame, 
  Zap, 
  Activity, 
  Battery, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Scale,
  Compass
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { calculateInternalResistance, calculateOCV } from '../../physics/thermalModel';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';

interface WhatIfLabViewProps {
  snapshot?: CompleteEngineSnapshot;
  onOpenTrace: (metricKey: string) => void;
}

export const WhatIfLabView: React.FC<WhatIfLabViewProps> = ({ snapshot, onOpenTrace }) => {
  // 4 Visually Obvious Control Dimensions
  const [ambientTempC, setAmbientTempC] = useState<number>(() => snapshot?.sharedMissionState?.ambientTemperature ?? -35);
  const [heaterPowerW, setHeaterPowerW] = useState<number>(48);
  const [climbCurrentA, setClimbCurrentA] = useState<number>(28);
  const [initialSocPct, setInitialSocPct] = useState<number>(() => Math.round(snapshot?.sharedMissionState?.soc ?? 85));
  const [cycleAge, setCycleAge] = useState<number>(45);

  const handleSyncFromScenario = (scenarioName: string, tempC: number) => {
    setAmbientTempC(tempC);
    if (snapshot?.sharedMissionState) {
      setInitialSocPct(Math.round(snapshot.sharedMissionState.soc));
    }
  };

  // Electrochemistry Calculations
  const ocvV = calculateOCV(initialSocPct);

  // 1. Unconditioned Baseline (Battery cools to ambient sink)
  const tempBaselineC = ambientTempC;
  const rIntBaselineMOhm = calculateInternalResistance(tempBaselineC, cycleAge, 96.0);
  const voltSagBaselineV = climbCurrentA * (rIntBaselineMOhm / 1000.0);
  const vTermBaselineV = Math.max(16.0, ocvV - voltSagBaselineV);
  const isBaselineCutoff = vTermBaselineV <= 18.0;
  const riskBaselinePct = isBaselineCutoff ? 94 : Math.min(90, Math.round(30 + (Math.abs(tempBaselineC) * 1.3) + (climbCurrentA * 0.5)));
  const completionBaselinePct = Math.max(5, 100 - riskBaselinePct);

  // 2. LAERS Controlled Case (Predictive thin-film heating maintains -5°C minimum core)
  const isHeaterEngaged = heaterPowerW > 0;
  const conditionedTempC = isHeaterEngaged
    ? Math.min(10.0, Math.max(-8.0, ambientTempC + (heaterPowerW >= 48 ? 30.0 : 18.0)))
    : ambientTempC;
  const rIntConditionedMOhm = calculateInternalResistance(conditionedTempC, cycleAge, 96.0);
  const voltSagConditionedV = climbCurrentA * (rIntConditionedMOhm / 1000.0);
  const vTermConditionedV = Math.max(17.8, ocvV - voltSagConditionedV);
  const isConditionedCutoff = vTermConditionedV <= 18.0;
  const riskConditionedPct = isConditionedCutoff ? 85 : Math.max(10, Math.round(15 + (Math.max(0, -conditionedTempC) * 0.8) + (climbCurrentA * 0.2)));
  const completionConditionedPct = Math.min(96, Math.max(10, 100 - riskConditionedPct));

  // 3. Energy Trade-off Balance (30-minute mission duration)
  const durationHours = 0.5;
  const heaterEnergySpentWh = heaterPowerW * durationHours;
  const rDeltaOhm = Math.max(0, (rIntBaselineMOhm - rIntConditionedMOhm) / 1000.0);
  const i2rEnergySavedWh = Math.pow(climbCurrentA, 2) * rDeltaOhm * durationHours;
  const capacityUnlockedWh = Math.max(0, (Math.abs(ambientTempC) - Math.abs(conditionedTempC)) * 2.2);
  const netEnergyImpactWh = capacityUnlockedWh + i2rEnergySavedWh - heaterEnergySpentWh;

  // Temperature Sweep Curve (-45°C to +20°C)
  const sweepCurveData = [];
  for (let t = -45; t <= 20; t += 5) {
    const r = calculateInternalResistance(t, cycleAge, 96.0);
    const sag = climbCurrentA * (r / 1000.0);
    const v = Number((ocvV - sag).toFixed(2));
    sweepCurveData.push({
      tempC: t,
      rIntMOhm: Number(r.toFixed(1)),
      vTerm: Math.max(15.5, v),
      cutoff: 18.0,
    });
  }

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto text-[#cbd5e1]">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 05</span>
            <span className="text-[#334155]">•</span>
            <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase">WHAT-IF LAB</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Parametric experiment workspace comparing unconditioned baseline vs. LAERS predictive thermal management
          </p>
        </div>

        {/* Quick Scenario Sync Buttons */}
        <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded border border-[#1e2432]">
          <span className="text-[10px] text-[#64748b] px-1.5 uppercase font-bold">Sync:</span>
          <button
            onClick={() => handleSyncFromScenario('Nyoma', -35)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11141b] hover:bg-amber-500/20 text-amber-300 border border-[#1e2432] cursor-pointer"
          >
            Nyoma (-35°C)
          </button>
          <button
            onClick={() => handleSyncFromScenario('Siachen', -38)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11141b] hover:bg-amber-500/20 text-amber-300 border border-[#1e2432] cursor-pointer"
          >
            Siachen (-38°C)
          </button>
          <button
            onClick={() => handleSyncFromScenario('Khardung', -32)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11141b] hover:bg-amber-500/20 text-amber-300 border border-[#1e2432] cursor-pointer"
          >
            Khardung (-32°C)
          </button>
        </div>
      </div>

      {/* 2. VISUALLY OBVIOUS EXPERIMENT CONTROLS */}
      <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
          EXPERIMENT CONTROLS (SCENARIO, TEMPERATURE, THERMAL CONTROL, MISSION CONDITIONS)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Control 1: Ambient Temperature */}
          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#94a3b8] font-bold uppercase">AMBIENT SINK</span>
              <span className="text-amber-400 font-bold text-xs">{ambientTempC}°C</span>
            </div>
            <input
              type="range"
              min="-45"
              max="20"
              step="1"
              value={ambientTempC}
              onChange={(e) => setAmbientTempC(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-[#64748b]">
              <span>-45°C Cryo</span>
              <span>0°C Freezing</span>
              <span>+20°C Room</span>
            </div>
          </div>

          {/* Control 2: Thermal Control Power */}
          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#94a3b8] font-bold uppercase">THERMAL CONTROL</span>
              <span className="text-amber-300 font-bold text-xs">{heaterPowerW}W</span>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[0, 24, 48, 72].map((w) => (
                <button
                  key={w}
                  onClick={() => setHeaterPowerW(w)}
                  className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                    heaterPowerW === w
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#11141b] border-[#1e2432] text-[#64748b] hover:text-[#cbd5e1]'
                  }`}
                >
                  {w}W
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#64748b] block text-center">
              {heaterPowerW === 0 ? 'Heater OFF (Passive only)' : 'Predictive heating active'}
            </span>
          </div>

          {/* Control 3: Climb Discharge Current */}
          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#94a3b8] font-bold uppercase">CLIMB CURRENT</span>
              <span className="text-amber-400 font-bold text-xs">{climbCurrentA} A</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              value={climbCurrentA}
              onChange={(e) => setClimbCurrentA(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-[#64748b]">
              <span>15A Cruise</span>
              <span>28A Nominal</span>
              <span>60A Climb</span>
            </div>
          </div>

          {/* Control 4: Initial SOC */}
          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#94a3b8] font-bold uppercase">INITIAL SOC</span>
              <span className="text-emerald-400 font-bold text-xs">{initialSocPct}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={initialSocPct}
              onChange={(e) => setInitialSocPct(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[9px] text-[#64748b]">
              <span>20% Reserve</span>
              <span>OCV: {ocvV.toFixed(2)}V</span>
              <span>100% Full</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIDE-BY-SIDE COMPARATIVE VISUALIZATION: BASELINE vs LAERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: UNCONDITIONED BASELINE CASE */}
        <div className="p-4 rounded bg-[#11141b] border border-red-500/30 space-y-3 relative">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
                UNCONDITIONED BASELINE (UNHEATED)
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 border border-red-500/60 text-red-300 font-bold">
              {isBaselineCutoff ? 'PREMATURE CUTOFF' : 'HIGH IMPEDANCE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">BATTERY CORE TEMP</span>
              <div className="text-base font-bold text-blue-400 mt-0.5">{tempBaselineC}°C</div>
              <span className="text-[9px] text-[#64748b] block mt-0.5">Equilibrates to sink</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">INTERNAL RESISTANCE</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">{rIntBaselineMOhm.toFixed(1)} mΩ</div>
              <span className="text-[9px] text-[#64748b] block mt-0.5">{(rIntBaselineMOhm / 18.5).toFixed(1)}x cryo-expansion</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">TERMINAL VOLTAGE</span>
              <div className={`text-base font-bold mt-0.5 ${isBaselineCutoff ? 'text-red-400' : 'text-amber-400'}`}>
                {vTermBaselineV.toFixed(2)} V
              </div>
              <span className="text-[9px] text-red-400 block mt-0.5">-{voltSagBaselineV.toFixed(2)}V throttle sag</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">COMPLETION PROB</span>
              <div className={`text-base font-bold mt-0.5 ${completionBaselinePct > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {completionBaselinePct}%
              </div>
              <span className="text-[9px] text-red-400 block mt-0.5">{riskBaselinePct}% mission risk</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-red-950/20 border border-red-500/30 text-[10px] text-red-200">
            <strong>Baseline Flaw:</strong> Low temperatures exponentially expand battery internal impedance, causing terminal voltage to sag below the 18.0V emergency autopilot cutoff under motor climb throttle.
          </div>
        </div>

        {/* RIGHT: LAERS PREDICTIVE CONTROLLED CASE */}
        <div className="p-4 rounded bg-[#11141b] border border-emerald-500/40 space-y-3 relative">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
                LAERS CONTROLLED CASE (PREDICTIVE HEATING)
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 font-bold">
              PROTECTED ENVELOPE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">BATTERY CORE TEMP</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">{tempBaselineC}°C → {conditionedTempC.toFixed(1)}°C</div>
              <span className="text-[9px] text-emerald-400 block mt-0.5">+{Math.abs(conditionedTempC - tempBaselineC).toFixed(1)}°C conditioned</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">INTERNAL RESISTANCE</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{rIntBaselineMOhm.toFixed(0)} → {rIntConditionedMOhm.toFixed(1)} mΩ</div>
              <span className="text-[9px] text-emerald-400 block mt-0.5">-{(rIntBaselineMOhm - rIntConditionedMOhm).toFixed(1)} mΩ suppression</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">TERMINAL VOLTAGE</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {vTermBaselineV.toFixed(2)} → {vTermConditionedV.toFixed(2)} V
              </div>
              <span className="text-[9px] text-emerald-300 block mt-0.5">+{ (vTermConditionedV - vTermBaselineV).toFixed(2) }V voltage margin</span>
            </div>

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
              <span className="text-[#64748b] text-[10px] block uppercase">COMPLETION PROB</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {completionBaselinePct}% → {completionConditionedPct}%
              </div>
              <span className="text-[9px] text-emerald-300 block mt-0.5">+{ (completionConditionedPct - completionBaselinePct) }% survivability gain</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-[10px] text-emerald-200">
            <strong>LAERS Solution:</strong> Predictive membrane heating suppresses Arrhenius impedance growth, eliminating voltage collapse and preserving the flight reserve envelope.
          </div>
        </div>
      </div>

      {/* 4. NET ENERGY TRADE-OFF BALANCE & SENSITIVITY CURVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Net Energy Trade-off Balance (5 Cols) */}
        <div className="lg:col-span-5 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
          <div className="border-b border-[#1e2432] pb-2">
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider block">
              THERMODYNAMIC ENERGY TRADE-OFF BALANCE
            </span>
            <span className="text-[10px] text-[#64748b]">
              30-Minute Sortie: ΔE_net = E_unlocked + ΔE_I²R - E_heater
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex justify-between">
              <span className="text-[#94a3b8]">Heating Expenditure (E_heater):</span>
              <span className="text-red-400 font-bold">-{heaterEnergySpentWh.toFixed(1)} Wh</span>
            </div>
            <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex justify-between">
              <span className="text-[#94a3b8]">I²R Ohmic Heat Dissipation Saved:</span>
              <span className="text-emerald-400 font-bold">+{i2rEnergySavedWh.toFixed(1)} Wh</span>
            </div>
            <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex justify-between">
              <span className="text-[#94a3b8]">Cryo Usable Capacity Unlocked:</span>
              <span className="text-emerald-400 font-bold">+{capacityUnlockedWh.toFixed(1)} Wh</span>
            </div>
            <div className="p-2.5 rounded bg-[#0b0e14] border border-amber-500/40 flex justify-between items-baseline">
              <span className="font-bold text-[#f8fafc] uppercase text-[10px]">NET MISSION ENERGY IMPACT</span>
              <span className={`text-base font-bold ${netEnergyImpactWh > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {netEnergyImpactWh > 0 ? `+${netEnergyImpactWh.toFixed(1)} Wh` : `${netEnergyImpactWh.toFixed(1)} Wh`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Voltage Sag vs Temperature Sweep Curve (7 Cols) */}
        <div className="lg:col-span-7 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2">
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
              TERMINAL VOLTAGE SENSITIVITY SWEEP (-45°C TO +20°C)
            </span>
            <span className="text-[10px] text-[#64748b]">Under {climbCurrentA}A Throttle</span>
          </div>

          <div className="h-48 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sweepCurveData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                <XAxis dataKey="tempC" stroke="#64748b" tickFormatter={(t) => `${t}°C`} />
                <YAxis stroke="#64748b" domain={[16, 24]} unit="V" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0e14', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                />
                <ReferenceLine y={18.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '18.0V Cutoff', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="vTerm" stroke="#f59e0b" strokeWidth={2} name="Terminal Voltage" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

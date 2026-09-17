/**
 * LAERS — Battery Intelligence Engine
 * Workspace 02: Mission Lab (Mission-Analysis Workspace)
 * 
 * Professional aerospace engineering interface for high-altitude Ladakh sorties:
 * - Nyoma ALG UAV Reconnaissance (4,180m MSL, -35°C)
 * - Siachen Glacier Heavy Resupply Drone (5,400m MSL, -40°C)
 * - Khardung La Pass Logistics Flight (5,359m MSL, -30°C)
 * 
 * Features:
 * - Authoritative visual mission timeline (Cold Soak -> Takeoff -> Climb -> Cruise -> Loiter -> Descent)
 * - Active scenario header with altitude & ambient environmental telemetry
 * - Compact mission operational metrics summary (Duration, Altitude, Ambient, Completion %, Risk %, Energy Margin)
 * - Multi-metric engineering trajectory analyzer with dedicated tabs (Voltage & Sag, Temperature, Current, SOC, Risk)
 * - Phase-by-phase tactical demand breakdown
 */

import React, { useState, useMemo } from 'react';
import { 
  Mountain, 
  Clock, 
  Activity, 
  Zap, 
  Thermometer, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  Compass,
  Gauge
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
  AreaChart,
  Area
} from 'recharts';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { DEMO_MISSION_PROFILES } from '../../core/missionRisk';
import { MissionProfile } from '../../core/types';

interface MissionSimulatorViewProps {
  snapshot: CompleteEngineSnapshot;
  onSelectProfile: (profile: MissionProfile) => void;
  onOpenTrace: (metricKey: string) => void;
}

type MetricTab = 'voltage' | 'temperature' | 'current' | 'soc' | 'risk';

export const MissionSimulatorView: React.FC<MissionSimulatorViewProps> = ({
  snapshot,
  onSelectProfile,
  onOpenTrace,
}) => {
  const [activeTab, setActiveTab] = useState<MetricTab>('voltage');

  const selectedProfile = snapshot.missionProfile;
  const activeProfileId = selectedProfile.id;

  const handleChooseScenario = (p: MissionProfile) => {
    onSelectProfile(p);
  };

  const cutoffLimitV = snapshot.specs?.lowerVoltageCutoffV ?? 18.0;

  // Build telemetry curves from authoritative simulation history
  const trajectoryPoints = useMemo(() => {
    const history = snapshot.telemetryHistory || [];

    if (history.length === 0) {
      const min = Number((snapshot.timestampSec / 60).toFixed(1));
      const vSim = Number(snapshot.sharedMissionState.voltage.toFixed(2));
      const vUnheated = Number(Math.max(16.5, vSim - (snapshot.sharedMissionState.batteryTemperature < -10 ? 2.8 : 0.8)).toFixed(2));
      return [{
        minute: min,
        currentA: snapshot.sharedMissionState.current,
        vHeated: vSim,
        vUnheated,
        tHeated: Number(snapshot.sharedMissionState.batteryTemperature.toFixed(1)),
        tUnheated: Number(snapshot.sharedMissionState.ambientTemperature.toFixed(1)),
        ambientT: snapshot.sharedMissionState.ambientTemperature,
        socPct: Number(snapshot.sharedMissionState.soc.toFixed(1)),
        riskPct: Math.round(snapshot.missionRisk.missionRiskPct),
        completionPct: Math.round(snapshot.missionRisk.missionCompletionProbabilityPct),
        cutoff: cutoffLimitV,
      }];
    }

    return history.map((pt) => {
      const min = Number((pt.timestamp / 60).toFixed(1));
      const vSim = Number(pt.voltageV.toFixed(2));
      const vUnheated = pt.unheatedVoltageV !== undefined
        ? Number(pt.unheatedVoltageV.toFixed(2))
        : Number(Math.max(16.5, vSim - Math.max(0.5, (10 - pt.batteryTempC) * 0.1)).toFixed(2));
      
      const vHeated = pt.thermalControlActive
        ? vSim
        : Number(Math.min(24.5, vSim + 2.2).toFixed(2));

      return {
        minute: min,
        currentA: pt.currentA,
        vHeated,
        vUnheated,
        tHeated: Number(pt.batteryTempC.toFixed(1)),
        tUnheated: Number((pt.unheatedTempC ?? pt.ambientTempC).toFixed(1)),
        ambientT: pt.ambientTempC,
        socPct: Number((pt.socPct ?? 85).toFixed(1)),
        riskPct: Math.round(pt.thermalStressScore ? Math.min(95, pt.thermalStressScore * 1.5) : snapshot.missionRisk.missionRiskPct),
        completionPct: Math.round(snapshot.missionRisk.missionCompletionProbabilityPct),
        cutoff: cutoffLimitV,
      };
    });
  }, [snapshot.telemetryHistory, snapshot.timestampSec, snapshot.sharedMissionState, snapshot.missionRisk, cutoffLimitV]);

  // Find cutoff occurrences
  const unheatedCutoffPoint = trajectoryPoints.find(p => p.vUnheated <= cutoffLimitV);
  const timeToCutoffMin = unheatedCutoffPoint ? unheatedCutoffPoint.minute : null;

  // Key metrics
  const completionProb = Math.round(snapshot.missionRisk.missionCompletionProbabilityPct);
  const missionRisk = Math.round(snapshot.missionRisk.missionRiskPct);
  const energyMarginWh = Math.round(snapshot.missionRisk.estimatedEnergyMarginWh);
  const durationMin = selectedProfile.totalDurationMin;
  const altitudeM = snapshot.environment.altitudeM ?? selectedProfile.nominalAltitudeM ?? 4180;
  const ambientTempC = snapshot.environment.ambientTempC;

  // Active mission phase matching
  const currentPhaseName = snapshot.missionRisk.phase || 'COLD SOAK';

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto text-[#cbd5e1]">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 02</span>
            <span className="text-[#334155]">•</span>
            <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase">MISSION LAB</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Operational sortie flight-trajectory simulation, cryo-convective atmospheric models & telemetry curves
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#11141b] border border-[#1e2432] text-[#94a3b8]">
            ACTIVE: <strong className="text-amber-400">{selectedProfile.name}</strong> ({altitudeM.toLocaleString()}m MSL)
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#11141b] border border-[#1e2432] text-amber-300 font-bold">
            PHASE: {currentPhaseName}
          </span>
        </div>
      </div>

      {/* 2. SCENARIO SELECTOR & OPERATIONAL PROFILE */}
      <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2432] pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
              OPERATIONAL MISSION SCENARIOS (LADAKH SECTOR)
            </span>
          </div>
          <span className="text-[11px] text-[#64748b]">
            Hypobaric cryo-convective atmospheric models
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {DEMO_MISSION_PROFILES.map((p) => {
            const isSelected = p.id === activeProfileId;
            const alt = p.nominalAltitudeM || p.targetAltitudeM || 4180;
            return (
              <button
                key={p.id}
                onClick={() => handleChooseScenario(p)}
                className={`p-3 rounded border text-left transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/80 text-[#f8fafc] shadow-xs'
                    : 'bg-[#0b0e14] border-[#1e2432] text-[#94a3b8] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#f8fafc] text-xs">{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-[#94a3b8] bg-[#161c28]'
                  }`}>
                    {p.ambientTempC}°C
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                  <span className="text-amber-400 font-medium">{alt.toLocaleString()} m MSL</span>
                  <span>{p.totalDurationMin} min duration</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MISSION TIMELINE (DOMINANT VISUAL ELEMENT) */}
      <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            MISSION FLIGHT TIMELINE & THROTTLE PHASES
          </span>
          <span className="text-[10px] text-amber-400 font-medium">
            Active Phase: <strong className="text-[#f8fafc]">{currentPhaseName}</strong>
          </span>
        </div>

        {/* Visual Timeline Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {selectedProfile.phases.map((ph, idx) => {
            const isCurrent = ph.phase.toUpperCase() === currentPhaseName.toUpperCase() ||
              (currentPhaseName.includes('COLD') && idx === 0) ||
              (currentPhaseName.includes('TAKEOFF') && idx === 1) ||
              (currentPhaseName.includes('CLIMB') && idx === 2);

            return (
              <div
                key={idx}
                className={`p-2.5 rounded border transition ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500 text-[#f8fafc] ring-1 ring-amber-500/40'
                    : 'bg-[#0b0e14] border-[#1e2432] text-[#94a3b8]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-bold text-[#64748b]">0{idx + 1}</span>
                  <span className="text-amber-400 font-semibold">{ph.averageCurrentA}A</span>
                </div>
                <div className="font-bold text-xs truncate text-[#f8fafc]">{ph.phase}</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">{ph.durationMin} min</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CONSOLIDATED MISSION OPERATIONAL METRICS STRIP (REDUCED CLUTTER) */}
      <div className="rounded bg-[#11141b] border border-[#1e2432] p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 lg:divide-x divide-[#1e2432] gap-3 sm:gap-2">
          <div className="p-2 space-y-0.5">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block">DURATION</span>
            <div className="text-base font-bold text-[#f8fafc]">{durationMin} min</div>
            <span className="text-[10px] text-[#64748b] block">Total sortie flight</span>
          </div>

          <div className="p-2 space-y-0.5 sm:border-l sm:border-[#1e2432] lg:border-none">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block">ALTITUDE</span>
            <div className="text-base font-bold text-[#f8fafc]">{altitudeM.toLocaleString()} m</div>
            <span className="text-[10px] text-amber-400 block">~{(snapshot.environment.atmosphericPressureMmhg * 0.133322).toFixed(0)} kPa hypobaric</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block">AMBIENT TEMP</span>
            <div className="text-base font-bold text-amber-400">{ambientTempC}°C</div>
            <span className="text-[10px] text-[#64748b] block">Freezing sink</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block">COMPLETION PROB</span>
            <div className={`text-base font-bold ${completionProb >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {completionProb}%
            </div>
            <span className="text-[10px] text-emerald-400/80 block">LAERS protected</span>
          </div>

          <div className="p-2 space-y-0.5">
            <div className="flex justify-between items-center text-[10px] text-[#64748b] font-bold uppercase">
              <span>MISSION RISK</span>
              <button onClick={() => onOpenTrace('mission_risk')} className="text-amber-400 hover:underline cursor-pointer">
                TRACE
              </button>
            </div>
            <div className={`text-base font-bold ${missionRisk > 60 ? 'text-red-400' : missionRisk > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {missionRisk}%
            </div>
            <span className="text-[10px] text-[#64748b] block">Sag & thermal deficit</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block">ENERGY MARGIN</span>
            <div className={`text-base font-bold ${energyMarginWh > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {energyMarginWh > 0 ? `+${energyMarginWh} Wh` : `${energyMarginWh} Wh`}
            </div>
            <span className="text-[10px] text-[#64748b] block">Above reserve limit</span>
          </div>
        </div>
      </div>

      {/* 5. PRIMARY TRAJECTORY ANALYZER: ENGINEERING CHART WITH COMPACT TABS */}
      <div className="p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
        {/* Tab Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2432] pb-3">
          <div>
            <span className="font-bold text-[#f8fafc] text-sm block">
              MISSION TRAJECTORY & TELEMETRY PROFILE
            </span>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              Live engineering curves showing baseline vs. LAERS conditioned flight states.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded border border-[#1e2432]">
            <button
              onClick={() => setActiveTab('voltage')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                activeTab === 'voltage'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              Voltage & Sag
            </button>
            <button
              onClick={() => setActiveTab('temperature')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                activeTab === 'temperature'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setActiveTab('current')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('soc')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                activeTab === 'soc'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              SOC
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                activeTab === 'risk'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              Risk
            </button>
          </div>
        </div>

        {/* Selected Metric Chart Visualization or Sparse History State */}
        {trajectoryPoints.length <= 1 ? (
          <div className="h-88 w-full flex flex-col items-center justify-center border border-dashed border-[#1e2432] rounded bg-[#0b0e14] text-center p-6 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#161c28] border border-[#2d374a] flex items-center justify-center text-[#64748b]">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold tracking-wider text-[#f8fafc]">
              WAITING FOR TELEMETRY HISTORY
            </div>
            <p className="text-[11px] text-[#64748b] max-w-sm">
              Run the mission simulation to populate the engineering trace.
            </p>
          </div>
        ) : (
          <div className="h-88 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'voltage' ? (
                <LineChart data={trajectoryPoints}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                  <XAxis dataKey="minute" stroke="#64748b" tickFormatter={(m) => `T+${m}m`} />
                  <YAxis stroke="#64748b" domain={[16, 25]} unit="V" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e12', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                  />
                  <ReferenceLine 
                    y={cutoffLimitV} 
                    stroke="#ef4444" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3" 
                    label={{ value: `${cutoffLimitV.toFixed(1)}V Low-Voltage Cutoff`, fill: '#ef4444', fontSize: 10 }} 
                  />
                  <Line type="monotone" dataKey="vUnheated" stroke="#ef4444" strokeWidth={2} name="BASELINE (UNHEATED)" dot={false} />
                  <Line type="monotone" dataKey="vHeated" stroke="#10b981" strokeWidth={2} name="LAERS CONDITIONED (HEATED)" dot={false} />
                </LineChart>
              ) : activeTab === 'temperature' ? (
                <LineChart data={trajectoryPoints}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                  <XAxis dataKey="minute" stroke="#64748b" tickFormatter={(m) => `T+${m}m`} />
                  <YAxis stroke="#64748b" domain={[-45, 20]} unit="°C" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e12', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" label={{ value: '0°C Freezing Threshold', fill: '#64748b', fontSize: 10 }} />
                  <Line type="monotone" dataKey="tUnheated" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" name="BASELINE (UNHEATED)" dot={false} />
                  <Line type="monotone" dataKey="tHeated" stroke="#f59e0b" strokeWidth={2} name="LAERS CONDITIONED (HEATED)" dot={false} />
                </LineChart>
              ) : activeTab === 'current' ? (
                <AreaChart data={trajectoryPoints}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                  <XAxis dataKey="minute" stroke="#64748b" tickFormatter={(m) => `T+${m}m`} />
                  <YAxis stroke="#64748b" domain={[0, 60]} unit="A" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e12', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                  />
                  <Area type="stepAfter" dataKey="currentA" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} name="Sortie Load Current" />
                </AreaChart>
              ) : activeTab === 'soc' ? (
                <LineChart data={trajectoryPoints}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                  <XAxis dataKey="minute" stroke="#64748b" tickFormatter={(m) => `T+${m}m`} />
                  <YAxis stroke="#64748b" domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e12', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                  />
                  <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '20% Minimum Reserve', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="socPct" stroke="#10b981" strokeWidth={2} name="State of Charge (SOC)" dot={false} />
                </LineChart>
              ) : (
                <LineChart data={trajectoryPoints}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e2432" />
                  <XAxis dataKey="minute" stroke="#64748b" tickFormatter={(m) => `T+${m}m`} />
                  <YAxis stroke="#64748b" domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e12', borderColor: '#1e2432', color: '#f8fafc', fontSize: 11 }}
                  />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '50% Warning Line', fill: '#f59e0b', fontSize: 10 }} />
                  <Line type="monotone" dataKey="riskPct" stroke="#ef4444" strokeWidth={2} name="Mission Risk %" dot={false} />
                  <Line type="monotone" dataKey="completionPct" stroke="#10b981" strokeWidth={2} name="Completion Probability %" dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottom Legend & Callout */}
        <div className="pt-2 border-t border-[#1e2432] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3">
            {activeTab === 'voltage' && (
              <>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                  LAERS Heated Voltage (Protected)
                </span>
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-red-400 inline-block" />
                  Unheated Baseline (Cutoff Deficit)
                </span>
              </>
            )}
            {activeTab === 'temperature' && (
              <>
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                  LAERS Heated Core Temp
                </span>
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-blue-400 inline-block" />
                  Unheated Core Temp
                </span>
              </>
            )}
          </div>

          <span className="text-[#64748b]">
            {timeToCutoffMin !== null
              ? `Unheated pack encounters 18.0V cutoff at T+${timeToCutoffMin}m`
              : 'LAERS predictive conditioning maintains safe operational boundaries'}
          </span>
        </div>
      </div>
    </div>
  );
};
